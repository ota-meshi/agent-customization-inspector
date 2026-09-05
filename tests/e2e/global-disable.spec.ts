// T1022: the disable barrier as a reader sees it (FR-042;
// contracts/http-api.md § disable-global).
//
//  - Disabling from the inventory's own summary removes every personal-setup
//    result and leaves a fresh Repository-only page: the Repository results,
//    root label, and generation are exactly what they were.
//  - Nothing purged is restored: a Global detail link that was open resolves
//    to the stale-link page afterwards, never to retained content.
//  - Another tab observes the same disable on its next refresh — the greater
//    epoch purges it and the fresh snapshot carries no Global result.
//  - The consent entry returns to its pre-consent wording, so enabling again
//    is a fresh decision.
//
// The true no-op, the cleanup-only disposition (whose unpublished
// operation-local window no browser flow can hold open), the retained
// post-acceptance failure, and the join are exercised at the contract and
// coordinator layers (tests/contract/http-api-global.test.ts,
// tests/unit/session/coordinator.test.ts): a real host completes the barrier
// in milliseconds, so a browser cannot deterministically observe those
// windows.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { waitForInventory } from './repository-status';

/** The repository the session is launched against. */
let repository: string;

/** The base holding the four member homes and the HOME the fourth derives from. */
let base: string;

let host: LaunchedHost;

test.beforeEach(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-global-disable-repo-'));
  writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');

  base = mkdtempSync(join(tmpdir(), 'aci-global-disable-homes-'));
  const home = join(base, 'home');
  const homes = {
    copilot: join(base, 'copilot-home'),
    claude: join(base, 'claude-home'),
    codex: join(base, 'codex-home'),
    agents: join(home, '.agents'),
  };
  mkdirSync(join(homes.claude, 'skills', 'deploy'), { recursive: true });
  writeFileSync(
    join(homes.claude, 'skills', 'deploy', 'SKILL.md'),
    '---\nname: deploy\n---\n\nThe personal deploy skill.\n',
    'utf8',
  );
  mkdirSync(homes.copilot, { recursive: true });
  mkdirSync(homes.codex, { recursive: true });
  writeFileSync(
    join(homes.codex, 'config.toml'),
    '[mcp_servers.docs]\ncommand = "docs-server"\n',
    'utf8',
  );
  mkdirSync(homes.agents, { recursive: true });
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

test.afterEach(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(base, { recursive: true, force: true });
});

test('removes every personal-setup result and leaves the Repository page fresh', async ({
  page,
}) => {
  await page.goto(new URL('/repository', host.origin).href);
  const main = page.locator('main');
  const rootLabel = await main.locator('.aci-repository-page__display-root').first().textContent();
  await page.goto(host.origin);
  await expect(page.getByRole('link', { name: 'Personal setup' })).not.toContainText(
    'Not inspected',
  );

  // A narrowing before the disable: the fresh default inventory the barrier
  // leaves behind must not restore it from the URL (FR-027, data-model.md
  // § RecoveryViewState — default filters).
  await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('skills');
  await expect(page).toHaveURL(/q=skills/u);
  // Disabling is offered on the personal setup's own surface, which the rail
  // reaches (FR-030).
  await page.getByRole('link', { name: 'Personal setup' }).click();
  await page.getByRole('button', { name: 'Disable personal inspection' }).click();
  // The terminal fresh snapshot arrives without a manual refresh: this surface
  // is back to proposing, and no member control is left behind.
  await expect(page.getByRole('button', { name: 'Work out the directories' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Rescan: /u })).toHaveCount(0);
  // The narrowing went with the purged session (FR-027): the search is client
  // data — an authored path fragment typed against the files that session
  // held — so the bar comes back empty rather than carrying it into the next
  // one, whichever route the reader was on when the barrier ran.
  await expect(page.getByRole('searchbox', { name: 'Search names and paths' })).toHaveValue('');
  await page.goto(host.origin);
  await waitForInventory(page);
  await expect(page.getByRole('link', { name: 'Personal setup' })).toContainText('Not inspected');
  await expect(page).not.toHaveURL(/q=skills/u);
  // The Repository sequence rode through untouched: same root label, same
  // committed generation, same rows.
  await page.goto(new URL('/repository', host.origin).href);
  expect(await main.locator('.aci-repository-page__display-root').first().textContent()).toBe(
    rootLabel,
  );
  await expect(main.locator('dd').filter({ hasText: /^1$/u }).first()).toBeVisible();
  // Back to the list, where the rows and the rail are.
  await page.getByRole('link', { name: /Back to /u }).click();
  await page.getByRole('tab', { name: /Instructions/u }).click();
  await expect(page.getByRole('tabpanel')).toContainText('AGENTS.md');
  // The rail's entry is the pre-consent offer again (FR-030).
  await expect(page.getByRole('link', { name: 'Personal setup' })).toContainText('Not inspected');
});

test('restores nothing that was purged: an old Global link resolves to no scan', async ({
  page,
}) => {
  await page.goto(new URL('/skills/detail/global-claude/skills/deploy/SKILL.md', host.origin).href);
  const main = page.locator('main');
  await expect(main).toContainText('The personal deploy skill.');
  await page.goto(new URL('/global-consent', host.origin).href);
  await page.getByRole('button', { name: 'Disable personal inspection' }).click();
  await expect(page.getByRole('button', { name: 'Work out the directories' })).toBeVisible();
  await page.goto(new URL('/skills/detail/global-claude/skills/deploy/SKILL.md', host.origin).href);
  await expect(main).toContainText('Nothing in the current scan sits at this link’s path.');
  await expect(main).not.toContainText('The personal deploy skill.');
});

test('drops a narrowing the reader left before a reload, on Back after a disable', async ({
  page,
}) => {
  // The purge stamps the inventory's history entry so a later Back can tell a
  // pre-purge narrowing from the reader's own ask. A reload throws the
  // stamp's issuer away: the entry left behind carries a token from a
  // document that no longer exists, and Back into it after a disable used to
  // land on the narrowing the purge exists to drop (FR-027, data-model.md
  // § RecoveryViewState).
  await page.goto(host.origin);
  const main = page.locator('main');
  await page.getByRole('tab', { name: /Instructions/u }).click();
  await expect(page).toHaveURL(/kind=instructions/u);

  // Into a file, then a reload: from here on, the document running the
  // disable is not the one that stamped the inventory entry behind it.
  await page.getByRole('tabpanel').getByRole('link').first().click();
  await expect(page).not.toHaveURL(/kind=instructions/u);
  await page.reload();

  // A fresh inventory entry in this document, and the disable there.
  await main.getByRole('link', { name: /Back to /u }).click();
  await expect(page).toHaveURL(/kind=instructions/u);
  // The disable is on the personal setup's own surface, reached from the rail,
  // so the entry it runs from is that route rather than the inventory's.
  await page.getByRole('link', { name: 'Personal setup' }).click();
  await page.getByRole('button', { name: 'Disable personal inspection' }).click();
  await expect(page.getByRole('button', { name: 'Work out the directories' })).toBeVisible();

  // Back through the consent route and the file into the entry the earlier
  // document stamped.
  await page.goBack();
  await expect(page).toHaveURL(/kind=instructions/u);
  await page.goBack();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();
  await page.goBack();
  await expect(page).not.toHaveURL(/kind=instructions/u);
});

test('a second tab observes the disable on its next refresh', async ({ browser }) => {
  const observer = await (await browser.newContext()).newPage();
  await observer.goto(host.origin);
  await expect(observer.locator('main')).toContainText('Your personal setup');

  const actor = await (await browser.newContext()).newPage();
  await actor.goto(new URL('/global-consent', host.origin).href);
  await actor.getByRole('button', { name: 'Disable personal inspection' }).click();
  await expect(actor.getByRole('button', { name: 'Work out the directories' })).toBeVisible();

  // Nothing on the observer updates by itself; its next explicit refresh
  // observes the greater epoch, purges, and renders the fresh
  // Repository-only snapshot.
  await observer.getByRole('button', { name: 'Refresh status' }).click();
  await expect(observer.getByRole('link', { name: 'Personal setup' })).toContainText(
    'Not inspected',
  );
  // The Repository sequence rode through untouched, stated where that Source's
  // own facts are (FR-002, FR-030).
  await observer.goto(new URL('/repository', host.origin).href);
  await expect(observer.locator('main')).toContainText('Selected root');
  await observer.context().close();
  await actor.context().close();
});
