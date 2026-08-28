// T202: browser acceptance for the census-companion comparison (Phase 14
// "Skill Metadata Comparison"). Launches the packaged CLI against a fixture
// where one skill name is authored for two products, each copy shipping an
// `agents/openai.yaml` companion, and verifies that the comparison surface's
// file switchers reach the two companions and show the same generic literal
// diff any pair of readable files gets.
//
// A comparison is a pair within one skill name, between corresponding
// files of that name's copies — the URL names two of the name's copies and
// the compared file inside them (FR-011): the
// comparison opens from the name's row or detail-page link, and the
// compared-file switcher — whose options are the files both copies ship
// readably — is how the companion pair is reached, with no selection UI
// anywhere.
//
// The claims here can only be made against a rendered page: that a census
// file — which has no inventory row — is offered by the switchers, that no
// typed metadata rows are fabricated for files that carry no recognition,
// that authored sensitive values are shown unchanged with no masking or
// reveal control, and that leaving the route takes the content away again.
// The editor-failure fallback has no standing toggle to drive it from the
// page.
//
// The visible checkpoint of this milestone: two census-published
// `agents/openai.yaml` files compare through the generic literal comparison.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { tabUntilFocused } from './keyboard';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The two literal credentials whose difference the comparison must show. */
const AGENTS_SECRET = 'sk-E2EMETAAGENTS000000000000000000000000000';
const CLAUDE_SECRET = 'sk-E2EMETACLAUDE000000000000000000000000000';
/** An environment reference the product must never resolve. */
const FIXTURE_ENV_REFERENCE = '$ACI_E2E_META_TOKEN';

/** The one name's two entry points and their census companions. */
const AGENTS_SKILL = '.agents/skills/shared/SKILL.md';
const CLAUDE_SKILL = '.claude/skills/shared/SKILL.md';
const AGENTS_COMPANION = '.agents/skills/shared/agents/openai.yaml';
const CLAUDE_COMPANION = '.claude/skills/shared/agents/openai.yaml';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-skill-metadata-comparison-'));
  for (const [root, secret, model] of [
    ['.agents', AGENTS_SECRET, 'gpt-5.4'],
    ['.claude', CLAUDE_SECRET, 'gpt-5.4-codex'],
  ] as const) {
    await mkdir(join(fixture, `${root}/skills/shared/agents`), { recursive: true });
    await writeFile(
      join(fixture, `${root}/skills/shared/SKILL.md`),
      '---\nname: shared\n---\n\n# shared\n',
      'utf8',
    );
    // The companion the census publishes: ordinary YAML no recognition owns,
    // holding exactly the kind of values masking would hide.
    await writeFile(
      join(fixture, `${root}/skills/shared/agents/openai.yaml`),
      [
        `api_key: ${secret}`,
        `token_reference: "${FIXTURE_ENV_REFERENCE}"`,
        `model: ${model}`,
        '',
      ].join('\n'),
      'utf8',
    );
  }
  // A binary companion: readable text is what makes a file
  // comparison-eligible, so this one must be absent from the switchers.
  await writeFile(
    join(fixture, '.agents/skills/shared/logo.png'),
    Buffer.from('PNG\u0000bytes\n', 'latin1'),
  );
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/**
 * Opens the name's comparison from its row and steps the pair to the
 * corresponding `agents/openai.yaml` companions: one switch moves both
 * sides, because the pair is always the same file of two copies.
 */
async function openCompanionComparison(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(host.origin);
  await page
    .locator('.aci-item')
    .filter({ hasText: CLAUDE_SKILL })
    .getByRole('link', { name: "Compare this skill's files" })
    .click();
  await page.waitForURL(/\/skills\/compare\/repository\?/u);
  await page.getByRole('combobox', { name: 'Compared file' }).selectOption('agents/openai.yaml');
}

test('compares the two census companions through the file switchers', async ({ page }) => {
  await openCompanionComparison(page);
  await expect(page.locator('.aci-skill-compare h2')).toHaveText('Compare skill files');
  // The complete literal diff of the two companions, credentials included.
  const diff = page.locator('.aci-source-diff');
  await expect(diff).toBeVisible();
  await expect(diff).toContainText(AGENTS_SECRET);
  await expect(diff).toContainText(CLAUDE_SECRET);
  await expect(diff).toContainText('gpt-5.4');
  await expect(diff).toContainText('gpt-5.4-codex');
  // Each side keeps its identity: the census file's own path, its Source,
  // and the honest statement that no recognition owns it.
  await expect(page.locator('.aci-skill-compare__file-path')).toHaveText([
    AGENTS_COMPANION,
    CLAUDE_COMPANION,
  ]);
  await expect(page.locator('.aci-skill-compare__file-facts').first()).toContainText(
    'No recognized kind',
  );
});

test('publishes no recognition rows for files that carry none', async ({ page }) => {
  await openCompanionComparison(page);
  // No `skill metadata` recognition exists (Phase 6 decision), so nothing is
  // typed about these files: the section states that instead of fabricating
  // rows or headings of its own, and the literal sources are the comparison.
  const comparison = page.locator('.aci-recognition-comparison');
  await expect(comparison).toContainText('No compared file here carries a recognition');
  await expect(comparison.locator('table')).toHaveCount(0);
  await expect(comparison.locator('section')).toHaveCount(0);
  // The one heading left is the page's own, passed through this component's
  // `source` slot: the complete sources still compare when no recognition
  // does.
  await expect(comparison.locator('h3')).toHaveText(['Source comparison']);
  await expect(comparison.locator('.aci-skill-compare__source')).toHaveCount(1);
});

test('shows authored sensitive values unchanged, with no masking or reveal control', async ({
  page,
}) => {
  await openCompanionComparison(page);
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
  // The environment reference is the characters that were written; nothing
  // resolved or substituted a process value for it.
  await expect(page.locator('.aci-source-diff')).toContainText(FIXTURE_ENV_REFERENCE);
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  const text = await page.locator('main').innerText();
  expect(text).toContain(AGENTS_SECRET);
  expect(text).toContain(CLAUDE_SECRET);
  expect(text).not.toContain('••••');
  expect(text).not.toContain('sk-****');
});

test('offers the same comparison entry from the skill detail page', async ({ page }) => {
  await page.goto(host.origin);
  await page
    .locator('.aci-source-family-blocks__members > li', { hasText: AGENTS_SKILL })
    .locator('.aci-skill-row__owner a')
    .first()
    .click();
  // A reader deep in a skill's files starts comparing from where they are:
  // the detail page carries the same link the row does, beside the
  // definition line.
  await page.getByRole('link', { name: "Compare this skill's files" }).click();
  await page.waitForURL(/\/skills\/compare\/repository\?/u);
  await expect(page.locator('.aci-skill-compare h2')).toHaveText('Compare skill files');
  await expect(page.locator('.aci-skill-compare__file-path')).toHaveText([
    AGENTS_SKILL,
    CLAUDE_SKILL,
  ]);
});

test('excludes a companion with no readable source from the switchers', async ({ page }) => {
  await openCompanionComparison(page);
  // The compared-file switcher offers exactly the files both copies ship
  // readably: the entry point and the census companion. The binary asset has
  // no text to compare (FR-025), and a cross-file pairing is not a choice
  // that exists.
  await expect(page.getByRole('combobox', { name: 'Compared file' }).locator('option')).toHaveText([
    'SKILL.md',
    'agents/openai.yaml',
  ]);
});

test('is operable from the keyboard alone', async ({ page }) => {
  await page.goto(host.origin);
  const compareLink = page
    .locator('.aci-item')
    .filter({ hasText: CLAUDE_SKILL })
    .getByRole('link', { name: "Compare this skill's files" });
  expect(await tabUntilFocused(page, compareLink)).toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/skills\/compare\/repository\?/u);
  await expect(page.locator('.aci-skill-compare h2')).toBeFocused();
  // The switchers are native selects reached in the page's real Tab order;
  // their value-change keys are the platform's own select semantics, which
  // differ per OS, so the change itself is driven with Playwright's
  // selection primitive rather than a key that only some platforms honor.
  const fileSwitch = page.getByRole('combobox', { name: 'Compared file' });
  expect(await tabUntilFocused(page, fileSwitch)).toBe(true);
  await fileSwitch.selectOption('agents/openai.yaml');
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
});

test('drops the content when the route leaves the comparison', async ({ page }) => {
  await openCompanionComparison(page);
  await expect(page.locator('.aci-source-diff')).toContainText(AGENTS_SECRET);
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-source-diff')).toHaveCount(0);
  const text = await page.locator('main').innerText();
  expect(text).not.toContain(AGENTS_SECRET);
  expect(text).not.toContain(CLAUDE_SECRET);
});
