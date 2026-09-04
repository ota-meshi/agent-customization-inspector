// T950: confirming the reviewed preview, as a reader does it (FR-013,
// FR-014, FR-023).
//
// The Codex path is production-backed here: the packaged CLI is launched with
// the three home variables pointing at real fixture homes, and what the reader
// confirms is what the host then actually reads. Claude's port is bound too as
// of Phase 97 — `global-claude-admission.spec.ts` is that member's own suite,
// and what this one asserts about it is only that it does not disturb Codex's
// results. Copilot's port is unbound, so its slot is evaluated by nothing and
// receives no control. The all-real-port browser proof is Phase 99's.
//
// What must hold after a confirmation:
//
//  - One shared batch, one Global generation, and the admitted tool's file on
//    the inventory beside the repository's own — under its own Source.
//  - At most one Codex instruction file, because the vendor selects one and
//    this rule publishes that one.
//  - The Repository results are still there, unchanged.
//  - Nothing in any home was modified, including the neighbours consent does
//    not cover.
import { rm } from 'node:fs/promises';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  GLOBAL_HOME_SECRETS,
  GLOBAL_HOME_VARIABLES,
  buildCodexInstructionHome,
  buildGlobalHomeFixture,
  observeTree,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openPersonalSetup } from './repository-status';
import { openNoKindDisclosure } from './no-kind-disclosure';

/**
 * The repository `AGENTS.md` of the shadowing case, and the phrase that
 * identifies it. The home's own selection says something else, so which text a
 * page renders is what says which Source's file it opened.
 */
const REPOSITORY_AGENTS_MARKER = 'Repository instructions, not the home\u2019s.';
const REPOSITORY_AGENTS_TEXT = `# instructions\n\n${REPOSITORY_AGENTS_MARKER}\n`;

/** The repository the session is launched against. */
let repository: string;

/** The three Global homes the environment points at. */
let homes: GlobalHomeFixture;

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-admission-repo-'));
  mkdirSync(join(repository, '.claude/skills/deploy'), { recursive: true });
  writeFileSync(
    join(repository, '.claude/skills/deploy/SKILL.md'),
    '---\nname: deploy\ndescription: Ship it.\n---\n\nBody.\n',
    'utf8',
  );
  homes = buildGlobalHomeFixture();
  host = await launchHost(repository, homes.environment);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(homes.base, { recursive: true, force: true });
});

/**
 * Opens the consent page of `origin`, takes a preview, ticks the box, and
 * confirms.
 *
 * A confirmation is once per host process: consent is active afterwards, and a
 * second one is refused rather than silently replacing it. So the shared host
 * is confirmed once in `beforeAll` and the observing cases below navigate to
 * what that produced, while a case that needs to watch the confirmation happen
 * launches its own.
 */
async function confirmConsent(page: Page, origin: string): Promise<void> {
  await page.goto(origin);
  await page.getByRole('link', { name: /personal setup/iu }).click();
  // Wait for the page to have settled into one of its two states before
  // deciding: `isVisible()` does not wait, so checking it while the read is
  // still in flight reports "no offer" and skips the capture that the state
  // needs (measured — this is what made the first confirmation find no
  // preview).
  await expect(page.locator('main')).toContainText(
    /An absolute path, so this tool can be inspected|has not worked out which directories/u,
  );
  const offer = page.getByRole('button', { name: 'Work out the directories' });
  if (await offer.isVisible()) {
    await offer.click();
  }
  await expect(page.locator('main')).toContainText(
    'An absolute path, so this tool can be inspected',
  );
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Inspect these directories' }).click();
  await expect(page.locator('main')).toContainText('What is inspected');
  // The confirmation answers once the read finished and the page refetches on
  // that answer (contracts/http-api.md § enable-global), so returning only
  // once the panel states a finished read is what lets the caller reload or
  // navigate afterwards and meet the committed generation rather than a
  // batch still running.
  await expect(page.locator('main')).toContainText(
    /of these directories (was|were) read|Reading stopped before it finished|Nothing could be inspected/u,
    { timeout: 30_000 },
  );
}

test('confirms with no tool selector and states what was accepted', async ({ page }) => {
  const before = observeTree(homes.base);

  await confirmConsent(page, host.origin);

  // Reloaded before the finished outcomes are read: the acceptance response
  // says a batch was queued, and this page does not refresh itself, so the
  // controls it holds are from the snapshot it loaded. With two members reading
  // two homes, that snapshot can predate the commit — asserting on it would be
  // asserting on a moment rather than on the result.
  await page.goto(new URL('/global-consent', host.origin).toString());

  const main = page.locator('main');
  // All four members are bound and every fixture root is readable, so each
  // control states its own outcome from the one shared batch (FR-014).
  await expect(main).toContainText('Codex home — Inspected');
  const outcomes = await page.locator('.aci-global-consent-page__outcomes li').allInnerTexts();
  expect(outcomes).toEqual([
    'Copilot home — Inspected',
    'Claude home — Inspected',
    'Codex home — Inspected',
    'Shared agent home — Inspected',
  ]);
  // Nothing here offers the confirmation again, and nothing offers it per
  // tool: with every member inspected, the checkbox and the button it gates
  // are both absent, so the one confirmation this page takes is one button for
  // the whole preview (FR-014). The outcomes asserted above are what says the
  // page rendered, so the two absences are a state rather than a blank page.
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Inspect these directories' })).toHaveCount(0);

  // And every home is exactly as it was. The instruction file was read; the
  // settings, credentials, memories, prompts, and session state beside it were
  // not touched at all (FR-018, FR-023).
  const after = observeTree(homes.base);
  expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
  for (const [path, observed] of after) {
    expect(observed, path).toEqual(before.get(path));
  }
});

test('publishes the admitted home as its own Source beside the repository', async ({ page }) => {
  // Its own host and its own confirmation: a confirmation is once per process,
  // so a case that reads what one produced must be the one that made it rather
  // than inheriting another case's.
  const own = await launchHost(repository, homes.environment);
  try {
    await confirmConsent(page, own.origin);
    await page.goto(own.origin);

    const main = page.locator('main');
    // Two Sources on one page: the repository the launch selected, and the
    // consented Codex home. Each root is stated on that family's own surface
    // rather than over the inventory (FR-030).
    await expect(main).toContainText('Repository');
    await expect(await openPersonalSetup(page)).toContainText(homes.homes.codex);
    await page.goto(own.origin);
    // The Repository results are still there — a Global commit advances its own
    // sequence and leaves the Repository generation alone (FR-042).
    await page.getByRole('tab', { name: /^Skill/u }).click();
    await expect(page.getByRole('tabpanel')).toContainText('.claude/skills/deploy/SKILL.md');
  } finally {
    await stopHost(own);
  }
});

test('publishes exactly one Codex instruction file from the home', async ({ page }) => {
  const own = await launchHost(repository, homes.environment);
  try {
    await confirmConsent(page, own.origin);
    await page.goto(own.origin);
    await page.getByRole('tab', { name: /^Instructions/u }).click();

    const panel = page.getByRole('tabpanel');
    // The home holds both named targets and the override is non-empty, so the
    // override is the one published file: the vendor selects one per location and
    // this rule publishes that one rather than admitting both.
    await expect(panel).toContainText('AGENTS.override.md');
    const rows = await panel.locator('.aci-path').allInnerTexts();
    // The home's fallback is not among them: the override is non-empty, so it
    // is the selection and `AGENTS.md` beside it is published by nothing.
    expect(rows.filter((row) => row === 'AGENTS.override.md')).toHaveLength(1);
    expect(rows.filter((row) => row === 'AGENTS.md')).toHaveLength(0);
  } finally {
    await stopHost(own);
  }
});

test('publishes every contracted Codex kind from the one confirmation (T1139)', async ({
  page,
}) => {
  const own = await launchHost(repository, homes.environment);
  try {
    await confirmConsent(page, own.origin);
    await page.goto(own.origin);
    const panel = page.getByRole('tabpanel');

    // The config trio's one candidate: the MCP declaration it carries, the
    // settings document it is, and the inline hook table it contains — one
    // file, read once, three recognitions.
    await page.getByRole('tab', { name: /^MCP/u }).click();
    await expect(panel).toContainText('docs');
    await expect(panel).toContainText('config.toml');
    await page.getByRole('tab', { name: /^Settings/u }).click();
    await expect(panel).toContainText('config.toml');
    await page.getByRole('tab', { name: /^Hook/u }).click();
    await expect(panel).toContainText('post_tool_use');
    await expect(panel).toContainText('preToolUse');

    // The personal agent; the nested archive stays a near miss.
    await page.getByRole('tab', { name: /^Agent/u }).click();
    await expect(panel).toContainText('deploy-bot');
    await expect(panel).not.toContainText('old-bot');

    // The personal rules file is a permissions policy, exactly as the
    // Repository rule's files are.
    await page.getByRole('tab', { name: /^Permissions/u }).click();
    await expect(panel).toContainText('rules/safety.rules');
    await expect(panel).not.toContainText('rules/archive/old.rules');

    // The deprecated prompt, invoked by its file name.
    await page.getByRole('tab', { name: /^Prompt/u }).click();
    await expect(panel).toContainText('draftpr');

    // Nothing the exclusion names reaches any inventory surface (FR-018).
    const text = await page.locator('main').innerText();
    for (const excluded of ['memories/summary.md', 'plugins/team-tools', 'sessions/rollout']) {
      expect(text, excluded).not.toContain(excluded);
    }
  } finally {
    await stopHost(own);
  }
});

test('shows no credential from any home, and offers nothing that would change one', async ({
  page,
}) => {
  const own = await launchHost(repository, homes.environment);
  try {
    await confirmConsent(page, own.origin);
    await page.goto(own.origin);

    // The homes hold credential-shaped literals in files consent does not
    // cover. None of them reaches any surface, because none of those files was
    // read.
    const text = await page.locator('main').innerText();
    for (const secret of Object.values(GLOBAL_HOME_SECRETS)) {
      expect(text).not.toContain(secret);
    }
    // And nothing offers to fix, validate, or run what was found.
    for (const pattern of [/fix/iu, /validate/iu, /^run/iu, /merge/iu]) {
      await expect(page.getByRole('button', { name: pattern }), String(pattern)).toHaveCount(0);
    }
  } finally {
    await stopHost(own);
  }
});

test('states active-no-job when nothing could be admitted, and reads nothing', async ({ page }) => {
  // Its own launch: the states are decided from the environment the process
  // started with, and here the one bound member's variable is empty.
  const refused = await launchHost(repository, {
    // Every member unusable: with one of them still eligible the answer
    // would be a batch that read something, which is a different case. The
    // tool overrides are emptied, and the shared agent home — which cannot be
    // refused lexically — points below a base holding no `.agents`.
    [GLOBAL_HOME_VARIABLES.copilot]: '',
    [GLOBAL_HOME_VARIABLES.claude]: '',
    [GLOBAL_HOME_VARIABLES.codex]: '',
    HOME: join(homes.base, 'no-agents-here'),
  });
  try {
    await page.goto(refused.origin);
    await page.getByRole('link', { name: /personal setup/iu }).click();
    await page.getByRole('button', { name: 'Work out the directories' }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Inspect these directories' }).click();

    const main = page.locator('main');
    // The confirmation is accepted and the deterministic answer is that there
    // was nothing to read: consent stays in effect so the reader can fix the
    // variable and try again.
    await expect(main).toContainText('Nothing could be inspected, so nothing was read');
    await expect(main).toContainText('Codex home — Not inspected');
    await expect(main).toContainText('environment variable is set to an empty value');
    // No Global Source was created, so the inventory is the repository's alone.
    await page.goto(refused.origin);
    await expect(page.locator('main')).not.toContainText(homes.homes.codex);
  } finally {
    await stopHost(refused);
  }
});

test('opens the home’s own file at a path the repository also holds', async ({ page }) => {
  // The identity a detail is addressed by is Source and Source-relative Path
  // (FR-030), and this is the case that needs both: the repository and the
  // consented home each hold `AGENTS.md`. The override is absent here, so the
  // home's selection is its `AGENTS.md` — the same path the repository
  // publishes, under a different Source.
  const shadowed = mkdtempSync(join(tmpdir(), 'aci-shadow-repo-'));
  writeFileSync(join(shadowed, 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
  const home = buildCodexInstructionHome({ override: 'absent', fallback: 'non-empty' });
  const own = await launchHost(shadowed, {
    // Only the members this case is about publish: the subject is one path
    // held by two Sources, and a third member's rows would move the counts
    // without moving the claim.
    [GLOBAL_HOME_VARIABLES.copilot]: '',
    [GLOBAL_HOME_VARIABLES.claude]: homes.homes.claude,
    [GLOBAL_HOME_VARIABLES.codex]: home.home,
    HOME: join(homes.base, 'no-agents-here'),
  });
  try {
    await confirmConsent(page, own.origin);
    await page.goto(own.origin);
    await page.getByRole('tab', { name: /^Instructions/u }).click();

    // Two rows at one path, one per Source: aggregating by path alone would
    // have merged them into a row claiming a file neither Source has.
    const panel = page.getByRole('tabpanel');
    // Prefix-matched: a consented home's link carries its Source qualifier
    // once the Global family holds more than one Source (WCAG 2.4.6).
    const links = panel.getByRole('link', { name: /^AGENTS\.md/u });
    await expect(links).toHaveCount(2);
    // The addresses differ in exactly the half that identifies the Source.
    const addresses = await links.evaluateAll((anchors) =>
      anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
    );
    expect(addresses.toSorted()).toEqual([
      '/instructions/detail/global-codex/AGENTS.md',
      '/instructions/detail/repository/AGENTS.md',
    ]);

    // Each address opens its own Source's file. Before the Source became part
    // of the address, both of these showed the repository's text.
    await page.goto(new URL('/instructions/detail/global-codex/AGENTS.md', own.origin).toString());
    await expect(page.locator('main')).toContainText('Do the thing.');
    await expect(page.locator('main')).not.toContainText(REPOSITORY_AGENTS_MARKER);
    await page.goto(new URL('/instructions/detail/repository/AGENTS.md', own.origin).toString());
    await expect(page.locator('main')).toContainText(REPOSITORY_AGENTS_MARKER);
    await expect(page.locator('main')).not.toContainText('Do the thing.');
  } finally {
    await stopHost(own);
    await rm(shadowed, { recursive: true, force: true });
    await rm(home.home, { recursive: true, force: true });
  }
});

test('inspects the personal setup from the command line, with no consent click', async ({
  page,
}) => {
  // The flag is the confirmation, so nothing on screen has to be ticked: the
  // launch line already printed with the Global generation committed, and the
  // first page a reader opens carries the home's file (FR-013).
  const own = await launchHost(repository, homes.environment, ['--inspect-personal-setup']);
  try {
    await page.goto(own.origin);
    const main = page.locator('main');
    // The rail says the personal setup was read, which is the inventory
    // stating it (FR-030); the home's own root is on that family's surface.
    await expect(
      page
        .getByRole('navigation', { name: 'Sources' })
        .getByRole('link', { name: /^Personal setup/u }),
    ).toContainText(/Inspected|\d+ partial/u);
    // And the consent page states the active consent rather than offering to
    // work the directories out — the flag used the same consent state the
    // handlers serve.
    await page
      .getByRole('navigation', { name: 'Sources' })
      .getByRole('link', { name: /^Personal setup/u })
      .click();
    await expect(main).toContainText(homes.homes.codex);
    await expect(page.locator('main')).toContainText('What is inspected');
    await expect(page.locator('main')).toContainText('Codex home — Inspected');
    await expect(page.getByRole('button', { name: 'Inspect these directories' })).toHaveCount(0);
  } finally {
    await stopHost(own);
  }
});

test('filters the inventory by Source rather than by tool', async ({ page }) => {
  // Its own repository and home, both publishing `AGENTS.md`: the axis exists
  // for exactly this, and a fixture where only one family holds instruction
  // files would let a broken filter pass.
  const shadowed = mkdtempSync(join(tmpdir(), 'aci-family-repo-'));
  writeFileSync(join(shadowed, 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
  const home = buildCodexInstructionHome({ override: 'absent', fallback: 'non-empty' });
  const own = await launchHost(
    shadowed,
    {
      // The shared agent home is the one member no property relocates: it is
      // always `homedir()/.agents` (FR-045), so the launch has to say which
      // home that is. Left out, `homedir()` answers with the machine's own,
      // and whether the Source this case lists exists becomes a fact about
      // the runner rather than about the fixture.
      HOME: homes.home,
      [GLOBAL_HOME_VARIABLES.copilot]: homes.homes.copilot,
      [GLOBAL_HOME_VARIABLES.claude]: homes.homes.claude,
      [GLOBAL_HOME_VARIABLES.codex]: home.home,
    },
    ['--inspect-personal-setup'],
  );
  try {
    await page.goto(own.origin);
    await page.getByRole('tab', { name: /^Instructions/u }).click();

    // The axis is the Source family (FR-006; T1003): the repository, and the
    // reader's own configuration directories as one. A per-member option
    // would ask what the Tool filter beside this one already answers, and one
    // family is a question with one answer.
    const sourceFilter = page.getByLabel('Source', { exact: true });
    await expect(sourceFilter.locator('option')).toHaveText([
      'All sources',
      'Repository',
      'Your personal setup',
    ]);

    // Both families publish `AGENTS.md`, so the path says nothing about which
    // row a filter left: the address does, because it carries the Source.
    const links = page.getByRole('tabpanel').getByRole('link', { name: /^AGENTS\.md/u });
    const addresses = async (): Promise<string[]> =>
      links.evaluateAll((anchors) =>
        anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
      );
    expect((await addresses()).toSorted()).toEqual([
      '/instructions/detail/global-codex/AGENTS.md',
      '/instructions/detail/repository/AGENTS.md',
    ]);

    await sourceFilter.selectOption({ label: 'Your personal setup' });
    expect(await addresses()).toEqual(['/instructions/detail/global-codex/AGENTS.md']);
    await sourceFilter.selectOption({ label: 'Repository' });
    expect(await addresses()).toEqual(['/instructions/detail/repository/AGENTS.md']);
    // The selection rides in the URL as the family's own word, which survives a
    // launch — a Source ID would not. Awaited rather than read: the query is written by
    // a `router.replace` the selection triggers, so reading it in the same tick
    // catches the previous one.
    await expect(page).toHaveURL(/[?&]source=repository(&|$)/u);
  } finally {
    await stopHost(own);
    await rm(shadowed, { recursive: true, force: true });
    await rm(home.home, { recursive: true, force: true });
  }
});

test('says which Source each row and each detail belongs to', async ({ page }) => {
  // Two rows at one path, and the reader has to be able to tell them apart
  // from what is on the screen: the path is identical, so the Source is the
  // half that distinguishes them (FR-030). Named as the Source filter and the
  // summary panels name it, never as the address token.
  const shadowed = mkdtempSync(join(tmpdir(), 'aci-source-label-repo-'));
  writeFileSync(join(shadowed, 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
  const home = buildCodexInstructionHome({ override: 'absent', fallback: 'non-empty' });
  const own = await launchHost(
    shadowed,
    {
      // Only the members this case counts publish: Copilot's widened member
      // would add rows of its own, which is its own spec's subject.
      [GLOBAL_HOME_VARIABLES.copilot]: '',
      [GLOBAL_HOME_VARIABLES.claude]: homes.homes.claude,
      [GLOBAL_HOME_VARIABLES.codex]: home.home,
      HOME: join(homes.base, 'no-agents-here'),
    },
    ['--inspect-personal-setup'],
  );
  try {
    await page.goto(own.origin);
    await page.getByRole('tab', { name: /^Instructions/u }).click();
    const rows = page.getByRole('tabpanel').locator('.aci-family-heading');
    // Three Sources, two families: both consented homes are one block, and
    // which directory each of their files was in is stated beside the file.
    await expect(rows).toHaveText([/^Repository/u, /^Your personal setup/u]);

    // And each detail states it too, so a kept link says which file it opened.
    await page.goto(new URL('/instructions/detail/global-codex/AGENTS.md', own.origin).toString());
    await expect(page.locator('.aci-detail-crumbs')).toContainText('Your personal setup');
    // And which directory it was in, because two homes are carried: this case's
    // own Codex home, not the shared fixture's.
    await expect(page.locator('.aci-instruction-detail__root')).toContainText(home.home);
    await page.goto(new URL('/instructions/detail/repository/AGENTS.md', own.origin).toString());
    await expect(page.locator('.aci-detail-crumbs')).toContainText('Repository');
  } finally {
    await stopHost(own);
    await rm(shadowed, { recursive: true, force: true });
    await rm(home.home, { recursive: true, force: true });
  }
});

test('follows a link between two Sources’ details at one path', async ({ page }) => {
  // Two links that read the same and open different files, followed in-app
  // rather than by loading a URL: what each one opens is its own Source's file
  // (FR-030). Both steps pass through the inventory, which is the only way the
  // surfaces offer between the two details, so this holds the navigation rather
  // than the page's own reuse — a reused instance asked for another Source at
  // one path is `session-view-state.test.ts`.
  const shadowed = mkdtempSync(join(tmpdir(), 'aci-source-step-repo-'));
  writeFileSync(join(shadowed, 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
  const home = buildCodexInstructionHome({ override: 'absent', fallback: 'non-empty' });
  const own = await launchHost(
    shadowed,
    {
      [GLOBAL_HOME_VARIABLES.copilot]: homes.homes.copilot,
      [GLOBAL_HOME_VARIABLES.claude]: homes.homes.claude,
      [GLOBAL_HOME_VARIABLES.codex]: home.home,
    },
    ['--inspect-personal-setup'],
  );
  try {
    await page.goto(own.origin);
    await page.getByRole('tab', { name: /^Instructions/u }).click();
    const panel = page.getByRole('tabpanel');
    // The repository's row first, then the home's — both links read `AGENTS.md`.
    await panel.locator('a[href="/instructions/detail/repository/AGENTS.md"]').click();
    const main = page.locator('main');
    await expect(main).toContainText(REPOSITORY_AGENTS_MARKER);

    await page.goBack();
    await panel.locator('a[href="/instructions/detail/global-codex/AGENTS.md"]').click();
    await expect(main).toContainText('Do the thing.');
    await expect(main).not.toContainText(REPOSITORY_AGENTS_MARKER);

    // And the same step in the other direction, still without a page load:
    // the repository's file comes back rather than the home's staying put.
    await page.goBack();
    await panel.locator('a[href="/instructions/detail/repository/AGENTS.md"]').click();
    await expect(main).toContainText(REPOSITORY_AGENTS_MARKER);
    await expect(main).not.toContainText('Do the thing.');
  } finally {
    await stopHost(own);
    await rm(shadowed, { recursive: true, force: true });
    await rm(home.home, { recursive: true, force: true });
  }
});

test('groups one range across Sources, each Source with its own comparison', async ({ page }) => {
  // What the reader asked the list for: one heading per range, with the
  // repository's files and the consented home's under it as two blocks. The
  // comparison stays inside a block, because a pair is one row's files and no
  // pair spans two Sources (FR-011, FR-030).
  const shadowed = mkdtempSync(join(tmpdir(), 'aci-range-group-repo-'));
  // Two files at the root range, so the repository's block has a pair to
  // compare; the home publishes one file, which is all its vendor selects.
  writeFileSync(join(shadowed, 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
  writeFileSync(join(shadowed, 'CLAUDE.md'), '# repository CLAUDE\n', 'utf8');
  mkdirSync(join(shadowed, 'docs'), { recursive: true });
  writeFileSync(join(shadowed, 'docs', 'AGENTS.md'), '# repository docs\n', 'utf8');
  const home = buildCodexInstructionHome({ override: 'absent', fallback: 'non-empty' });
  const own = await launchHost(
    shadowed,
    {
      // Only the members this case counts publish: Copilot's widened member
      // would add rows of its own, which is its own spec's subject.
      [GLOBAL_HOME_VARIABLES.copilot]: '',
      [GLOBAL_HOME_VARIABLES.claude]: homes.homes.claude,
      [GLOBAL_HOME_VARIABLES.codex]: home.home,
      HOME: join(homes.base, 'no-agents-here'),
    },
    ['--inspect-personal-setup'],
  );
  try {
    await page.goto(own.origin);
    await page.getByRole('tab', { name: /^Instructions/u }).click();
    const panel = page.getByRole('tabpanel');

    // Two ranges, two items — the repository's `**` and both homes' `**` are one
    // heading, not three.
    const items = panel.locator('.aci-item');
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['**', 'docs/**']);
    // And the count beside the list counts what a reader can count.
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 2 of 2',
    );

    // Inside the root range: the repository above, the personal setup below,
    // each with its own files.
    const rootRange = items.first();
    await expect(rootRange.locator('.aci-family-heading')).toHaveText([
      /^Repository/u,
      /^Your personal setup/u,
    ]);
    const blocks = rootRange.locator('.aci-source-family-blocks > li');
    await expect(blocks.nth(0).locator('.aci-path')).toHaveText(['AGENTS.md', 'CLAUDE.md']);
    // Both homes' files are in one block, each publishing the one file its own
    // vendor rule admits — and each naming the home it came from, which is the
    // only thing that tells the two apart here (FR-002, FR-030).
    await expect(blocks.nth(1).locator('.aci-path')).toHaveText(['CLAUDE.md', 'AGENTS.md']);
    await expect(blocks.nth(1).locator('.aci-source-home')).toHaveText([
      'Claude home',
      'Codex home',
    ]);

    // The comparison belongs to the block, and each block offers its own: the
    // repository's pair, and the two homes' files against each other. Each link
    // names its family so the two never announce identically (WCAG 2.4.6).
    const compare = rootRange.locator('.aci-family-heading a');
    await expect(compare).toHaveCount(2);
    await expect(compare.nth(0)).toHaveAttribute(
      'aria-label',
      "Compare this range's files: ** (Repository)",
    );
    await expect(compare.nth(1)).toHaveAttribute(
      'aria-label',
      "Compare this range's files: ** (Your personal setup)",
    );
    // The personal setup's own comparison pairs one home's file with the
    // other's, each side carrying its own Source (FR-011, FR-030).
    await compare.nth(1).click();
    await expect(page).toHaveURL(/\/instructions\/compare\/global\?/u);
    await expect(page).toHaveURL(/leftSource=global-claude/u);
    await expect(page).toHaveURL(/rightSource=global-codex/u);
    const sides = page.locator('.aci-instruction-compare__file-facts');
    await expect(sides.nth(0)).toContainText(homes.homes.claude);
    await expect(sides.nth(1)).toContainText(home.home);
  } finally {
    await stopHost(own);
    await rm(shadowed, { recursive: true, force: true });
    await rm(home.home, { recursive: true, force: true });
  }
});

test('names the Source of each file in no kind at one path', async ({ page }) => {
  // Two unreadable files at one path: the repository's `AGENTS.md` and the
  // consented home's, both admitted as instruction candidates and neither
  // recognized, so both are listed in no kind with their diagnostics (FR-028).
  // The path is all such a row is identified by, so without the Source the two
  // are the same line twice (FR-030).
  const shadowed = mkdtempSync(join(tmpdir(), 'aci-no-kind-repo-'));
  writeFileSync(join(shadowed, 'AGENTS.md'), Buffer.from([0x23, 0x00, 0x61]));
  const home = buildCodexInstructionHome({ override: 'absent', fallback: 'binary' });
  const own = await launchHost(
    shadowed,
    {
      [GLOBAL_HOME_VARIABLES.copilot]: homes.homes.copilot,
      [GLOBAL_HOME_VARIABLES.claude]: homes.homes.claude,
      [GLOBAL_HOME_VARIABLES.codex]: home.home,
    },
    ['--inspect-personal-setup'],
  );
  try {
    await page.goto(own.origin);
    const unclassified = (await openNoKindDisclosure(page))
      .locator('.aci-item')
      .filter({ hasText: 'AGENTS.md' });
    await expect(unclassified).toHaveCount(2);
    // Each row states whose file it is: the family through the section it is
    // listed under, and the home through the row's own badge (FR-002, FR-030).
    const sections = (await openNoKindDisclosure(page)).locator('.aci-family-heading');
    await expect(sections).toHaveText([/^Repository/u, /^Your personal setup/u]);
    await expect(unclassified.nth(1).locator('.aci-source-home')).toHaveText('Codex home');
    // And both still say what happened, which is why they are listed at all.
    await expect(unclassified.nth(0)).toContainText('Binary — recorded without source text');
    await expect(unclassified.nth(1)).toContainText('Binary — recorded without source text');
  } finally {
    await stopHost(own);
    await rm(shadowed, { recursive: true, force: true });
    await rm(home.home, { recursive: true, force: true });
  }
});

test('states the current consent after a reload, not the acceptance response', async ({ page }) => {
  const own = await launchHost(repository, homes.environment);
  try {
    await confirmConsent(page, own.origin);
    // Reloading drops the acceptance response, which was a statement about one
    // moment. What must survive is the consent itself — the controls and what
    // each tool ended as — because that is what a reader coming back needs.
    await page.goto(new URL('/global-consent', own.origin).toString());
    const main = page.locator('main');
    await expect(main).toContainText('What is inspected');
    await expect(main).toContainText('Codex home — Inspected');
    // And the finished read is stated in the past: "being read now" after the
    // reading is over would describe work that is not happening.
    await expect(main).toContainText('were read');
    await expect(main).not.toContainText('being read now');
    // The confirmation control is gone, because confirming again is refused.
    // That absence is also why no browser case drives an enable refusal: once
    // consent is active the UI offers neither the confirmation nor a fresh
    // capture, so the refusals those would take are the contract suite's
    // (`http-api-global.test.ts`), not something a reader can reach.
    await expect(page.getByRole('button', { name: 'Inspect these directories' })).toHaveCount(0);
  } finally {
    await stopHost(own);
  }
});
