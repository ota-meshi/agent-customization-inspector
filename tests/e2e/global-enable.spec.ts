// T997: the selector-free fixed-four enablement, as a reader sees it
// (FR-013 through FR-018, FR-030, FR-045).
//
// One confirmation — here the `--inspect-personal-setup` flag, which is the
// same confirmation the consent page's one checkbox states — admits all four
// members with no per-member selection step, runs one shared batch, and
// publishes every admitted Source together in one Global generation:
//
//  - All four members appear simultaneously on the inventory page, each a
//    separately identified Source with its own escaped, inert boundary label,
//    beside the untouched Repository results.
//  - The Source-family filter narrows the inventory to one family and back.
//  - A skill name with copies in two Sources is one row of two family
//    blocks, and a comparison stays inside one family: a block holding two
//    of its family's copies offers its own entry — two consented homes'
//    same-spelled copies compare as two files, each side stating its own
//    directory — while a row whose blocks hold one copy each offers none
//    (T1140, FR-030; contracts/http-api.md § Host requirements #5).
//  - A credential literal in a consented home's file is served exactly as
//    authored, with no mask and no verdict (FR-025, FR-027).
import { rm } from 'node:fs/promises';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The repository the session is launched against. */
let repository: string;

/** The base holding the four member homes and the HOME the fourth derives from. */
let base: string;

/** The secret literal a consented home's file carries, shown exactly (FR-025). */
const HOME_SECRET = 'sk-global-enable-fixture-credential';

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-global-enable-repo-'));
  writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');
  // The repository's copy of the `deploy` skill: with the Claude home's copy
  // below, the one name has one copy in each family, so the row splits into
  // two one-copy blocks and — a pair never spanning two families — offers no
  // comparison entry (FR-011, FR-030).
  mkdirSync(join(repository, '.claude', 'skills', 'deploy'), { recursive: true });
  // A repository settings document, so the settings list holds both families
  // and its family sections have two headings to show (T1140).
  writeFileSync(
    join(repository, '.claude', 'settings.json'),
    '{\n  "permissions": { "allow": ["Bash(ls:*)"] }\n}\n',
    'utf8',
  );
  writeFileSync(
    join(repository, '.claude', 'skills', 'deploy', 'SKILL.md'),
    '---\nname: deploy\n---\n\nThe repository copy.\n',
    'utf8',
  );
  // Two repository copies of the `relay` name: with the two personal copies
  // below, each of the row's family blocks holds a pair of its own, so the
  // row offers one comparison entry per block (T1140, FR-030).
  for (const [directory, body] of [
    ['.claude', 'The repository relay copy.'],
    ['.agents', 'The shared-directory relay copy.'],
  ] as const) {
    mkdirSync(join(repository, directory, 'skills', 'relay'), { recursive: true });
    writeFileSync(
      join(repository, directory, 'skills', 'relay', 'SKILL.md'),
      `---\nname: relay\n---\n\n${body}\n`,
      'utf8',
    );
  }

  base = mkdtempSync(join(tmpdir(), 'aci-global-enable-homes-'));
  const home = join(base, 'home');
  const homes = {
    copilot: join(base, 'copilot-home'),
    claude: join(base, 'claude-home'),
    codex: join(base, 'codex-home'),
    agents: join(home, '.agents'),
  } as const;
  // The Claude home's copy of the repository's skill name.
  mkdirSync(join(homes.claude, 'skills', 'deploy'), { recursive: true });
  writeFileSync(
    join(homes.claude, 'skills', 'deploy', 'SKILL.md'),
    '---\nname: deploy\n---\n\nThe personal copy.\n',
    'utf8',
  );
  // The two personal copies of the `relay` name; see the repository pair above.
  for (const [root, body] of [
    [homes.claude, 'The claude-home relay copy.'],
    [homes.agents, 'The shared-home relay copy.'],
  ] as const) {
    mkdirSync(join(root, 'skills', 'relay'), { recursive: true });
    writeFileSync(
      join(root, 'skills', 'relay', 'SKILL.md'),
      `---\nname: relay\n---\n\n${body}\n`,
      'utf8',
    );
  }
  // One name, one path spelling, two members: the Copilot home and the shared
  // agent home both admit `skills/common/SKILL.md`, and both declare the same
  // name, so the row's pair is two same-spelled identities (FR-030).
  for (const [root, body] of [
    [homes.copilot, 'The copilot-home copy.'],
    [homes.agents, 'The shared-home copy.'],
  ] as const) {
    mkdirSync(join(root, 'skills', 'common'), { recursive: true });
    writeFileSync(
      join(root, 'skills', 'common', 'SKILL.md'),
      `---\nname: common\n---\n\n${body}\n`,
      'utf8',
    );
  }
  // The Codex home's config, carrying a credential literal the detail must
  // serve exactly as authored (FR-025, FR-027).
  mkdirSync(homes.codex, { recursive: true });
  writeFileSync(
    join(homes.codex, 'config.toml'),
    `[mcp_servers.docs]\ncommand = "docs-server"\nenv = { API_KEY = "${HOME_SECRET}" }\n`,
    'utf8',
  );
  host = await launchHost(
    repository,
    {
      COPILOT_HOME: homes.copilot,
      CLAUDE_CONFIG_DIR: homes.claude,
      CODEX_HOME: homes.codex,
      HOME: home,
    },
    ['--inspect-personal-setup'],
  );
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(base, { recursive: true, force: true });
});

test('publishes all four members together, each its own labelled Source', async ({ page }) => {
  await page.goto(host.origin);
  const main = page.locator('main');
  // The rail says from the list that the personal setup was read, and the
  // members themselves are on that family's own surface: their roots, statuses,
  // and rescans are facts about those Sources rather than an inventory of files
  // (FR-030).
  await expect(page.getByRole('link', { name: 'Personal setup' })).toContainText('Inspected');
  await page.getByRole('link', { name: 'Personal setup' }).click();
  // The one confirmation published every member simultaneously: the panel lists
  // all four, each with its escaped boundary label — a presentation, never a
  // path — and its own status (FR-013, FR-045).
  for (const member of ['Copilot home', 'Claude home', 'Codex home']) {
    await expect(main).toContainText(member);
  }
  await expect(main).toContainText(
    'These labels are escaped presentations of the consented directories.',
  );
  // The Repository results are still there beside them, unchanged.
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Instructions/u }).click();
  await expect(page.getByRole('tabpanel')).toContainText('AGENTS.md');
});

test('narrows the inventory by Source family and back', async ({ page }) => {
  await page.goto(new URL('/?kind=skill', host.origin).href);
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('deploy');
  await expect(panel).toContainText('common');
  // The Source filter: the repository alone drops the rows only the
  // consented homes publish.
  await page.getByLabel('Source', { exact: true }).selectOption({ label: 'Repository' });
  await expect(panel).toContainText('deploy');
  await expect(panel).not.toContainText('common');
  await page.getByLabel('Source', { exact: true }).selectOption({ label: 'All sources' });
  await expect(panel).toContainText('common');
});

test('offers no comparison entry on a row whose blocks hold one copy each', async ({ page }) => {
  await page.goto(new URL('/?kind=skill', host.origin).href);
  const panel = page.getByRole('tabpanel');
  const deployRow = panel.locator('.aci-item').filter({ hasText: 'deploy' });
  // The row's two copies still render as two family blocks, each headed by
  // the family's own words (T1140, FR-030).
  await expect(deployRow.locator('.aci-family-heading')).toHaveText([
    'Repository',
    'Your personal setup',
  ]);
  // A comparison stays inside one family (contracts/http-api.md § Host
  // requirements #5): with one copy in each block there is nothing either
  // block can pair, so the row offers no entry at all.
  await expect(deployRow.getByRole('link', { name: /^Compare this skill's files/u })).toHaveCount(
    0,
  );
});

test('draws no block for a family the Source filter emptied', async ({ page }) => {
  await page.goto(new URL('/?kind=skill', host.origin).href);
  const panel = page.getByRole('tabpanel');
  const deployRow = panel.locator('.aci-item').filter({ hasText: 'deploy' });
  await expect(deployRow.locator('.aci-family-heading')).toHaveText([
    'Repository',
    'Your personal setup',
  ]);

  // Narrowing to one family leaves the row one copy, so the family it lost is
  // not a block any more: a block kept for its entry's sake would stand as a
  // family name with no file under it, over a Compare link opening the files
  // the filter has just hidden. What the row publishes and what the screen
  // shows are two questions, and the heading and the link follow the screen
  // (`SourceFamilyBlocks.vue`, FR-030).
  await page.getByLabel('Source', { exact: true }).selectOption({ label: 'Your personal setup' });
  await expect(deployRow.locator('.aci-source-family-blocks > li')).toHaveCount(1);
  // One family left, so the surviving block heads nothing either: the heading
  // separates families, and there is no second family to separate it from.
  await expect(panel.locator('.aci-family-heading')).toHaveCount(0);
  await expect(panel.getByRole('link', { name: /\(Repository\)$/u })).toHaveCount(0);

  // And the whole list comes back with the filter, so nothing was dropped from
  // what the row publishes — only from what this narrowing shows.
  await page.getByLabel('Source', { exact: true }).selectOption({ label: 'All sources' });
  await expect(deployRow.locator('.aci-family-heading')).toHaveText([
    'Repository',
    'Your personal setup',
  ]);
});

test('compares two same-spelled copies as two files, each naming its directory (T1140)', async ({
  page,
}) => {
  await page.goto(new URL('/?kind=skill', host.origin).href);
  const panel = page.getByRole('tabpanel');
  const commonRow = panel.locator('.aci-item').filter({ hasText: 'common' });
  // The row itself already names each copy's home, because its family holds
  // more than one Source and the paths alone are the same spelling. The home's
  // name rather than its root: the roots are stated once on that family's own
  // surface, and a root per row was the second line the compressed row exists
  // to remove (FR-002, FR-030).
  await expect(commonRow.locator('.aci-source-home')).toHaveCount(2);
  await commonRow.getByRole('link', { name: /^Compare this skill's files/u }).click();
  const main = page.locator('main');
  // Two files, one spelling: both sides render, told apart by their own
  // members' directories in the facts lines (FR-030).
  await expect(main).toContainText('The copilot-home copy.');
  await expect(main).toContainText('The shared-home copy.');
});

test('offers one comparison entry per family block when both blocks pair (T1140)', async ({
  page,
}) => {
  await page.goto(new URL('/?kind=skill', host.origin).href);
  const relayRow = page.getByRole('tabpanel').locator('.aci-item').filter({ hasText: 'relay' });
  // Each family block holds two of the row's copies, so each offers its own
  // entry — and with two entries on one row, each accessible name says which
  // family's pair it opens (WCAG 2.4.6).
  await expect(relayRow.getByRole('link', { name: /^Compare this skill's files/u })).toHaveCount(2);
  await expect(
    relayRow.getByRole('link', {
      name: "Compare this skill's files: relay (Repository)",
      exact: true,
    }),
  ).toBeVisible();
  // The personal block's entry opens that family's own pair, not a
  // cross-family one.
  await relayRow
    .getByRole('link', { name: "Compare this skill's files: relay (Your personal setup)" })
    .click();
  const main = page.locator('main');
  await expect(main).toContainText('The claude-home relay copy.');
  await expect(main).toContainText('The shared-home relay copy.');
  await expect(main).not.toContainText('The repository relay copy.');
});

test('groups a file-unit kind into one section per family', async ({ page }) => {
  // The settings list holds the repository's documents and every consented
  // home's, so the list itself splits into family sections with the same
  // headings the rows' own blocks carry (T1140, FR-030).
  await page.goto(new URL('/?kind=settings%2Fconfig', host.origin).href);
  const panel = page.getByRole('tabpanel');
  await expect(panel.locator('.aci-family-heading')).toHaveText([
    'Repository',
    'Your personal setup',
  ]);
  // The home's document sits in the personal section beside its directory.
  const personal = panel.locator('li').filter({
    has: page.locator('.aci-family-heading', { hasText: 'Your personal setup' }),
  });
  await expect(personal.locator('.aci-path', { hasText: 'config.toml' }).first()).toBeVisible();
});

test('serves a home credential exactly as authored, with no mask or verdict', async ({ page }) => {
  await page.goto(
    new URL('/settings-and-configuration/detail/global-codex/config.toml', host.origin).href,
  );
  const main = page.locator('main');
  await expect(main).toContainText(HOME_SECRET);
  await expect(main).not.toContainText('redact');
  await expect(main).not.toContainText('****');
});

test('states the Source family and directory on a Global detail (FR-007)', async ({ page }) => {
  // A directly opened Global detail must say which place its file came from:
  // the family name on the recognition line, and — the personal family holds
  // several Sources — the consented directory it was read from, as an
  // escaped presentation rather than anything openable (FR-002).
  await page.goto(
    new URL('/settings-and-configuration/detail/global-codex/config.toml', host.origin).href,
  );
  const main = page.locator('main');
  await expect(main).toContainText('Your personal setup');
  await expect(main.locator('.aci-settings-detail__root')).toContainText('codex-home');
  // The same two facts on a name-keyed kind's page.
  await page.goto(new URL('/skills/detail/global-claude/skills/deploy/SKILL.md', host.origin).href);
  await expect(main).toContainText('Your personal setup');
  await expect(main.locator('.aci-skill-detail__root')).toContainText('claude-home');
});
