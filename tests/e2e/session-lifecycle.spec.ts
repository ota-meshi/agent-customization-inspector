// T1045: the cross-story session-lifecycle regressions a rendered page owns —
// what a reader keeps, what a reset takes away, and what an error is allowed to
// look like (FR-042, FR-027; contracts/http-api.md § disable-global;
// contracts/accessibility-acceptance.md § 2.4.3, § 3.3.1).
//
// Four claims, each of which only a browser can settle, because each is about
// state that survives — or must not survive — an interaction:
//
//   - Focus retention: a route change and a rescan leave the reader somewhere
//     they chose or somewhere the page named, never at the top of a fresh
//     document with their place lost.
//   - Safe error: a failure is stated in text where the reader is, with a way
//     forward beside it, and never as a bare stack or a path from this machine.
//   - Notice-free authored values: what a file wrote is shown directly, with no
//     interstitial, no reveal control, and no warning standing in front of it.
//   - Ordinary scoped cleanup versus the central full purge: leaving a detail
//     route disposes that route's own state and nothing else, while disabling
//     personal inspection resets every client-held Global result and the
//     epoch fence keeps a response captured before it from repopulating.
//
// The per-window behaviours these rest on are proven closer to the code — the
// coordinator's barrier, the client purge's epoch counter — and are asserted
// here only as far as a reader can see them.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { waitForInventory } from './repository-status';

/** The repository the session is launched against. */
let repository: string;

/** The base holding the member homes and the HOME the shared agent home derives from. */
let base: string;

let host: LaunchedHost;

/** The authored credential-shaped literal the personal skill carries verbatim. */
const AUTHORED_LITERAL = 'ghp_LIFECYCLE0000000000000000000000000000';

test.beforeEach(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-lifecycle-repo-'));
  writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');
  mkdirSync(join(repository, '.agents', 'skills', 'release'), { recursive: true });
  writeFileSync(
    join(repository, '.agents', 'skills', 'release', 'SKILL.md'),
    `---\nname: release\n---\n\nDeploy with token ${AUTHORED_LITERAL} and \${RELEASE_ENDPOINT}.\n`,
    'utf8',
  );

  base = mkdtempSync(join(tmpdir(), 'aci-lifecycle-homes-'));
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

test('keeps the reader in place across a rescan and returns them to the inventory', async ({
  page,
}) => {
  await page.goto(host.origin);
  const main = page.locator('main');
  await expect(main).toContainText('Your personal setup');

  // A rescan announces through the live region; it does not take the reader's
  // focus away from the control they activated (2.4.3, 4.1.3).
  // Activated from the keyboard, which is the path the criterion is about and
  // the one that is the same in every engine: macOS does not focus a button on
  // a mouse click, so a click here would be asserting the platform's behaviour
  // rather than the page's.
  const rescan = page.getByRole('button', { name: 'Rescan repository' });
  await rescan.focus();
  await page.keyboard.press('Enter');
  // The command settles when the control is operable again: the status it
  // produced is the Repository Source's own surface, and leaving this page to
  // read it would move the focus this case is measuring.
  await expect(rescan).toBeEnabled();
  await waitForInventory(page);
  expect(await rescan.evaluate((element) => element === document.activeElement)).toBe(true);

  // Opening a file and coming back returns the reader to the inventory they
  // left rather than to a default one (T1122).
  await page.getByRole('tab', { name: /Skill/u }).click();
  const firstSkill = page.getByRole('tabpanel').locator('a').first();
  const skillName = (await firstSkill.textContent())?.trim() ?? '';
  expect(skillName.length).toBeGreaterThan(0);
  await firstSkill.click();
  await expect(page).not.toHaveURL(`${host.origin}/`);
  // The detail page's own way back, which pushes a fresh history entry carrying
  // no saved position: the kind tab rides in the URL, so the reader still lands
  // on the narrowed list they left rather than on the default one (T1122).
  await main.getByRole('link', { name: /Back to /u }).click();
  await expect(page).toHaveURL(/[?&]kind=skill/u);
  await expect(page.getByRole('tabpanel')).toContainText(skillName);
});

test('shows authored values directly, with no notice, reveal control, or masking', async ({
  page,
}) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /Skill/u }).click();
  await page
    .getByRole('tabpanel')
    .getByRole('link', { name: /release/u })
    .first()
    .click();
  const main = page.locator('main');

  // The literal and the environment reference are the file's own bytes, shown
  // as written (FR-027).
  await expect(main).toContainText(AUTHORED_LITERAL);
  await expect(main).toContainText('${RELEASE_ENDPOINT}');
  // Nothing stands in front of them: no reveal affordance, and no warning
  // about the content the reader asked to see.
  await expect(page.getByRole('button', { name: /reveal|show secret|unmask/iu })).toHaveCount(0);
  const maskingCharacters = await main.evaluate((element) =>
    /[•*]{4,}/u.test(element.textContent ?? ''),
  );
  expect(maskingCharacters, 'the detail renders a masked run in place of authored text').toBe(
    false,
  );
});

test('states a stale link in text with a practical next step', async ({ page }) => {
  // The deterministic failure a reader actually meets: a link made against an
  // earlier generation whose path the current scan does not hold. Killing the
  // host would prove a transport failure instead, and the barrier and
  // coordinator suites own that one.
  await page.goto(new URL('/skills/detail/global-claude/skills/gone/SKILL.md', host.origin).href);
  const main = page.locator('main');

  // Identified in text (3.3.1), with a next step (3.3.3), and a way back.
  await expect(main).toContainText('Nothing in the current scan sits at this link');
  await expect(main).toContainText('Return to the inventory and open it again.');
  await expect(main.getByRole('link', { name: /Back to /u })).toBeVisible();

  // A safe error: a sentence, not a stack, and no path from this machine.
  const rendered = await main.innerText();
  expect(rendered).not.toContain('    at ');
  expect(rendered).not.toContain(base);
  expect(rendered).not.toContain(repository);

  // And the way back works, so the reader is never stranded on it.
  await main.getByRole('link', { name: /Back to /u }).click();
  await waitForInventory(page);
});

test('disposes one route’s state on leaving it and every Global result on disable', async ({
  page,
}) => {
  await page.goto(new URL('/skills/detail/global-claude/skills/deploy/SKILL.md', host.origin).href);
  const main = page.locator('main');
  await expect(main).toContainText('The personal deploy skill.');

  // Ordinary scoped cleanup: leaving the detail route drops that route's own
  // content while the session and its Repository results carry on.
  await page.goto(host.origin);
  await expect(main).not.toContainText('The personal deploy skill.');
  await expect(main).toContainText('Your personal setup');
  await page.getByRole('tab', { name: /Instructions/u }).click();
  await expect(page.getByRole('tabpanel')).toContainText('AGENTS.md');

  // The central full purge: disabling resets every client-held Global result,
  // and the fence keeps the purged detail from coming back. It is offered on
  // the personal setup's own surface, which the rail reaches (FR-030).
  await page.getByRole('link', { name: 'Personal setup' }).click();
  await page.getByRole('button', { name: 'Disable personal inspection' }).click();
  await expect(page.getByRole('button', { name: 'Work out the directories' })).toBeVisible();
  await page.goto(new URL('/skills/detail/global-claude/skills/deploy/SKILL.md', host.origin).href);
  await expect(main).not.toContainText('The personal deploy skill.');

  // What the purge did not touch: the Repository sequence is exactly where it
  // was, which is what makes this a scoped reset rather than a session restart.
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /Instructions/u }).click();
  await expect(page.getByRole('tabpanel')).toContainText('AGENTS.md');
  // The rail's entry is the pre-consent offer again (FR-030).
  await expect(page.getByRole('link', { name: 'Personal setup' })).toContainText('Not inspected');
});
