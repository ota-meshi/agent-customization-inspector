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

import { tabUntilFocused } from './keyboard';
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
      // Two keys whose values draw nothing, and differ only in how much
      // whitespace they hold. The detail has to keep them distinguishable.
      "one_space: ' '",
      "two_spaces: '  '",
      // Two keys that draw nothing, differing only in how much whitespace they
      // hold — the key column has to keep them apart the same way.
      "' ': first",
      "'  ': second",
      // A sequence nested past the indent cap, so the capped marker layout is
      // reachable from the browser.
      'deep: [[[[[[[[bottom]]]]]]]]',
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
  // A second skill whose frontmatter cannot be parsed. Extraction is
  // all-or-nothing, so its name, description, declarations, and instructions
  // are all absent while its complete source stays readable (FR-028).
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
  // A file two products recognize offers one definition link per product;
  // each addresses its own definition route and either opens the same file.
  await page
    .locator('.aci-skill-row__file', { hasText: path })
    .locator('.aci-skill-row__definitions a')
    .first()
    .click();
}

/**
 * Opens the skill and switches to its files. A skill opens on itself, so every
 * case about a file starts with the tab the reader would click.
 */
async function openSkillFiles(page: import('@playwright/test').Page, path: string): Promise<void> {
  await openSkill(page, path);
  await page.getByRole('tab', { name: /^files/iu }).click();
}

test('opens the file directly, with nothing standing in front of it', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  // Nothing stands between the reader and the content. Nothing stands in front
  // of it: the session is loopback-only and these are the viewer's own files.
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
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
  // The subject rides between first-strong isolates so an authored
  // directional control cannot reorder the title around it.
  await expect(page).toHaveTitle('\u2068greet\u2069 — Agent Customization Inspector');
});

test('shows the complete authored source', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  const viewer = page.locator('.aci-skill-detail__main .aci-source-viewer');
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
  // The Skill tab's declarations carry the credential too, and a hidden
  // panel's controls are outside the accessibility tree the role query
  // reads — so the no-reveal claim is asserted on each tab in turn, while
  // that tab is the visible one.
  await expect(page.locator('.aci-skill-detail__declarations')).toContainText(FIXTURE_SECRET);
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  await page.getByRole('tab', { name: /^files/iu }).click();
  // Wait for the rendered source itself, not just its container: the editor
  // paints its lines after the viewer mounts, and reading the page before the
  // credential is on screen would make the absence checks below vacuous.
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText(
    FIXTURE_SECRET,
  );
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

test('leads with the skill itself before any file contents', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // The skill is what the page is about: its name, what it is for, the rest of
  // what it declares, and then the instructions it carries.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
  // Every key the file declares, led by the two a reader looks for first.
  await expect(page.locator('.aci-frontmatter-block dt')).toHaveText([
    'name',
    'description',
    'api_key',
    'one_space',
    'two_spaces',
    String.raw` (key with no visible characters: \u0020)`,
    String.raw`  (key with no visible characters: \u0020\u0020)`,
    'deep',
  ]);
  await expect(page.locator('.aci-frontmatter-block dd').nth(1)).toContainText(
    `deploy with ${FIXTURE_SECRET}`,
  );
  await expect(page.locator('.aci-skill-detail__instructions .aci-source-viewer')).toContainText(
    'Run `scripts/run.sh` first.',
  );
});

test('keeps two values that both draw nothing distinguishable', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // A value made only of characters that draw nothing is still published as
  // written; the note is added beside it, never in its place. Replacing both
  // with one phrase would report a value the surface publishes as something
  // shorter than it is (FR-025).
  const values = page.locator('.aci-frontmatter-block dd');
  // `textContent`, not `toHaveText`: the matcher normalizes whitespace, which
  // is exactly the difference under test.
  expect(await values.nth(3).locator('.aci-authored-text').textContent()).toBe(' ');
  expect(await values.nth(4).locator('.aci-authored-text').textContent()).toBe('  ');
  // The note carries the spelled-out form, so the two declarations stay
  // apart in a flat reading too, where whitespace collapses (FR-025).
  await expect(values.nth(3)).toContainText(String.raw`(no visible characters: \u0020)`);
  await expect(values.nth(4)).toContainText(String.raw`(no visible characters: \u0020\u0020)`);

  const keys = page.locator('.aci-frontmatter-block dt');
  expect(await keys.nth(5).textContent()).toBe(
    String.raw` (key with no visible characters: \u0020)`,
  );
  expect(await keys.nth(6).textContent()).toBe(
    String.raw`  (key with no visible characters: \u0020\u0020)`,
  );
});

test('stops indenting past the depth cap without overlapping list markers', async ({ page }) => {
  // Past MAX_INDENTED_DEPTH a nested list adds no padding — kept, the gutter
  // would keep marching a deep block off a narrow viewport (WCAG 1.4.10) — and
  // its marker flows inline instead of being drawn back into a gutter that is
  // no longer there, where it would overlap the first value.
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  const capped = page.locator('.aci-frontmatter-block__nested--capped').first();
  await expect(capped).toBeVisible();
  const styles = await capped.evaluate((element) => {
    const block = element.querySelector(':scope > .aci-frontmatter-block');
    const first = block?.firstElementChild;
    if (!(block instanceof Element) || !(first instanceof Element)) {
      throw new Error('capped nested block not rendered');
    }
    return {
      padding: getComputedStyle(block).paddingInlineStart,
      markerPosition: getComputedStyle(first, '::before').position,
    };
  });
  expect(styles.padding).toBe('0px');
  expect(styles.markerPosition).toBe('static');
});

test('leaves an environment reference as the characters that were written', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  // The host reads no process environment on an inspected file's behalf, so
  // the reference is text and stays text.
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText(
    FIXTURE_ENV_REFERENCE,
  );
});

test('leaves the tab strip where the reader put it while they choose files', async ({ page }) => {
  // Choosing a file is not choosing a tab. The reader opens the files, walks
  // the tree — including back to the entry point, which shows the same file
  // the Skill tab was built from — and the strip stays theirs throughout: a
  // page that answered a tree click by leaving the tree would undo the click
  // that was just made.
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  const filesTab = page.getByRole('tab', { name: /^files/iu });
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });

  await tree.getByRole('link', { name: 'run.sh' }).click();
  await expect(filesTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('echo hi');

  await tree.getByRole('link', { name: 'SKILL.md' }).click();
  await expect(filesTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.aci-skill-detail__main h3')).toHaveText(
    '.agents/skills/greet/SKILL.md',
  );
});

test('shows the addressed definition and nothing about a runtime it cannot see', async ({
  page,
}) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // One definition line — the route's own tool, captioned in words — because
  // the URL addresses one definition; the first of the row's links is the
  // Copilot one in the contracted tool order, and which other products
  // recognize the file is the inventory's matrix. It says nothing about
  // whether a product would load it, because that depends on a runtime this
  // tool never observes — and a sentence about it would take the room the
  // files below need.
  const definition = page.locator('.aci-skill-detail__definition');
  await expect(definition).toHaveCount(1);
  await expect(definition).toHaveText('GitHub Copilot · Skill');
  const detail = (await page.locator('.aci-skill-detail').textContent()) ?? '';
  for (const claim of ['Depends on runtime conditions', 'Selected by a documented rule']) {
    expect(detail).not.toContain(claim);
  }
});

test('says what it recognized in words, never as a contract identifier', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // The definition line is captioned by the product's name, not its token.
  await expect(
    page.locator('.aci-skill-detail__definition').filter({ hasText: 'GitHub Copilot' }),
  ).toHaveCount(1);

  // `textContent` rather than `innerText`, so anything rendered but visually
  // hidden is checked too.
  const rendered = (await page.locator('.aci-skill-detail').textContent()) ?? '';
  // Every contract identifier this page could reach is a dotted lower-case
  // token — `codex.repo.skill`, `codex.behavior.repo.skills`. The fixture's
  // own source contains none, so a match came from the product.
  expect(rendered).not.toMatch(/codex\.[a-z]/u);
  // The condition, status, and evidence vocabularies are hyphenated rather than
  // dotted, so they need their own check.
  for (const token of ['runtime-cwd', 'scope-availability', 'partially-documented']) {
    expect(rendered).not.toContain(token);
  }
});

test('lists the skill’s own directory in the files tab', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  // The heading is the skill's declared name, not a path: what the reader
  // asked about is a customization, and the files are how it is made.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  // A skill is a directory: the entry point and what ships beside it, the
  // binary asset included. Only files are links; `scripts/` is the directory
  // that holds one, not something to open.
  await expect(tree.getByRole('link')).toHaveText(['SKILL.md', 'logo.png', 'run.sh']);
  await expect(tree.locator('.aci-skill-file-tree-branch__directory')).toHaveText(['scripts/']);
  // The nesting is markup, not indentation: the file under `scripts/` is inside
  // that directory's own list item, which is what assistive technology reads as
  // containment.
  await expect(
    tree
      .locator('li', { has: page.locator('.aci-skill-file-tree-branch__directory') })
      .locator('ul'),
  ).toHaveCount(1);
  // Which file is open is stated, not merely styled.
  await expect(tree.getByRole('link', { name: 'SKILL.md' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // The open file is the `SKILL.md`, so the script's contents are not on screen
  // until it is selected.
  expect(await page.locator('main').innerText()).not.toContain('echo hi');
});

test('keeps the file tree in the first view, under the skill itself', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  // The regression this guards: the skill's own sections grew until the
  // directory they introduce was pushed off the screen. Asserting the tree's
  // text alone passed while it sat below the fold, so the assertion is that it
  // is actually in the viewport — which is also what the tabs now keep true,
  // since the two subjects no longer stack.
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  await expect(tree).toBeInViewport();
  await expect(tree.getByRole('link')).toHaveText(['SKILL.md', 'logo.png', 'run.sh']);
  // And the source below it is a real editor rather than a collapsed box: it
  // takes a definite height now that the page around it scrolls.
  const viewerHeight = await page
    .locator('.aci-skill-detail__main .aci-source-viewer')
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(viewerHeight).toBeGreaterThan(200);
});

test('opens a supporting file from the tree and keeps the skill on screen', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
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
  await expect(page.locator('.aci-skill-detail__definition')).toHaveCount(1);
  await expect(page.locator('.aci-skill-detail__main h3')).toHaveText(
    '.agents/skills/greet/scripts/run.sh',
  );
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('echo hi');

  // The tree stays, now marking the file that is open, so the reader can move
  // back through the skill without returning to the inventory.
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  await expect(tree.getByRole('link', { name: 'run.sh' })).toHaveAttribute('aria-current', 'page');
});

test('shows a binary asset as the fact it is, with nothing wrong', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  await page
    .getByRole('navigation', { name: 'Files in this skill' })
    .getByRole('link', { name: 'logo.png' })
    .click();

  // An image is part of what the skill ships. The page states what the read
  // found — binary, so no text — and reports no problem, because there is
  // none: nothing expected an asset to be text.
  const main = page.locator('.aci-skill-detail__main');
  await expect(main.locator('h3')).toHaveText('.agents/skills/greet/logo.png');
  await expect(main).toContainText('Binary');
  await expect(main).toContainText('no source text');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toHaveCount(0);
  const text = await main.innerText();
  // Neither diagnostic message: not `file-unreadable`'s, and not
  // `file-content-binary`'s, which a regression to candidate handling would
  // attach here.
  expect(text).not.toContain('could not');
  expect(text).not.toContain('NUL');
  // And the skill above it is untouched: the asset changes what is shown, not
  // what was recognized.
  await expect(page.locator('.aci-skill-detail__definition')).toHaveCount(1);
});

test('leaves the reader in the tree when they select another file', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  const link = tree.getByRole('link', { name: 'run.sh' });
  await link.focus();
  await page.keyboard.press('Enter');

  // The skill has not changed, so nothing but the source does. A page that took
  // its loading state here would unmount the tree — and the link the reader is
  // standing on with it, dropping focus to the document and sending the next
  // Tab back to the top.
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('echo hi');
  await expect(link).toBeFocused();
  await expect(tree.getByRole('link')).toHaveCount(3);
  await expect(page.locator('.aci-empty')).toHaveCount(0);
});

test('opens the skill from any of its files, not only its entry point', async ({ page }) => {
  // A link a reader kept points at one file; the skill it belongs to is what
  // the page is about, so the same skill opens with that file showing.
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  await page
    .getByRole('navigation', { name: 'Files in this skill' })
    .getByRole('link', { name: 'run.sh' })
    .click();
  // Read the URL only once the router has arrived: `click` resolves before the
  // SPA navigation settles, so reading it straight away captures the URL the
  // reader was on rather than the one they moved to.
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('echo hi');
  const companionUrl = page.url();

  await page.goto(companionUrl);
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
  await expect(page.locator('.aci-skill-detail__definition')).toHaveCount(1);
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('echo hi');
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
        .locator('.aci-skill-detail__main .aci-source-viewer .view-line span span')
        .evaluateAll((spans) => [...new Set(spans.map((span) => span.className))]);
      expect(classes.length).toBeGreaterThan(1);
    }).toPass();
  };

  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('# Greet');
  // Markdown: the heading and the frontmatter fences are not the body text.
  await expectSeveralTokenClasses();

  // A supporting file gets its own language from its own extension — the whole
  // point of registering more than the two the entry points use.
  await page
    .getByRole('navigation', { name: 'Files in this skill' })
    .getByRole('link', { name: 'run.sh' })
    .click();
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('echo hi');
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
  expect(text).toContain('2 supporting file(s)');
});

test('keeps a malformed file readable while its declared name is missing', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/broken/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText(
    '# Broken',
  );
  // A failed extraction is an at-a-glance fact, surfaced through its own
  // Diagnostic beside the open file: the name is missing and the file is
  // fine, and nothing else on the screen would say so (FR-028). One
  // extraction, one record — however many products read the same malformed
  // text, the message renders once.
  await expect(
    page.locator('.aci-skill-detail__main li', {
      hasText: 'This file could not be parsed',
    }),
  ).toHaveCount(1);
});

test('is operable from the keyboard alone', async ({ page }) => {
  await page.goto(host.origin);
  // Reaching the skill link and following it without a pointer is the whole
  // path to the content now — reached in the page's real Tab order, so a
  // link demoted to `tabindex="-1"` fails here where a bare `.focus()`
  // would still land on it.
  const skillLink = page
    .locator('.aci-skill-row__file', { hasText: '.agents/skills/greet/SKILL.md' })
    .locator('.aci-skill-row__definitions a')
    .first();
  expect(await tabUntilFocused(page, skillLink)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('.aci-skill-detail h2')).toBeFocused();

  // The tab strip is one stop in the page tab order and arrows move between
  // its tabs, so the files are reachable without a pointer (QR-004). Being a
  // stop in that order is the claim, so the strip too is reached by Tab from
  // the heading the navigation just focused.
  const skillTab = page.getByRole('tab', { name: /^skill/iu });
  expect(await tabUntilFocused(page, skillTab)).toBe(true);
  await expect(skillTab).toBeFocused();
  await page.keyboard.press('ArrowRight');
  const filesTab = page.getByRole('tab', { name: /^files/iu });
  await expect(filesTab).toBeFocused();
  await expect(filesTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('keeps a link resolving across a rescan through its path identity', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/greet/SKILL.md');
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
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('greet');
});

test('reports a link whose path the current scan does not hold', async ({ page }) => {
  await openSkill(page, '.agents/skills/greet/SKILL.md');
  // The click routes client-side; the URL is captured only once the detail
  // route owns the page, or a slow navigation would bookmark the inventory.
  await page.waitForURL(/\/skills\//u);
  const bookmarkedUrl = page.url();
  // The same URL with the tool segment swapped names a definition this
  // generation does not hold — Claude never recognizes an `.agents` skill —
  // and the page says so instead of guessing at a nearby one.
  await page.goto(bookmarkedUrl.replace(/\/skills\/[a-z]+\//u, '/skills/claude/'));
  await expect(page.locator('.aci-skill-detail')).toContainText(
    'Nothing in the current scan sits at this link',
  );
  // The page's stable live region carries the same statement, so the state
  // change is announced without moving keyboard focus (WCAG 4.1.3).
  await expect(page.locator('.aci-skill-detail .aci-live-region[role="status"]')).toHaveText(
    /Nothing in the current scan sits at this link/u,
  );
  // A title has to be state-appropriate, not only route-appropriate
  // (WCAG 2.4.2): a tab still named after a skill would send a reader back to
  // a page that no longer shows one.
  await expect(page).toHaveTitle(
    '\u2068Link not in this scan\u2069 — Agent Customization Inspector',
  );
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});
