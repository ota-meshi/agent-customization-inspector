// T194: browser acceptance for the skill comparison (Phase 13 "Skill
// Comparison"). Launches the packaged CLI against a fixture whose one skill
// name resolves two files — the same skill authored for two products — opens
// the comparison from the row's own link, and verifies the complete literal
// comparison screen.
//
// A comparison is a pair within one skill name, between corresponding
// files of that name's copies — the URL names two of the name's copies and
// the compared file inside them (FR-011): the
// entry is a single row-level link with no selection step anywhere, and the
// comparison page's switchers choose which file the pair shows — both sides
// are always that same file — and which copies stand on the two sides. That
// is how three or more files, and three or more copies, are stepped through
// pair by pair.
//
// The claims here can only be made against a rendered page: that the
// complete authored sources are on screen together with their literal
// credential differences unmasked, that an environment reference stays the
// characters that were written, that recognition metadata renders as typed
// rows matched by tool, kind, and declared key, and that leaving the route
// takes the content away again. The editor-failure fallback has no standing
// toggle to drive it from the page; its
// construction-failure path is covered at the composable level.
//
// The visible checkpoint of this milestone: the files sharing one skill name
// can be compared without activation or mutation.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { tabUntilFocused } from './keyboard';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The two literal credentials whose difference the comparison must show. */
const AGENTS_SECRET = 'ghp_E2ECOMPAREAGENTS0000000000000000000000';
const CLAUDE_SECRET = 'ghp_E2ECOMPARECLAUDE0000000000000000000000';
/** An environment reference the product must never resolve. */
const FIXTURE_ENV_REFERENCE = '$ACI_E2E_TOKEN';

/** The one name's first two entry points: the same skill authored for two products. */
const AGENTS_PATH = '.agents/skills/greet/SKILL.md';
const CLAUDE_PATH = '.claude/skills/greet/SKILL.md';
/**
 * A third copy of the same name, spelled to sort after the first two so the
 * row's entry link keeps pairing them; the directory switcher is how this
 * copy enters a comparison.
 */
const THIRD_COPY_PATH = '.claude/skills/greetz/SKILL.md';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-skills-comparison-'));
  await mkdir(join(fixture, '.agents/skills/greet'), { recursive: true });
  await writeFile(
    join(fixture, AGENTS_PATH),
    [
      '---',
      'name: greet',
      `api_key: ${AGENTS_SECRET}`,
      // Authored `7` here and `007` on the Claude side: the two spellings
      // resolve to the same value, so the metadata row must say so while the
      // source diff keeps the literal difference visible.
      'retries: 7',
      `endpoint: "https://example.invalid?token=${FIXTURE_ENV_REFERENCE}"`,
      'only_agents: yes',
      '---',
      '',
      '# Greet',
      '',
      'Shared instruction line.',
      'Agents-only instruction line.',
      '',
    ].join('\n'),
    'utf8',
  );
  // The corresponding companion, present in both copies so the compared-file
  // switcher has a second file to step to.
  await writeFile(
    join(fixture, '.agents/skills/greet/notes.md'),
    '# Notes\n\nGreet notes line (agents).\n',
    'utf8',
  );
  // A companion only this copy ships: the existence difference the switcher
  // must surface and the one-sided view must show.
  await writeFile(
    join(fixture, '.agents/skills/greet/extras.md'),
    '# Extras\n\nExtras line only in agents.\n',
    'utf8',
  );
  // A binary companion: committed and listed, but with no readable source it
  // is not comparison-eligible and must be absent from the switchers
  // (FR-025).
  await writeFile(
    join(fixture, '.agents/skills/greet/logo.png'),
    Buffer.from('PNG\u0000bytes\n', 'latin1'),
  );
  await mkdir(join(fixture, '.claude/skills/greet'), { recursive: true });
  await writeFile(
    join(fixture, CLAUDE_PATH),
    [
      '---',
      'name: greet',
      `api_key: ${CLAUDE_SECRET}`,
      'retries: 007',
      `endpoint: "https://example.invalid?token=${FIXTURE_ENV_REFERENCE}"`,
      '---',
      '',
      '# Greet',
      '',
      'Shared instruction line.',
      'Claude-only instruction line.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, '.claude/skills/greet/notes.md'),
    '# Notes\n\nGreet notes line (claude).\n',
    'utf8',
  );
  // The third copy of the name: it declares `name: greet` too, ships no
  // notes.md, and its directory sorts after the other two, so the row's
  // entry link keeps pairing the first two copies.
  await mkdir(join(fixture, '.claude/skills/greetz'), { recursive: true });
  await writeFile(
    join(fixture, THIRD_COPY_PATH),
    '---\nname: greet\n---\n\n# Greet\n\nGreetz-only instruction line.\n',
    'utf8',
  );
  // A name with one readable file: there is nothing to pair, so its row must
  // offer no comparison entry.
  await mkdir(join(fixture, '.agents/skills/solo'), { recursive: true });
  await writeFile(join(fixture, '.agents/skills/solo/SKILL.md'), '---\nname: solo\n---\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** The inventory row that lists the given definition path. */
function rowOf(page: import('@playwright/test').Page, path: string) {
  return page.locator('.aci-item').filter({ hasText: path });
}

/**
 * A direct comparison URL: the two copies' entry identities and, when it is
 * not the entries themselves, the compared file inside them. Resolved
 * against the printed origin — which ends with `/` — so the path never
 * doubles its leading slash into a route the router does not have.
 */
function compareUrl(left: string, right: string, file?: string): string {
  const fileQuery = file === undefined ? '' : `&file=${encodeURIComponent(file)}`;
  return new URL(
    `/skills/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}${fileQuery}`,
    host.origin,
  ).toString();
}

/** Opens the one name's comparison from its row's link. */
async function openComparison(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(host.origin);
  await rowOf(page, CLAUDE_PATH).getByRole('link', { name: "Compare this skill's files" }).click();
  await page.waitForURL(/\/skills\/compare\?/u);
}

test('compares the name’s two files from the row’s own link, with no selection step', async ({
  page,
}) => {
  await page.goto(host.origin);
  // No selection UI anywhere: the entry is one link on the row whose files
  // share the name: the row's entry link pairs files within its one name.
  await expect(page.getByRole('button', { name: 'Select for comparison' })).toHaveCount(0);
  await rowOf(page, CLAUDE_PATH).getByRole('link', { name: "Compare this skill's files" }).click();
  await page.waitForURL(/\/skills\/compare\?/u);
  await expect(page.locator('.aci-skill-compare h2')).toHaveText('Compare skill files');
  // Both complete sources are on the one surface, their literal credential
  // difference included — the diff editor holds both sides' lines.
  const diff = page.locator('.aci-source-diff');
  await expect(diff).toBeVisible();
  await expect(diff).toContainText(AGENTS_SECRET);
  await expect(diff).toContainText(CLAUDE_SECRET);
  await expect(diff).toContainText('Agents-only instruction line.');
  await expect(diff).toContainText('Claude-only instruction line.');
  // Each side is stated with its path, its Source, and its file type
  // (US3 scenario 1), so neither file loses its identity to the diff.
  await expect(page.locator('.aci-skill-compare__file-path')).toHaveText([
    AGENTS_PATH,
    CLAUDE_PATH,
  ]);
  const facts = page.locator('.aci-skill-compare__file-facts');
  await expect(facts.first()).toContainText('Repository');
  await expect(facts.first()).toContainText('Skill');
});

test('offers the comparison entry only where the name has two readable files', async ({ page }) => {
  await page.goto(host.origin);
  await expect(
    rowOf(page, CLAUDE_PATH).getByRole('link', { name: "Compare this skill's files" }),
  ).toHaveCount(1);
  // One readable file is nothing to pair.
  await expect(
    rowOf(page, '.agents/skills/solo/SKILL.md').getByRole('link', {
      name: "Compare this skill's files",
    }),
  ).toHaveCount(0);
});

test('steps the pair through corresponding files and copies', async ({ page }) => {
  await openComparison(page);
  // The compared-file switcher offers every file either current copy ships
  // readably — a file only one copy ships is itself a difference and says
  // which copy has it — while cross-file pairings do not exist and the
  // binary asset has no text to compare (FR-025).
  const fileSwitch = page.getByRole('combobox', { name: 'Compared file' });
  await expect(fileSwitch.locator('option')).toHaveText([
    'SKILL.md',
    'extras.md (first skill directory only)',
    'notes.md',
  ]);
  // Step the pair to the companion: both sides move to the corresponding
  // file, and the diff follows immediately.
  await fileSwitch.selectOption('notes.md');
  const diff = page.locator('.aci-source-diff');
  await expect(diff).toContainText('Greet notes line (agents).');
  await expect(diff).toContainText('Greet notes line (claude).');
  // The URL keeps the copies' entry identities and moves only the compared
  // file coordinate.
  expect(page.url()).toContain('file=notes.md');
  // vue-router keeps `/` unencoded in query values, so the identity reads
  // as the path it is.
  expect(page.url()).toContain(`left=${AGENTS_PATH}`);
  // A side moves between the name's copies. The third copy ships no
  // notes.md, so the pair keeps the reader's chosen file and becomes
  // one-sided: the absence is the difference the switch reveals, not a
  // reason to change the compared file under them (FR-011).
  await page
    .getByRole('combobox', { name: 'Second skill directory' })
    .selectOption('.claude/skills/greetz/');
  await expect(fileSwitch).toHaveValue('notes.md');
  await expect(diff).toContainText('Greet notes line (agents).');
  await expect(page.locator('.aci-skill-compare__files')).toContainText(
    'No file at this path in this skill directory',
  );
  expect(page.url()).toContain(`right=${THIRD_COPY_PATH}`);
  expect(page.url()).toContain('file=notes.md');
  // The other side's copy is unselectable: the two sides would hold one
  // file (FR-011). The `disabled` attribute is asserted directly —
  // Playwright's enabled-state check reads form controls, not options.
  await expect(
    page
      .getByRole('combobox', { name: 'First skill directory' })
      .locator('option', { hasText: '.claude/skills/greetz/' }),
  ).toHaveAttribute('disabled', '');
});

test('falls back to a shared file only when no copy keeps the current one, and says so', async ({
  page,
}) => {
  await openComparison(page);
  const fileSwitch = page.getByRole('combobox', { name: 'Compared file' });
  // extras.md is the file only the first copy ships.
  await fileSwitch.selectOption('extras.md');
  await expect(page.locator('.aci-source-diff')).toContainText('Extras line only in agents.');
  // Moving the side that shipped it to the third copy leaves no side with
  // extras.md, so the switch cannot keep the reader's file: it falls back
  // to the first file the two copies share, and the ready announcement
  // names the file now compared, so the change is heard rather than
  // silent (WCAG 4.1.3).
  await page
    .getByRole('combobox', { name: 'First skill directory' })
    .selectOption('.claude/skills/greetz/');
  await expect(fileSwitch).toHaveValue('SKILL.md');
  await expect(page.locator('.aci-skill-compare [role="status"]')).toHaveText(
    'Comparison ready: SKILL.md.',
  );
  const diff = page.locator('.aci-source-diff');
  await expect(diff).toContainText('Greetz-only instruction line.');
  await expect(diff).toContainText('Claude-only instruction line.');
});

test('shows a file only one copy ships as a one-sided difference', async ({ page }) => {
  await openComparison(page);
  // Stepping to a file the other copy lacks keeps both sides honest: the
  // present side's complete content, the absent side's stated absence — and
  // the diff renders the whole content as the difference it is.
  await page.getByRole('combobox', { name: 'Compared file' }).selectOption('extras.md');
  await expect(page.locator('.aci-source-diff')).toContainText('Extras line only in agents.');
  await expect(page.locator('.aci-skill-compare__files')).toContainText(
    'No file at this path in this skill directory',
  );
  // The absent side's identity is the corresponding path the copy does not
  // ship, carried by the URL like any pair.
  await expect(page.locator('.aci-skill-compare__file-path')).toHaveText([
    '.agents/skills/greet/extras.md',
    '.claude/skills/greet/extras.md',
  ]);
  expect(page.url()).toContain('file=extras.md');
  // A plain companion carries no recognition, and its absent counterpart
  // carries none either: the metadata section states that, and the sources
  // are the whole comparison.
  await expect(page.locator('.aci-skill-compare')).toContainText(
    'No compared file here carries a recognition',
  );
  // Stepping back to a shared file returns to the ordinary two-file view.
  await page.getByRole('combobox', { name: 'Compared file' }).selectOption('notes.md');
  await expect(page.locator('.aci-source-diff')).toContainText('Greet notes line (claude).');
});

test('reports a pair of two different names instead of comparing it', async ({ page }) => {
  // The URL names two copies of one skill name; a pair the model cannot
  // express is reported, never compared (FR-011), and no authored content
  // is fetched for it.
  await page.goto(compareUrl(AGENTS_PATH, '.agents/skills/solo/SKILL.md'));
  await expect(page.locator('.aci-skill-compare')).toContainText(
    'No skill name in the current scan owns both',
  );
  await expect(page.locator('.aci-source-diff')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Compared file' })).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain(AGENTS_SECRET);
});

test('resolves a hand-edited compared file against the copies', async ({ page }) => {
  // The `file` coordinate is copy-relative: a spelling neither copy holds
  // settles as the ordinary stale outcome, with the switchers still offered
  // as the way back to a real file.
  await page.goto(compareUrl(AGENTS_PATH, CLAUDE_PATH, 'missing.md'));
  await expect(page.locator('.aci-skill-compare')).toContainText(
    'Nothing in the current scan sits at this link',
  );
  await page.getByRole('combobox', { name: 'Compared file' }).selectOption('notes.md');
  await expect(page.locator('.aci-source-diff')).toContainText('Greet notes line (claude).');
});

test('renders recognition metadata as typed rows matched by tool, kind, and key', async ({
  page,
}) => {
  await openComparison(page);
  const comparison = page.locator('.aci-recognition-comparison');
  // The `.agents` file is recognized by GitHub Copilot and OpenAI Codex, the
  // `.claude` file by GitHub Copilot and Claude Code: one group per tool in
  // the contracted order, each recognition distinguishable from the physical
  // file (US3 scenario 2), captioned in words.
  await expect(comparison.locator('h4')).toHaveText([
    'GitHub Copilot · Skill',
    'Claude Code · Skill',
    'OpenAI Codex · Skill',
  ]);
  const copilotGroup = comparison.locator('section').first();
  // The declared credential difference is a row with both resolved values.
  const apiKeyRow = copilotGroup.locator('tr', { hasText: 'api_key' });
  await expect(apiKeyRow).toContainText(AGENTS_SECRET);
  await expect(apiKeyRow).toContainText(CLAUDE_SECRET);
  await expect(apiKeyRow).toContainText('Differs');
  // `7` and `007` resolve to the same value: the row says so while the
  // literal spelling difference stays visible in the source diff above.
  await expect(copilotGroup.locator('tr', { hasText: 'retries' })).toContainText('Same');
  // A key only one file declares is shown against no declaration.
  const onlyAgentsRow = copilotGroup.locator('tr', { hasText: 'only_agents' });
  await expect(onlyAgentsRow).toContainText('not declared');
  await expect(onlyAgentsRow).toContainText('Differs');
  // A tool that recognizes only one side is stated, with no key rows
  // fabricated against a recognition that does not exist.
  await expect(comparison.locator('section').nth(1)).toContainText(
    'First file: Claude Code does not recognize this file.',
  );
  await expect(comparison.locator('section').nth(2)).toContainText(
    'Second file: OpenAI Codex does not recognize this file.',
  );
});

test('shows the tab title for the comparison the page holds', async ({ page }) => {
  await openComparison(page);
  await expect(page).toHaveTitle('⁨Comparing skill files⁩ — Agent Customization Inspector');
});

test('offers no control that masks a value or reveals a masked one', async ({ page }) => {
  await openComparison(page);
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  const text = await page.locator('main').innerText();
  expect(text).toContain(AGENTS_SECRET);
  expect(text).toContain(CLAUDE_SECRET);
  expect(text).not.toContain('••••');
  expect(text).not.toContain('ghp_****');
});

test('leaves an environment reference as the characters that were written', async ({ page }) => {
  await openComparison(page);
  // The host reads no process environment on an inspected file's behalf, so
  // the reference is text on both the diff and the metadata rows.
  await expect(page.locator('.aci-source-diff')).toContainText(FIXTURE_ENV_REFERENCE);
  await expect(page.locator('.aci-recognition-comparison')).toContainText(FIXTURE_ENV_REFERENCE);
});

test('proposes no change: no merge, edit, lint, or fix control anywhere', async ({ page }) => {
  await openComparison(page);
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
  for (const label of [/merge/iu, /apply/iu, /fix/iu, /format/iu, /lint/iu, /revert/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
    await expect(page.getByRole('link', { name: label })).toHaveCount(0);
  }
  // Nor a verdict: the page states differences without ranking either file.
  const text = await page.locator('main').innerText();
  for (const verdict of ['wins', 'takes precedence', 'overrides', 'recommended']) {
    expect(text).not.toContain(verdict);
  }
});

test('is operable from the keyboard alone', async ({ page }) => {
  await page.goto(host.origin);
  const compareLink = rowOf(page, CLAUDE_PATH).getByRole('link', {
    name: "Compare this skill's files",
  });
  expect(await tabUntilFocused(page, compareLink)).toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/skills\/compare\?/u);
  // Arriving places focus on the page's own heading, the landmark every
  // state keeps (WCAG 2.4.3).
  await expect(page.locator('.aci-skill-compare h2')).toBeFocused();
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
  // The switchers are native selects reached in the page's real Tab order;
  // their value-change keys are the platform's own select semantics, which
  // differ per OS, so the change itself is driven with Playwright's
  // selection primitive rather than a key that only some platforms honor.
  const fileSwitch = page.getByRole('combobox', { name: 'Compared file' });
  expect(await tabUntilFocused(page, fileSwitch)).toBe(true);
  await fileSwitch.selectOption('notes.md');
  await expect(page.locator('.aci-source-diff')).toContainText('Greet notes line (agents).');
});

test('keeps the whole page usable at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await openComparison(page);
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
  // The body never scrolls sideways (WCAG 1.4.10): wide content scrolls
  // inside its own container, and the diff editor switches to its inline
  // view when the side-by-side layout does not fit.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  // The recognition table reflows into stacked per-declaration blocks
  // instead of scrolling in two dimensions — the contract allows
  // two-dimensional scrolling only for essential source-code regions
  // (accessibility-acceptance.md § 1.4.10), and these rows are data. The
  // hidden header row is the reflow's signature: each cell then carries its
  // own column caption.
  const table = page.locator('.aci-recognition-comparison__table').first();
  await expect(table).toBeVisible();
  await expect(table.locator('thead')).toBeHidden();
  const tableOverflow = await table.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(tableOverflow).toBeLessThanOrEqual(1);
});

test('drops the content when the route leaves the comparison', async ({ page }) => {
  await openComparison(page);
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-source-diff')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain(AGENTS_SECRET);
  expect(await page.locator('main').innerText()).not.toContain(CLAUDE_SECRET);
});

test('reports a link whose copy the current scan does not hold', async ({ page }) => {
  await page.goto(compareUrl('.agents/skills/gone/SKILL.md', CLAUDE_PATH));
  await expect(page.locator('.aci-skill-compare')).toContainText(
    'No skill name in the current scan owns both',
  );
  // The stable live region carries the same statement, so the state is
  // announced without moving keyboard focus (WCAG 4.1.3).
  await expect(page.locator('.aci-skill-compare .aci-live-region[role="status"]')).toHaveText(
    /No skill name in the current scan owns both/u,
  );
  await expect(page).toHaveTitle('⁨Link names no comparable pair⁩ — Agent Customization Inspector');
  expect(await page.locator('main').innerText()).not.toContain(CLAUDE_SECRET);
});

test('rejects the same copy for both comparison inputs', async ({ page }) => {
  await page.goto(compareUrl(AGENTS_PATH, AGENTS_PATH));
  // The same copy must not occupy both sides, however many recognitions its
  // entry has (FR-011); the page states the rejection instead of a
  // degenerate diff, and the statement's inventory link is the way back to
  // a valid pair — no switchers render for a pair outside the model.
  await expect(page.locator('.aci-skill-compare')).toContainText('two distinct copies');
  await expect(page.locator('.aci-source-diff')).toHaveCount(0);
});
