// T1011: explicit per-member Global rescans, as a reader sees them (FR-030;
// contracts/http-api.md § rescan-global).
//
//  - Each published member offers its own rescan control, named by the member
//    it rescans, and a rescan commits that member's directory as it is now
//    while every sibling's results stay carried.
//  - A member whose files keep file-confined diagnostics publishes `partial`
//    again across its own rescan (FR-028), with the diagnostic file count
//    stated on its row.
//  - A fatal rescan retains the previous results under the stale note and
//    renames the member's control to "Retry scan"; the retry commits once the
//    cause is repaired.
//
// Duplicate prevention and admission correlation are exercised at the contract
// layer (tests/contract/http-api-global.test.ts): the in-flight window of a
// small fixture scan is far narrower than a real browser round-trip, so a
// second click here would race the first commit instead of proving the
// refusal.
import { chmodSync, mkdirSync, mkdtempSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The repository the session is launched against. */
let repository: string;

/** The base holding the four member homes and the HOME the fourth derives from. */
let base: string;

/** The member homes, by the environment property that selects each. */
let homes: { copilot: string; claude: string; codex: string; agents: string };

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-global-rescan-repo-'));
  writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');

  base = mkdtempSync(join(tmpdir(), 'aci-global-rescan-homes-'));
  const home = join(base, 'home');
  homes = {
    copilot: join(base, 'copilot-home'),
    claude: join(base, 'claude-home'),
    codex: join(base, 'codex-home'),
    agents: join(home, '.agents'),
  };
  // The Claude home's committed state before the rescan test adds to it.
  mkdirSync(join(homes.claude, 'skills', 'deploy'), { recursive: true });
  writeFileSync(
    join(homes.claude, 'skills', 'deploy', 'SKILL.md'),
    '---\nname: deploy\n---\n\nThe personal deploy skill.\n',
    'utf8',
  );
  // The Copilot home publishes `partial`: one readable instruction file and
  // one broken link the scan can admit but never read, so the commit keeps a
  // file-confined diagnostic (FR-028).
  mkdirSync(join(homes.copilot, 'instructions'), { recursive: true });
  writeFileSync(
    join(homes.copilot, 'instructions', 'deploy.instructions.md'),
    '# personal deployment instructions\n',
    'utf8',
  );
  symlinkSync(
    join(homes.copilot, 'no-such-target.md'),
    join(homes.copilot, 'instructions', 'broken.instructions.md'),
  );
  // The Codex home's config, the fatal-rescan test's retained prior result.
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

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(base, { recursive: true, force: true });
});

test('offers each member its own rescan control, named by the member', async ({ page }) => {
  await page.goto(host.origin);
  const main = page.locator('main');
  await expect(main).toContainText('Your personal setup');
  // Every row's control carries the same visible phrase, so the accessible
  // name is what tells a links-and-buttons walk which member each one rescans
  // (WCAG 2.4.6) — and the repository's own control stays its own.
  for (const member of ['GitHub Copilot', 'Claude Code', 'OpenAI Codex', 'Shared agent home']) {
    await expect(
      page.getByRole('button', { name: `Rescan: ${member}`, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Rescan repository' })).toBeVisible();
});

test('commits one member rescan with its added file while siblings stay carried', async ({
  page,
}) => {
  await page.goto(new URL('/?kind=skill', host.origin).href);
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('deploy');

  // A skill added while the session is up is not in the committed Global
  // generation until a rescan of its own member commits one that holds it.
  mkdirSync(join(homes.claude, 'skills', 'release'), { recursive: true });
  await writeFile(
    join(homes.claude, 'skills', 'release', 'SKILL.md'),
    '---\nname: release\n---\n\nAdded after the enable.\n',
    'utf8',
  );
  await expect(panel).not.toContainText('release');

  // Nothing on this page updates by itself: the reader dispatches the rescan
  // and watches for its commit through "Refresh status" (FR-030).
  await page.getByRole('button', { name: 'Rescan: Claude Code', exact: true }).click();
  await expect
    .poll(
      async () => {
        await page.getByRole('button', { name: 'Refresh status' }).click();
        return panel.getByText('release', { exact: true }).count();
      },
      { timeout: 30_000, intervals: [300] },
    )
    .toBe(1);
  // The siblings' carried results and the untouched Repository sequence are
  // both still there: the rescan replaced one member's directory, not the
  // generation's other Sources (FR-030).
  await expect(panel).toContainText('deploy');
  await page.getByRole('tab', { name: /Instructions/u }).click();
  const instructions = page.getByRole('tabpanel');
  await expect(instructions).toContainText('AGENTS.md');
  await expect(instructions).toContainText('deploy.instructions.md');
});

test('keeps a partial member partial across its own rescan, counting its files', async ({
  page,
}) => {
  await page.goto(host.origin);
  const main = page.locator('main');
  // The broken link's read failure is file-confined, so the member published
  // `partial` and its row counts the files that kept a diagnostic (FR-028).
  // The origin now leads the status inside the parentheses (T1003, FR-002).
  await expect(main).toContainText(', Partial)');
  await expect(main).toContainText('1 file(s) kept a diagnostic of their own');

  // A new readable file marks the rescan's commit; the broken link stays, so
  // the recommitted member is `partial` again rather than repaired by rescan.
  await writeFile(
    join(homes.copilot, 'instructions', 'review.instructions.md'),
    '# added before the copilot rescan\n',
    'utf8',
  );
  await page.getByRole('button', { name: 'Rescan: GitHub Copilot', exact: true }).click();
  await page.goto(new URL('/?kind=instructions', host.origin).href);
  const panel = page.getByRole('tabpanel');
  await expect
    .poll(
      async () => {
        await page.getByRole('button', { name: 'Refresh status' }).click();
        return panel.getByText('review.instructions.md').count();
      },
      { timeout: 30_000, intervals: [300] },
    )
    .toBe(1);
  // The origin now leads the status inside the parentheses (T1003, FR-002).
  await expect(main).toContainText(', Partial)');
  await expect(main).toContainText('1 file(s) kept a diagnostic of their own');
});

test('retains prior results on a fatal rescan and recovers with an explicit retry', async ({
  page,
}) => {
  chmodSync(homes.codex, 0o000);
  // Running as root, or a filesystem that ignores the mode: the failing
  // premise cannot be materialized here.
  test.skip((statSync(homes.codex).mode & 0o700) !== 0, 'chmod 000 does not deny this process');
  try {
    await page.goto(host.origin);
    const main = page.locator('main');
    await page.getByRole('button', { name: 'Rescan: OpenAI Codex', exact: true }).click();
    // The failure retains the previous results under the stale note, and only
    // the failed member's control renames to a retry (FR-030).
    await expect
      .poll(
        async () => {
          await page.getByRole('button', { name: 'Refresh status' }).click();
          return main.getByText('The last rescan failed').count();
        },
        { timeout: 30_000, intervals: [300] },
      )
      .toBe(1);
    await expect(main).toContainText(
      'The last rescan failed, so the previous scan result is still shown and may be out of date.',
    );
    await expect(
      page.getByRole('button', { name: 'Retry scan: OpenAI Codex', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Rescan: Claude Code', exact: true }),
    ).toBeVisible();
    // The retained prior results: the member's committed config is still
    // listed, exactly as before the failed attempt.
    await page.goto(new URL('/?kind=settings%2Fconfig', host.origin).href);
    await expect(page.getByRole('tabpanel')).toContainText('config.toml');
  } finally {
    chmodSync(homes.codex, 0o700);
  }
  // The repaired directory recovers through the same control: the retry
  // commits, the stale note leaves, and the control is a plain rescan again.
  await page.goto(host.origin);
  const main = page.locator('main');
  await page.getByRole('button', { name: 'Retry scan: OpenAI Codex', exact: true }).click();
  await expect
    .poll(
      async () => {
        await page.getByRole('button', { name: 'Refresh status' }).click();
        return main.getByText('The last rescan failed').count();
      },
      { timeout: 30_000, intervals: [300] },
    )
    .toBe(0);
  await expect(
    page.getByRole('button', { name: 'Rescan: OpenAI Codex', exact: true }),
  ).toBeVisible();
});
