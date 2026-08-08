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

/** Opens the named skill's detail route from the inventory. */
async function openSkill(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  await page.getByRole('link', { name: path }).click();
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
  await openSkillFiles(page, '.claude/skills/greet/SKILL.md');
  // The complete authored source, credential and environment reference
  // included, with nothing standing in front of it (FR-026, FR-027).
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
  // The two a reader needs first: which skill this is, and what it is for.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('claude-greet');
  // Every key the file declares, by the key the file wrote, led by the two a
  // reader looks for first however the file ordered them.
  const declarations = page.locator('.aci-skill-detail__declarations > .aci-frontmatter-block');
  await expect(declarations.locator('> dt')).toHaveText([
    'name',
    'description',
    'agent',
    'context',
    'api_key',
    'allowed-tools',
    'hooks',
  ]);
  await expect(declarations.locator('> dd.aci-frontmatter-block__value')).toHaveText([
    'claude-greet',
    `deploy with ${FIXTURE_SECRET} and ${FIXTURE_ENV_REFERENCE}`,
    'reviewer',
    'fork',
    FIXTURE_SECRET,
  ]);
  // The nested declarations are read out too, by the keys the file wrote. A
  // mapping's keys are the terms of a description list; a list's items are not
  // terms at all, so its markers are asserted separately below.
  await expect(
    page.locator('.aci-skill-detail__declarations dl.aci-frontmatter-block dt'),
  ).toContainText([
    'name',
    'description',
    'agent',
    'context',
    'api_key',
    'allowed-tools',
    'hooks',
    'PostToolUse',
    'matcher',
    'hooks',
    'command',
  ]);
  // A sequence is an ordered list, so each item is a list item rather than a
  // description of the term above it.
  const lists = page.locator('.aci-skill-detail__declarations ol.aci-frontmatter-block');
  await expect(lists.first()).toHaveAttribute('role', 'list');
  await expect(lists.first().locator('> li')).toHaveCount(2);
});

test('draws every declared value in one column, however deep it is', async ({ page }) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  const geometry = await page.locator('.aci-skill-detail__declarations').evaluate((region) => ({
    valueLefts: [...region.querySelectorAll('.aci-frontmatter-block__value')].map(
      (value) => value.getBoundingClientRect().left,
    ),
    drift: [...region.querySelectorAll('.aci-frontmatter-block__key')].map((key) => {
      const value = key.nextElementSibling;
      if (!value?.classList.contains('aci-frontmatter-block__value')) {
        return 0;
      }
      // A zero-height inline-block sits on the baseline of the line it joins,
      // so its bottom edge is that baseline whatever font the line is set in.
      // The bottom of the text's own rectangle is not: it carries the font's
      // descent, which differs between the key and the larger value even when
      // the two are aligned exactly.
      const baselineOf = (element: Element): number => {
        const probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0';
        element.prepend(probe);
        const bottom = probe.getBoundingClientRect().bottom;
        probe.remove();
        return bottom;
      };
      return Math.abs(baselineOf(key) - baselineOf(value.firstElementChild ?? value));
    }),
    offscreen: [...region.querySelectorAll('.aci-frontmatter-block__key')].filter(
      (key) => key.getBoundingClientRect().top < -1000,
    ).length,
  }));
  // One value column for the whole tree. Each block draws in the tracks the
  // root declared, so a value four levels down starts where a top-level value
  // starts; a block with tracks of its own would give the reader one value
  // column per level to follow.
  expect(geometry.valueLefts.length).toBeGreaterThan(5);
  expect(new Set(geometry.valueLefts).size).toBe(1);
  // A key and its value are one statement, so they sit on one line. The key is
  // set smaller than the value it labels, so anything but a shared baseline
  // leaves it riding above the value — visible on every row at once, which
  // reads as the column being crooked rather than as the type sizes differing.
  for (const drift of geometry.drift) {
    expect(drift).toBeLessThan(1);
  }
  // The baseline is asked for per item, never as a block's `align-items`: a
  // nested block is a grid item and it is a subgrid, and baseline-aligning one
  // resolves to an offset near the minimum layout unit — the block lands
  // millions of pixels above the viewport and reads as empty space, with every
  // assertion above still passing.
  expect(geometry.offscreen).toBe(0);
});

test('opens a nested skill as itself, not as the skill whose census lists it', async ({ page }) => {
  await openSkill(page, '.claude/skills/outer/sub/.claude/skills/inner/SKILL.md');
  // The inner file is the outer skill's companion as well as its own entry
  // point. Resolving the owner by whichever test matches first would open the
  // outer skill, and the reader would have no way to reach the inner one.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('zzz-inner');
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
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('zzz-inner');
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

test('shows what was recognized and nothing about a runtime it cannot see', async ({ page }) => {
  await openSkill(page, '.claude/skills/greet/SKILL.md');
  // The recognition says what the file is. It says nothing about whether
  // Claude Code would load it, because that depends on a runtime this tool
  // never observes — and a sentence about it would take the room the files
  // below need.
  await expect(page.locator('.aci-recognition-summary')).toContainText('Claude Code');
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
  await expect(page.locator('.aci-recognition-summary')).toContainText(
    'One recognition could not be parsed',
  );
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openSkillFiles(page, '.claude/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('replaces a link a rescan invalidated with a recoverable state', async ({ page }) => {
  await openSkillFiles(page, '.claude/skills/greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toBeVisible();
  const staleUrl = page.url();

  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  // Nothing polls, so the committed result arrives on an explicit refresh.
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation', {
      timeout: 1_000,
    });
  }).toPass();

  // Every file gets a new identity when a scan commits, so the earlier URL
  // names nothing — and says so instead of failing or showing stale content.
  await page.goto(staleUrl);
  await expect(page.locator('.aci-skill-detail')).toContainText(
    'does not name a file in the current scan',
  );
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('leaves the Codex detail beside it unchanged', async ({ page }) => {
  await openSkillFiles(page, '.agents/skills/codex-greet/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('codex-greet');
  await expect(page.locator('.aci-recognition-summary')).toContainText('OpenAI Codex');
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText('# Codex');
});
