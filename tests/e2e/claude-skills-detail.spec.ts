// T144: browser acceptance for the Claude SKILL detail (Phase 9 "Claude Skill
// Detail"). Launches the packaged CLI against a mixed fixture, opens a Claude
// skill from the inventory, and verifies the complete inert detail screen.
//
// The claims here can only be made against a rendered page: that the complete
// source — a literal credential and an environment reference included — is
// shown exactly as authored with no masking or reveal control anywhere, that
// discovery is never presented as loading, that a malformed skill keeps its
// readable source while its all-or-nothing parsed presentation is absent, that
// leaving the route and rescanning both take the content away again, and that
// the Codex detail beside it is unchanged.
//
// The visible checkpoint of this milestone: Claude SKILL detail is complete
// and consistent with Codex detail.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, shown exactly as written. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDE00000000000000000000000000000';
/** An environment reference the product must never resolve. */
const FIXTURE_ENV_REFERENCE = '$ACI_E2E_TOKEN';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-claude-detail-'));
  await mkdir(join(fixture, '.claude/skills/greet'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/greet/SKILL.md'),
    [
      '---',
      'name: claude-greet',
      `description: "deploy with ${FIXTURE_SECRET} and ${FIXTURE_ENV_REFERENCE}"`,
      'agent: reviewer',
      'context: fork',
      `api_key: ${FIXTURE_SECRET}`,
      // A list, and a mapping nested four levels below a list item: the shape
      // the value column has to survive, and the one a flat frontmatter never
      // exercises.
      'allowed-tools:',
      '  - Read',
      '  - Bash',
      'hooks:',
      '  PostToolUse:',
      '    - matcher: Write',
      '      hooks:',
      '        - type: command',
      '          command: ./format.sh',
      '---',
      '',
      '# Greet',
      '',
      'Say hello.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(join(fixture, '.claude/skills/greet/reference.md'), 'reference notes\n', 'utf8');
  // A second skill whose frontmatter cannot be parsed. Extraction is
  // all-or-nothing, so its name, description, declarations, and instructions
  // are all absent while its complete source stays readable (FR-028).
  await mkdir(join(fixture, '.claude/skills/broken'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/broken/SKILL.md'),
    '---\nname: [unterminated\n---\n\n# Broken\n',
    'utf8',
  );
  // A skill inside another skill's directory. Claude discovers descendant skill
  // directories, so the inner `SKILL.md` is both its own entry point and a file
  // of the outer skill's census — the one case where the two tests a detail
  // route resolves an owner by can both match. The names sort the outer first,
  // which is the order that decides it.
  await mkdir(join(fixture, '.claude/skills/outer/sub/.claude/skills/inner'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/outer/SKILL.md'),
    '---\nname: aaa-outer\n---\n\n# Outer\n',
    'utf8',
  );
  await writeFile(
    join(fixture, '.claude/skills/outer/sub/.claude/skills/inner/SKILL.md'),
    '---\nname: zzz-inner\n---\n\n# Inner\n',
    'utf8',
  );
  // A companion of the inner skill is under the outer skill's directory too, so
  // both censuses list it — the same collision one level down from the entry
  // point.
  await writeFile(
    join(fixture, '.claude/skills/outer/sub/.claude/skills/inner/ref.md'),
    'inner reference\n',
    'utf8',
  );
  // The Codex skill whose detail this phase must leave unchanged.
  await mkdir(join(fixture, '.agents/skills/codex-greet'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/codex-greet/SKILL.md'),
    '---\nname: codex-greet\ndescription: codex detail\n---\n\n# Codex\n',
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/**
 * Opens the named skill's detail route from the inventory. A shared file has
 * one definition link per recognizing product, each addressing its own
 * `/skills/<tool>/<source-relative path>` route; this suite is about the
 * Claude recognition, so the Claude definition's link is followed when the
 * file has one.
 */
async function openSkill(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  const links = page
    .locator('.aci-skill-row__file', { hasText: path })
    .locator('.aci-skill-row__definitions a');
  const claudeLink = links.and(page.locator('[href^="/skills/claude/"]'));
  // The rows render together once the snapshot arrives, so waiting for any
  // link is waiting for all of them; counting before that saw an empty list.
  await links.first().waitFor();
  await ((await claudeLink.count()) > 0 ? claudeLink : links.first()).click();
}

/**
 * Opens the skill and switches to its files. A skill opens on itself, so every
 * case about a file starts with the tab the reader would click.
 */
async function openSkillFiles(page: import('@playwright/test').Page, path: string): Promise<void> {
  await openSkill(page, path);
  await page.getByRole('tab', { name: /^files/iu }).click();
}

test('shows the literal credential and environment reference with no mask or reveal', async ({
  page,
}) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  // The Skill tab's declarations carry the credential too, and a hidden
  // panel's controls are outside the accessibility tree the role query
  // reads — so the no-reveal claim is asserted on each tab in turn, while
  // that tab is the visible one (FR-026, FR-027).
  await expect(page.locator('.aci-skill-detail__declarations')).toContainText(FIXTURE_SECRET);
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  await page.getByRole('tab', { name: /^files/iu }).click();
  // The complete authored source, credential and environment reference
  // included, with nothing standing in front of it.
  const viewer = page.locator('.aci-skill-detail__main .aci-source-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText('# Greet');
  await expect(viewer).toContainText(FIXTURE_SECRET);
  await expect(viewer).toContainText(FIXTURE_ENV_REFERENCE);
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  const text = await page.locator('main').innerText();
  expect(text).toContain(FIXTURE_SECRET);
  expect(text).not.toContain('••••');
  expect(text).not.toContain('ghp_****');
});

test('leads with the name and description, then the rest of the declarations', async ({ page }) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  // The heading is the row's own name — the same one the inventory lists —
  // and the documented invocation name sits beside it: this page is the
  // Claude definition's own route, so the value is Claude's directory-derived
  // command rather than the authored label (FR-007, T1081).
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('claude-greet');
  await expect(page.locator('.aci-skill-detail__invocation-name')).toHaveText(
    'Invocation name: greet',
  );
  // Every key the file declares, as one YAML document in the read-only
  // viewer, led by the two a reader looks for first however the file
  // ordered them (FR-007).
  const declarations = page.locator('.aci-skill-detail__declarations');
  await expect(declarations).toContainText('name: claude-greet');
  await expect(declarations).toContainText(FIXTURE_SECRET);
  await expect(declarations).toContainText(FIXTURE_ENV_REFERENCE);
  const text = await declarations.innerText();
  expect(text.indexOf('name:')).toBeGreaterThan(-1);
  expect(text.indexOf('name:')).toBeLessThan(text.indexOf('description:'));
  expect(text.indexOf('description:')).toBeLessThan(text.indexOf('agent:'));
  // The nested declarations are part of the same document, by the keys the
  // file wrote — the hooks mapping and the sequence items among them.
  await expect(declarations).toContainText('PostToolUse');
  await expect(declarations).toContainText('matcher');
  await expect(declarations).toContainText('command');
  await expect(declarations).toContainText('allowed-tools');
});

test('renders the declarations as one YAML document, nothing gridded beside it', async ({
  page,
}) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  // One document in one viewer: the declaration grid is gone, so no second
  // rendering of a declared value exists on the page (FR-007), and the
  // nested hooks structure reads as YAML indentation inside the same box.
  const declarations = page.locator('.aci-skill-detail__declarations');
  await expect(declarations.locator('.aci-source-viewer')).toHaveCount(1);
  await expect(declarations.locator('.aci-declaration-block')).toHaveCount(0);
  await expect(declarations).toContainText('hooks:');
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(fits).toBe(true);
});

test('opens a nested skill as itself, not as the skill whose census lists it', async ({ page }) => {
  await openSkill(page, '.claude/skills/outer/sub/.claude/skills/inner/SKILL.md');
  // The inner file is the outer skill's companion as well as its own entry
  // point. Resolving the owner by whichever test matches first would open the
  // outer skill, and the reader would have no way to reach the inner one. The
  // heading is the row's own name — the prefixed authored label — while the
  // invocation list carries Claude's documented command, the prefixed
  // directory (FR-007, T1081).
  await expect(page.locator('.aci-skill-detail h2')).toHaveText(
    '.claude/skills/outer/sub:zzz-inner',
  );
  await expect(page.locator('.aci-skill-detail__invocation-name')).toHaveText(
    'Invocation name: .claude/skills/outer/sub:inner',
  );
  await expect(page.locator('.aci-skill-detail__overview .aci-path')).toHaveText(
    '.claude/skills/outer/sub/.claude/skills/inner/',
  );
});

test('keeps a nested skill selected when one of its own companions is opened', async ({ page }) => {
  await openSkillFiles(page, '.claude/skills/outer/sub/.claude/skills/inner/SKILL.md');
  await page.getByRole('link', { name: 'ref.md' }).click();
  // Two censuses list this file. Answering with whichever the inventory sorted
  // first would swap the page to the outer skill from the inner skill's own
  // tree, leaving the reader no way back to the file they clicked.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText(
    '.claude/skills/outer/sub:zzz-inner',
  );
  await expect(page.locator('.aci-skill-detail__overview .aci-path')).toHaveText(
    '.claude/skills/outer/sub/.claude/skills/inner/',
  );
});

test('shows the instructions apart from the declarations', async ({ page }) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  // The body the product would read, with the frontmatter block gone from it:
  // the seam is the parser's, so the reader never has to find it.
  const body = page.locator('.aci-skill-detail__instructions .aci-source-viewer');
  await expect(body).toContainText('# Greet');
  await expect(body).toContainText('Say hello.');
  expect(await body.innerText()).not.toContain('name: claude-greet');
});

test('shows the addressed definition and nothing about a runtime it cannot see', async ({
  page,
}) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  // One definition line — the route's own tool and the surfaces its
  // admissions rest on, captioned in words — because the URL addresses one
  // definition; which other products recognize the file is the inventory's
  // matrix. Naming a surface says where the product documents reading the
  // file, never that it loaded it: that depends on a runtime this tool never
  // observes, and a sentence about it would take the room the files below
  // need (FR-009).
  const definition = page.locator('.aci-skill-detail__definition');
  await expect(definition).toHaveCount(1);
  await expect(definition).toHaveText('Claude Code (CLI and IDE clients) · Skill');
  const detail = (await page.locator('.aci-skill-detail').textContent()) ?? '';
  for (const claim of ['Depends on runtime conditions', 'Selected by a documented rule']) {
    expect(detail).not.toContain(claim);
  }
});

test('keeps a malformed Claude skill readable while its declared name is missing', async ({
  page,
}) => {
  await openSkillFiles(page, '.claude/skills/broken/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText(
    '# Broken',
  );
  // One extraction, one failure record (FR-028): however many products
  // recognize the file, the parse ran once, so the message renders once —
  // with the open file, where the reader is looking.
  await expect(
    page.locator('.aci-skill-detail__main li', {
      hasText: 'This file could not be parsed',
    }),
  ).toHaveCount(1);
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openSkillFiles(page, '.claude/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('keeps a link resolving across a rescan through its path identity', async ({ page }) => {
  await openSkillFiles(page, '.claude/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
  const bookmarkedUrl = page.url();

  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  // Nothing polls, so the committed result arrives on an explicit refresh.
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation', {
      timeout: 1_000,
    });
  }).toPass();

  // The URL names the definition's stable identity — the tool and the path —
  // and the path is the file's identity on the wire (FR-030): the same URL
  // resolves against the new generation and the skill opens again.
  await page.goto(bookmarkedUrl);
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('claude-greet');
});

test('rescues focus to the heading when a newer commit replaces the open detail', async ({
  page,
  context,
}) => {
  await openSkillFiles(page, '.claude/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();

  // A second tab of the same session commits a newer generation. Nothing
  // polls, so this tab keeps its adopted snapshot and its next detail request
  // meets the newer commit and is withheld (`newer-generation`).
  const other = await context.newPage();
  await other.goto(host.origin);
  await other.getByRole('button', { name: 'Rescan repository' }).click();
  await expect(async () => {
    await other.getByRole('button', { name: 'Refresh status' }).click();
    await expect(other.locator('.aci-scan-progress')).toContainText('Committed generation', {
      timeout: 1_000,
    });
  }).toPass();
  await other.close();

  // Select a companion with keyboard focus in the file tree. Adopting the
  // newer snapshot drops the whole detail — the tree included — so without a
  // rescue focus would fall to the document body; it must land on the heading
  // instead (WCAG 2.4.3), and the same path then reopens under the new
  // generation.
  const companion = page.getByRole('link', { name: 'reference.md' });
  await companion.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.aci-skill-detail h2')).toBeFocused();
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText(
    'reference notes',
  );
});

test('reports a link whose path the current scan does not hold', async ({ page }) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  // The click routes client-side; the URL is captured only once the detail
  // route owns the page, or a slow navigation would bookmark the inventory.
  await page.waitForURL(/\/skills\//u);
  const bookmarkedUrl = page.url();
  // The same URL with the tool segment swapped names a definition this
  // generation does not hold — Codex never recognizes a `.claude` skill — and
  // the page says so instead of guessing at a nearby one.
  await page.goto(bookmarkedUrl.replace('/skills/claude/', '/skills/codex/'));
  await expect(page.locator('.aci-skill-detail')).toContainText(
    'Nothing in the current scan sits at this link',
  );
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('leaves the Codex detail beside it unchanged', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/codex-greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('codex-greet');
  await expect(page.locator('.aci-skill-detail__definition')).toHaveCount(1);
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('# Codex');
});

test('keeps the reader in the file list when a newer commit replaces the open skill', async ({
  page,
  context,
}) => {
  // The reader is in the file list with the entry point itself open — the
  // state the tab watcher's own comment says a file selection must not be
  // undone from.
  await openSkillFiles(page, '.claude/skills/greet/SKILL.md');
  await page.getByRole('link', { name: 'SKILL.md' }).first().click();
  await expect(page.getByRole('tab', { name: /^files/iu })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  const other = await context.newPage();
  await other.goto(host.origin);
  await other.getByRole('button', { name: 'Rescan repository' }).click();
  await expect(async () => {
    await other.getByRole('button', { name: 'Refresh status' }).click();
    await expect(other.locator('.aci-scan-progress')).toContainText('Committed generation', {
      timeout: 1_000,
    });
  }).toPass();
  await other.close();

  // Selecting the open file again meets the newer commit, which drops the
  // detail and re-requests the same skill (FR-030). The skill did not change,
  // so the strip stays where the reader put it.
  await page.getByRole('link', { name: 'SKILL.md' }).first().click();
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
  await expect(page.getByRole('tab', { name: /^files/iu })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
