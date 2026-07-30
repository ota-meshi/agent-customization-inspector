// T086: browser acceptance for the Codex SKILL detail (Phase 5 "Codex Skill
// Detail"). Launches the packaged CLI against a Codex fixture, opens a skill
// from the inventory, and verifies the complete inert detail screen.
//
// The claims here can only be made against a rendered page, which is why they
// live in this suite: that the skill is what the page is about and its files
// are the detail below it, that the credential in the fixture is shown unmasked
// with no reveal control anywhere, that an environment reference stays the
// characters that were written, and
// that leaving the route and rescanning both take the content away again.
//
// Opening a file takes one interaction: FR-027 admits no confirmation step in
// front of the content and no notice beside it, so the first case below asserts
// the absence of both.
//
// The visible checkpoint of this milestone: selecting a Codex SKILL opens a
// complete inert detail screen.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, shown exactly as written. */
const FIXTURE_SECRET = 'ghp_E2EDETAIL00000000000000000000000000000';
/** An environment reference the product must never resolve. */
const FIXTURE_ENV_REFERENCE = '$ACI_E2E_TOKEN';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-codex-detail-'));
  await mkdir(join(fixture, '.agents/skills/greet/scripts'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/greet/SKILL.md'),
    [
      '---',
      'name: greet',
      `description: "deploy with ${FIXTURE_SECRET} and ${FIXTURE_ENV_REFERENCE}"`,
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# Greet',
      '',
      'Run `scripts/run.sh` first.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(join(fixture, '.agents/skills/greet/scripts/run.sh'), 'echo hi\n', 'utf8');
  // A binary asset the skill ships. Ordinary — its bytes are a fact, not a
  // failure — and the case below is what proves the page treats it that way.
  await writeFile(join(fixture, '.agents/skills/greet/logo.png'), 'PNG\u0000\u0001bytes\n', 'utf8');
  // A second skill whose frontmatter cannot be parsed. Its source must stay
  // readable while only its derived metadata is missing (FR-028).
  await mkdir(join(fixture, '.agents/skills/broken'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/broken/SKILL.md'),
    '---\nname: [unterminated\n---\n\n# Broken\n',
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the named skill's detail route from the inventory. */
async function openSkill(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  await page.getByRole('link', { name: path }).click();
}

test('opens the file directly, with nothing standing in front of it', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // One interaction from the inventory to the content. Nothing stands in front
  // of it: the session is loopback-only and these are the viewer's own files.
  await expect(page.locator('.aci-source-viewer')).toBeVisible();
  await expect(page.getByRole('button', { name: /show file contents/iu })).toHaveCount(0);
  // Nor beside it. A viewer that announced what a file might contain, or where
  // its own page keeps it, would be narrating the reader's repository back at
  // them and spending the screen to do it (FR-027).
  const detail = (await page.locator('.aci-skill-detail').textContent()) ?? '';
  for (const notice of ['access tokens', 'personal paths', "page's memory", 'never stored']) {
    expect(detail).not.toContain(notice);
  }
});

test('titles the tab by the skill the page shows', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
  // Two tabs on two skills must be distinguishable by title alone
  // (WCAG 2.4.2): the subject the heading shows is the subject the tab
  // names, where the surface name alone would title every skill the same.
  await expect(page).toHaveTitle('greet — Agent Customization Inspector');
});

test('shows the complete authored source', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  const viewer = page.locator('.aci-source-viewer');
  await expect(viewer).toBeVisible();
  // The body text appears only in the file itself, so finding it inside the
  // editor is what proves the editor is showing the source rather than the
  // metadata rendered beside it.
  await expect(viewer).toContainText('# Greet');
  await expect(viewer).toContainText('Run `scripts/run.sh` first.');
  await expect(viewer).toContainText(FIXTURE_SECRET);
});

test('offers no control that masks a value or reveals a masked one', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-source-viewer')).toBeVisible();
  // A value is published as authored or not at all, so there is nothing for a
  // reveal control to uncover — and no such control exists to suggest there is.
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  // Nor is any part of the content covered: the credential appears whole, with
  // no ellipsis or bullet standing in for its characters.
  const text = await page.locator('main').innerText();
  expect(text).toContain(FIXTURE_SECRET);
  expect(text).not.toContain('••••');
  expect(text).not.toContain('ghp_****');
});

test('shows the recognized value of each allowlisted field and nothing else', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  const values = page.locator('.aci-declared-value');
  // Two allowlisted fields are declared; `api_key` is not one of them, so it
  // stays visible only in the source above.
  await expect(values).toHaveCount(2);
  await expect(values.nth(0)).toHaveText('greet');
  // The value a product loading this file would have: the quoting is resolved,
  // and the credential inside it is not.
  await expect(values.nth(1)).toHaveText(
    `deploy with ${FIXTURE_SECRET} and ${FIXTURE_ENV_REFERENCE}`,
  );
});

test('leaves an environment reference as the characters that were written', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // The host reads no process environment on an inspected file's behalf, so
  // the reference is text and stays text.
  await expect(page.locator('.aci-declared-value').nth(1)).toContainText(FIXTURE_ENV_REFERENCE);
});

test('states what is not known about whether the product loads the file', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-recognition-summary')).toContainText('OpenAI Codex');

  // Discovery is not loading, and where that is said is behind a disclosure:
  // every shipped rule projects the same sentence, so on the summary it would
  // be one constant line on every skill, and the inventory states it once for
  // the whole product.
  await expect(page.locator('.aci-recognition')).toBeHidden();
  // Named by the product it belongs to, so several recognitions of one file are
  // told apart by more than their order.
  await page.locator('summary', { hasText: 'How OpenAI Codex recognized this' }).click();
  const recognition = page.locator('.aci-recognition');
  await expect(recognition).toContainText(
    'Depends on runtime conditions this tool does not evaluate',
  );
  // The admitting rule is stated as what it is for, which is the answer to
  // "why was this file inspected".
  await expect(recognition).toContainText(
    'This tool reads repository skill files at .agents/skills/<name>/SKILL.md',
  );
});

test('says what it recognized in words, never as a contract identifier', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  const summary = page.locator('.aci-recognition-summary');
  // The two allowlisted fields are captioned by what they are. `Skill name` is
  // an answer; `codex.skill.name` is the token that keys the registry record
  // behind it, and someone looking at their own file never asked for it.
  await expect(summary).toContainText('Skill name');
  await expect(summary).toContainText('Skill description');

  // `textContent` rather than `innerText`: the conditions and the evidence
  // grades are inside collapsed `<details>`, and an identifier behind a
  // disclosure triangle is still an identifier on the page.
  const rendered = (await page.locator('.aci-skill-detail').textContent()) ?? '';
  // Every contract identifier this page can reach is a dotted lower-case token
  // — `codex.skill.name`, `codex.repo.skill`, `codex.behavior.repo.skills`.
  // The fixture's own source contains none, so a match came from the product.
  expect(rendered).not.toMatch(/codex\.[a-z]/u);
  // The condition, status, and evidence vocabularies are hyphenated rather than
  // dotted, so they need their own check.
  for (const token of ['runtime-cwd', 'scope-availability', 'partially-documented']) {
    expect(rendered).not.toContain(token);
  }
});

test('shows the skill first and its files below', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // The heading is the skill's declared name, not a path: what the reader
  // asked about is a customization, and the files are how it is made.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  // A skill is a directory: the entry point and what ships beside it, the
  // binary asset included.
  await expect(tree.getByRole('link')).toHaveText(['SKILL.md', 'logo.png', 'run.sh']);
  // Which file is open is stated, not merely styled.
  await expect(tree.getByRole('link', { name: 'SKILL.md' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // The open file is the `SKILL.md`, so the script's contents are not on screen
  // until it is selected.
  expect(await page.locator('main').innerText()).not.toContain('echo hi');
});

test('opens a supporting file from the tree and keeps the skill on screen', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await page
    .getByRole('navigation', { name: 'Files in this skill' })
    .getByRole('link', { name: 'run.sh' })
    .click();

  // The subject does not change: the reader opened a skill and selected one of
  // its files, so the heading and everything recognized about the skill stay
  // put and only the source below changes. That is also what keeps the page
  // from answering the wrong question — a companion carries no recognition of
  // its own, and a screen that reported that would be describing the file
  // instead of the skill the reader is looking at.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
  const summary = page.locator('.aci-recognition-summary');
  await expect(summary).toContainText('OpenAI Codex');
  await expect(summary).toContainText('Skill name');
  await expect(page.locator('.aci-skill-detail-main h3')).toHaveText(
    '.agents/skills/greet/scripts/run.sh',
  );
  await expect(page.locator('.aci-source-viewer')).toContainText('echo hi');

  // The tree stays, now marking the file that is open, so the reader can move
  // back through the skill without returning to the inventory.
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  await expect(tree.getByRole('link', { name: 'run.sh' })).toHaveAttribute('aria-current', 'page');
});

test('shows a binary asset as the fact it is, with nothing wrong', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await page
    .getByRole('navigation', { name: 'Files in this skill' })
    .getByRole('link', { name: 'logo.png' })
    .click();

  // An image is part of what the skill ships. The page states what the read
  // found — binary, so no text — and reports no problem, because there is
  // none: nothing expected an asset to be text.
  const main = page.locator('.aci-skill-detail-main');
  await expect(main.locator('h3')).toHaveText('.agents/skills/greet/logo.png');
  await expect(main).toContainText('Binary');
  await expect(main).toContainText('no source text');
  await expect(page.locator('.aci-source-viewer')).toHaveCount(0);
  const text = await main.innerText();
  // Neither diagnostic message: not `file-unreadable`'s, and not
  // `file-content-binary`'s, which a regression to candidate handling would
  // attach here.
  expect(text).not.toContain('could not');
  expect(text).not.toContain('NUL');
  // And the skill above it is untouched: the asset changes what is shown, not
  // what was recognized.
  await expect(page.locator('.aci-recognition-summary')).toContainText('OpenAI Codex');
});

test('leaves the reader in the tree when they select another file', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  const link = tree.getByRole('link', { name: 'run.sh' });
  await link.focus();
  await page.keyboard.press('Enter');

  // The skill has not changed, so nothing but the source does. A page that took
  // its loading state here would unmount the tree — and the link the reader is
  // standing on with it, dropping focus to the document and sending the next
  // Tab back to the top.
  await expect(page.locator('.aci-source-viewer')).toContainText('echo hi');
  await expect(link).toBeFocused();
  await expect(tree.getByRole('link')).toHaveCount(3);
  await expect(page.locator('.aci-empty')).toHaveCount(0);
});

test('opens the skill from any of its files, not only its entry point', async ({ page }) => {
  // A link a reader kept points at one file; the skill it belongs to is what
  // the page is about, so the same skill opens with that file showing.
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await page
    .getByRole('navigation', { name: 'Files in this skill' })
    .getByRole('link', { name: 'run.sh' })
    .click();
  // Read the URL only once the router has arrived: `click` resolves before the
  // SPA navigation settles, so reading it straight away captures the URL the
  // reader was on rather than the one they moved to.
  await expect(page.locator('.aci-source-viewer')).toContainText('echo hi');
  const companionUrl = page.url();

  await page.goto(companionUrl);
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
  await expect(page.locator('.aci-recognition-summary')).toContainText('OpenAI Codex');
  await expect(page.locator('.aci-source-viewer')).toContainText('echo hi');
});

test('colours each file by the language its own path claims', async ({ page }) => {
  // Monaco assigns one token class per colour, so a file whose grammar loaded
  // renders several classes across a line and an uncoloured one renders a
  // single class for the whole line. That difference is what "highlighted"
  // means here.
  //
  // Each assertion polls, because a grammar is a lazily fetched chunk: the text
  // renders as soon as the model exists and is re-tokenized when the grammar
  // arrives. Reading the DOM once after the text appears catches the plain
  // render on a browser that fetches a moment slower.
  const expectSeveralTokenClasses = async (): Promise<void> => {
    await expect(async () => {
      const classes = await page
        .locator('.aci-source-viewer .view-line span span')
        .evaluateAll((spans) => [...new Set(spans.map((span) => span.className))]);
      expect(classes.length).toBeGreaterThan(1);
    }).toPass();
  };

  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-source-viewer')).toContainText('# Greet');
  // Markdown: the heading and the frontmatter fences are not the body text.
  await expectSeveralTokenClasses();

  // A supporting file gets its own language from its own extension — the whole
  // point of registering more than the two the entry points use.
  await page
    .getByRole('navigation', { name: 'Files in this skill' })
    .getByRole('link', { name: 'run.sh' })
    .click();
  await expect(page.locator('.aci-source-viewer')).toContainText('echo hi');
  await expectSeveralTokenClasses();
});

test('lists supporting files nowhere in the inventory', async ({ page }) => {
  await page.goto(host.origin);
  // Wait for the committed inventory: an empty page trivially contains no
  // supporting file, which would make the assertion below vacuous.
  await expect(page.locator('.aci-item')).toHaveCount(2);
  // They belong to the skill that ships them, and the skill already has a row.
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('scripts/run.sh');
  expect(text).toContain('2 supporting file(s) in this skill');
});

test('keeps a malformed file readable while its metadata is missing', async ({ page }) => {
  await openSkill(page, '.agents/skills/broken/SKILL.md');
  await expect(page.locator('.aci-source-viewer')).toContainText('# Broken');
  // A failed extraction is an at-a-glance fact, so it is in the summary rather
  // than behind the disclosure: the values are missing and the file is fine,
  // and nothing else on the screen would say so.
  await expect(page.locator('.aci-recognition-summary')).toContainText(
    'Metadata could not be extracted',
  );
  await expect(page.locator('.aci-declared-value')).toHaveCount(0);
});

test('is operable from the keyboard alone', async ({ page }) => {
  await page.goto(host.origin);
  // Reaching the skill link and following it without a pointer is the whole
  // path to the content now.
  await page.getByRole('link', { name: '.agents/skills/greet/SKILL.md' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.aci-source-viewer')).toBeVisible();
  await expect(page.locator('.aci-skill-detail h2')).toBeFocused();
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-source-viewer')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-source-viewer')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('replaces a link a rescan invalidated with a recoverable state', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-source-viewer')).toBeVisible();
  const staleUrl = page.url();

  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  // Nothing polls, so the committed result arrives on an explicit refresh.
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(page.locator('.aci-scan-status')).toContainText('Committed generation', {
      timeout: 1_000,
    });
  }).toPass();

  // Every file gets a new identity when a scan commits, so the earlier URL
  // names nothing — and says so instead of failing or showing stale content.
  await page.goto(staleUrl);
  await expect(page.locator('.aci-skill-detail')).toContainText(
    'does not name a file in the current scan',
  );
  // The page's stable live region carries the same statement, so the state
  // change is announced without moving keyboard focus (WCAG 4.1.3).
  await expect(page.locator('.aci-skill-detail .aci-live-region[role="status"]')).toHaveText(
    /does not name a file in the current scan/u,
  );
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});
