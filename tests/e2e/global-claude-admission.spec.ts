// T967: the Claude member of the fixed-three confirmation, as a reader sees it
// (FR-013, FR-014, FR-016, FR-018, FR-023).
//
// Claude's production port is bound in this slice, so this suite launches the
// packaged CLI against real fixture homes and asserts what the host then
// actually read. What must hold after one confirmation:
//
//  - Claude and Codex are both inspected, from one shared batch and one Global
//    generation — two Sources published together, never one job per tool.
//  - Exactly the one `CLAUDE.md` from the consented home, with the settings,
//    skills, commands, agents, output styles, installed plugin, memories, and
//    session history beside it left alone.
//  - The Repository results are still there, unchanged.
//  - Nothing in any home was modified, and no credential from any of them
//    reaches a surface.
import { rm } from 'node:fs/promises';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  GLOBAL_HOME_ENVIRONMENT_REFERENCES,
  GLOBAL_HOME_SECRETS,
  buildGlobalHomeFixture,
  observeTree,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The repository the session is launched against. */
let repository: string;

/** The three Global homes the environment points at. */
let homes: GlobalHomeFixture;

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-claude-admission-repo-'));
  writeFileSync(join(repository, 'CLAUDE.md'), '# repository instructions\n', 'utf8');
  mkdirSync(join(repository, '.claude/skills/deploy'), { recursive: true });
  writeFileSync(
    join(repository, '.claude/skills/deploy/SKILL.md'),
    '---\nname: deploy\ndescription: Ship it.\n---\n\nBody.\n',
    'utf8',
  );
  homes = buildGlobalHomeFixture();
  host = await launchHost(repository, homes.environment, ['--inspect-personal-setup']);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(homes.base, { recursive: true, force: true });
});

/** The instruction rows of one Source, by the address their links carry. */
async function instructionAddresses(page: Page): Promise<string[]> {
  await page.getByRole('tab', { name: /^Instructions/u }).click();
  return page
    .getByRole('tabpanel')
    .locator('.aci-instruction-row__owner a')
    .evaluateAll((anchors) =>
      anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
    );
}

test('inspects Claude and Codex from one confirmation, each as its own Source', async ({
  page,
}) => {
  await page.goto(host.origin);
  const main = page.locator('main');

  // Both consented homes are stated, each by its own escaped root, under the
  // one panel the personal setup gets.
  await expect(main).toContainText('Your personal setup');
  await expect(main).toContainText(homes.homes.claude);
  await expect(main).toContainText(homes.homes.codex);

  // And the consented instruction files are on the inventory, each under its
  // own Source, beside the repository's own instruction file — Copilot's
  // member publishes its personal instruction set too (FR-015).
  expect((await instructionAddresses(page)).toSorted()).toEqual(
    [
      '/instructions/detail/global-claude/CLAUDE.md',
      '/instructions/detail/global-codex/AGENTS.override.md',
      '/instructions/detail/repository/CLAUDE.md',
      '/instructions/detail/global-copilot/copilot-instructions.md',
      ...homes.expectedCandidatePaths.copilot
        // The broken-link candidate is diagnostic-only (`file-unreadable`),
        // so it publishes no instruction row and no address here (FR-024).
        .filter(
          (path) => path.startsWith('instructions/') && !path.endsWith('broken.instructions.md'),
        )
        .map((path) => `/instructions/detail/global-copilot/${path}`),
    ].toSorted(),
  );

  // Both homes' files are one block, so the personal setup offers its own
  // comparison: the two are one family, and comparing what each home says is
  // what grouping them together is for (FR-011).
  const personalSetup = page
    .getByRole('tabpanel')
    .locator('.aci-source-family-blocks > li')
    .filter({ hasText: 'Your personal setup' });
  await expect(
    personalSetup.getByRole('link', { name: /^Compare this range's files/u }),
  ).toHaveAttribute('href', /^\/instructions\/compare\/global\?/u);

  // The Repository results are still there: a Global commit advances its own
  // sequence and leaves the Repository generation alone (FR-042).
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await expect(page.getByRole('tabpanel')).toContainText('.claude/skills/deploy/SKILL.md');
});

test('states each tool’s own outcome from the one shared batch', async ({ page }) => {
  await page.goto(new URL('/global-consent', host.origin).toString());
  const main = page.locator('main');
  await expect(main).toContainText('What is inspected');
  // All four members were read: every fixture root is a readable directory,
  // and each states its own outcome from the one shared batch (FR-014).
  await expect(main).toContainText('GitHub Copilot — Inspected');
  await expect(main).toContainText('Claude Code — Inspected');
  await expect(main).toContainText('OpenAI Codex — Inspected');
  await expect(main).toContainText('Shared agent home — Inspected');
  const outcomes = await page.locator('.aci-global-consent-page__outcomes li').allInnerTexts();
  expect(outcomes).toHaveLength(4);
  await expect(main).toContainText('4 of these directories were read');
});

test('publishes the one CLAUDE.md instruction row and nothing beside it', async ({ page }) => {
  await page.goto(host.origin);
  const claudeRows = (await instructionAddresses(page)).filter((address) =>
    address.startsWith('/instructions/detail/global-claude/'),
  );
  // One instruction file: the contract admits `CLAUDE.md` alone as the
  // member's instruction row, and `CLAUDE.local.md` sits beside it in the
  // fixture home admitted by nothing (FR-016).
  expect(claudeRows).toEqual(['/instructions/detail/global-claude/CLAUDE.md']);
});

test('publishes every contracted Claude kind from the one confirmation (T1138)', async ({
  page,
}) => {
  await page.goto(host.origin);
  const panel = page.getByRole('tabpanel');

  // The personal skill, under its own directory-derived command name.
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await expect(panel).toContainText('deploy');

  // The namespaced personal command: subdirectories form the name.
  await page.getByRole('tab', { name: /^Prompt/u }).click();
  await expect(panel).toContainText('review:security');

  // The flat rule file; the nested subdirectory stays a near miss.
  await page.getByRole('tab', { name: /^Rule/u }).click();
  await expect(panel).toContainText('rules/style.md');
  await expect(panel).not.toContainText('rules/nested/deep.md');

  // Both personal agents: the user selector is recursive.
  await page.getByRole('tab', { name: /^Agent/u }).click();
  await expect(panel).toContainText('reviewer');
  await expect(panel).toContainText('research-helper');

  // The settings document, its permission policy, and its contained hooks:
  // three rules over one candidate, read once.
  await page.getByRole('tab', { name: /^Settings/u }).click();
  await expect(panel).toContainText('settings.json');
  await page.getByRole('tab', { name: /^Permissions/u }).click();
  await expect(panel).toContainText('settings.json');
  await page.getByRole('tab', { name: /^Hook/u }).click();
  await expect(panel).toContainText('PreToolUse');

  // The personal output style, under its authored name.
  await page.getByRole('tab', { name: /^Output style/u }).click();
  await expect(panel).toContainText('Terse');

  // Nothing the exclusion names reaches any inventory surface (FR-018): not
  // the terminal-UI preferences, the reserved download tree, the workflow
  // scripts, or the memories.
  const text = await page.locator('main').innerText();
  for (const excluded of [
    'keybindings.json',
    'themes/dark.json',
    'skills/synced',
    'workflows/release.js',
    'agent-memory',
    'history.jsonl',
  ]) {
    expect(text, excluded).not.toContain(excluded);
  }
});

test('shows the home’s file whole, and no credential from any home', async ({ page }) => {
  await page.goto(new URL('/instructions/detail/global-claude/CLAUDE.md', host.origin).toString());
  const main = page.locator('main');
  // The authored file as written, environment reference included and
  // unresolved (FR-025, FR-026).
  await expect(main).toContainText('Answer in the language the question was asked in.');
  await expect(main).toContainText(GLOBAL_HOME_ENVIRONMENT_REFERENCES.claude);
  // And no credential-shaped literal from any home, because no file holding
  // one was read.
  const text = await main.innerText();
  for (const secret of Object.values(GLOBAL_HOME_SECRETS)) {
    expect(text).not.toContain(secret);
  }
});

test('leaves every byte of all four homes exactly as it found them', async ({ page }) => {
  // Its own launch and its own observation, so what is compared spans the whole
  // session rather than one page: the read happened before this suite's first
  // navigation, and a mutation would already be on disk.
  const before = observeTree(homes.base);
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Instructions/u }).click();
  await page.goto(new URL('/instructions/detail/global-claude/CLAUDE.md', host.origin).toString());
  const after = observeTree(homes.base);
  expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
  for (const [path, observed] of after) {
    expect(observed, path).toEqual(before.get(path));
  }
});
