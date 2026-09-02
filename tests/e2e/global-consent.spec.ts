// T1022: the documented Global-consent target end to end (FR-013, FR-042;
// quickstart.md § 4) — the page a reader decides on, driven through the whole
// lifecycle it owns: preview, one all-members confirmation, the committed
// statuses with their one manual refresh, and the disable that takes it all
// away again.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The repository the session is launched against. */
let repository: string;

/** The base holding the four member homes and the HOME the fourth derives from. */
let base: string;

let host: LaunchedHost;

test.beforeEach(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-global-consent-repo-'));
  writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');

  base = mkdtempSync(join(tmpdir(), 'aci-global-consent-homes-'));
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
  mkdirSync(homes.agents, { recursive: true });
  // No --inspect-personal-setup: consenting is what this suite drives.
  host = await launchHost(repository, {
    COPILOT_HOME: homes.copilot,
    CLAUDE_CONFIG_DIR: homes.claude,
    CODEX_HOME: homes.codex,
    HOME: home,
  });
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(base, { recursive: true, force: true });
});

test('carries one consent from preview through enable, refresh, and disable', async ({ page }) => {
  await page.goto(new URL('/global-consent', host.origin).href);
  const main = page.locator('main');
  // A fresh session holds no preview, so the page offers to work one out —
  // arriving reads nothing, and the offer says so. The one all-members
  // action appears only once the captured preview is on screen and behind
  // the explicit checkbox.
  await expect(main).toContainText('Inspect your personal setup');
  const offer = page.getByRole('button', { name: 'Work out the directories' });
  if (await offer.isVisible()) {
    await offer.click();
    // The pressed button unmounts with its branch, so focus lands on the
    // page heading rather than silently falling to the body.
    await expect(page.getByRole('heading', { name: 'Inspect your personal setup' })).toBeFocused();
  }
  await expect(main).toContainText('An absolute path, so this tool can be inspected');
  await expect(page.getByRole('button', { name: 'Inspect these directories' })).toHaveCount(0);
  await page
    .getByLabel('I have read what would be inspected and I want the inspector to read these files')
    .check();
  await page.getByRole('button', { name: 'Inspect these directories' }).click();
  // The confirmation button unmounts with its branch on success, so focus
  // lands on the page heading rather than falling to the body.
  await expect(page.getByRole('heading', { name: 'Inspect your personal setup' })).toBeFocused();

  // The committed statuses, recovered through the page's own manual refresh
  // (nothing here updates by itself).
  await expect
    .poll(
      async () => {
        await page.getByRole('button', { name: 'Refresh status' }).click();
        return main.getByText(/of these directories (was|were) read/u).count();
      },
      { timeout: 30_000, intervals: [300] },
    )
    .toBe(1);
  await expect(main).toContainText('Claude home — Inspected');

  // The results are on the inventory, under their own family, and the rail
  // states that the personal setup was read (FR-030).
  // The way back is the bar's, where every routed surface puts it
  // (`DetailNavigation.vue`).
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(main).toContainText('Your personal setup');
  const railPersonal = page
    .getByRole('navigation', { name: 'Sources' })
    .getByRole('link', { name: /^Personal setup/u });
  await expect(railPersonal).toContainText('Inspected');

  // Disable from the personal setup's own surface, which the rail reaches.
  await railPersonal.click();
  await page.getByRole('button', { name: 'Disable personal inspection' }).click();
  // Everything Global is gone; the page is back to proposing, and the
  // inventory carries no personal-setup section.
  await expect(page.getByRole('button', { name: 'Disable personal inspection' })).toHaveCount(0);
  // The way back is the bar's, where every routed surface puts it
  // (`DetailNavigation.vue`).
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(main).not.toContainText('Your personal setup');
  await expect(railPersonal).toContainText('Not inspected');
});
