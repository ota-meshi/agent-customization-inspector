// T935: the Global consent preview as a reader meets it (FR-013 through
// FR-018, FR-023).
//
// The route is reached the way a reader reaches it — from the launch URL, by
// following the entry link on the inventory — because a consent page nobody can
// find is a decision nobody can make. A review found this route reachable only
// by typing its URL, which is why the entry is asserted here rather than the
// route being visited directly.
//
// What the page must do: name the four proposed directories and where each
// came from, explain the read scope in words rather than in path patterns, and
// state plainly which tools nothing can be inspected for. What it must not do:
// read anything, or offer anything that enables inspection — no source result
// and no enable request exists before consent, and this release cannot act on
// a confirmation at all.
import { rm } from 'node:fs/promises';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  GLOBAL_HOME_SECRETS,
  GLOBAL_HOME_VARIABLES,
  buildGlobalHomeFixture,
  observeTree,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The repository the session is launched against; the consent page is not about it. */
let repository: string;

/** The four Global homes the environment points at. */
let homes: GlobalHomeFixture;

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-consent-repo-'));
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
 * Opens the consent page the way a reader does and leaves a preview on screen.
 *
 * The offer to work the directories out is clicked only when it is showing:
 * the host is one process for the whole file, so the first test that captures
 * a preview leaves it current for the rest — which is the contract's own
 * behavior (a capture replaces, a read returns what is there) rather than
 * something to reset between cases.
 */
async function openConsentWithPreview(page: Page): Promise<void> {
  await page.goto(host.origin);
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
}

test('is reached from the launch URL by following the inventory entry', async ({ page }) => {
  await page.goto(host.origin);
  const entry = page.getByRole('link', { name: /personal setup/iu });
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page).toHaveURL(/\/global-consent$/u);
  await expect(page.getByRole('heading', { name: /Inspect your personal setup/u })).toBeVisible();
});

test('names the four proposed directories, their origin, and their state', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('link', { name: /personal setup/iu }).click();
  // A fresh session holds no preview, so the reader is offered one — and the
  // offer says that working it out reads nothing. This is the first case to
  // open the page, so the offer is what is showing.
  await expect(page.locator('main')).toContainText('has not worked out which directories');
  await page.getByRole('button', { name: 'Work out the directories' }).click();

  const main = page.locator('main');
  await expect(main).toContainText('GitHub Copilot');
  await expect(main).toContainText('Claude Code');
  await expect(main).toContainText('OpenAI Codex');
  // Every root the environment set, shown as the escaped presentation of the
  // exact value — these homes are ordinary absolute paths, so the escaping is
  // the identity on them.
  for (const home of [
    homes.homes.copilot,
    homes.homes.claude,
    homes.homes.codex,
    homes.homes.agents,
  ]) {
    await expect(main).toContainText(home);
  }
  // Where each came from, and that consent may admit it.
  await expect(main).toContainText('From this tool’s environment variable');
  await expect(main).toContainText('An absolute path, so this tool can be inspected');
  // And the label is stated for what it is, not as something to open.
  await expect(main).toContainText('grants no read access');
});

test('explains the read scope in words and shows no path pattern', async ({ page }) => {
  await openConsentWithPreview(page);

  const main = page.locator('main');
  // The plain-language scope: what is read, and what is not.
  await expect(main).toContainText('customization files');
  await expect(main).toContainText('shared agent directory');
  await expect(main).toContainText('not credentials');
  // Neither version the preview binds is on screen: a reader can act on
  // neither, and the confirmation is where the pair is used.
  await expect(main).not.toContainText('Read scope version');
  await expect(main).not.toContainText('Traversal plan version');
  // And no per-pattern display either: a candidate filename here would be a
  // second allowlist a reader could mistake for the contract. What stands in
  // for both is the plain-language scope above and the exclusions below.
  const text = await main.innerText();
  for (const candidate of ['copilot-instructions.md', 'CLAUDE.md', 'AGENTS.override.md']) {
    expect(text, candidate).not.toContain(candidate);
  }
});

test('states plainly which tools nothing can be inspected for', async ({ page }) => {
  // A separate launch, because the states are decided from the environment the
  // process started with: an empty override and a relative one.
  const unusable = await launchHost(repository, {
    [GLOBAL_HOME_VARIABLES.copilot]: '',
    [GLOBAL_HOME_VARIABLES.claude]: 'relative/claude',
    [GLOBAL_HOME_VARIABLES.codex]: homes.homes.codex,
    // The shared agent home always derives from `homedir()` (FR-045): pinned
    // at the fixture so no launch reaches the developer's real `~/.agents`.
    HOME: homes.home,
  });
  try {
    await page.goto(unusable.origin);
    await page.getByRole('link', { name: /personal setup/iu }).click();
    // Its own host, so its own empty consent state: the offer is showing.
    await page.getByRole('button', { name: 'Work out the directories' }).click();

    const main = page.locator('main');
    await expect(main).toContainText('Set to an empty value');
    await expect(main).toContainText('Not an absolute path');
    // The usable one still says so, so the reader can tell the rows apart.
    await expect(main).toContainText('An absolute path, so this tool can be inspected');
    // The unusable values are shown rather than replaced by the documented
    // default: falling back would authorize a directory the reader never set.
    await expect(main).toContainText('relative/claude');
    await expect(main).not.toContainText('.copilot');
  } finally {
    await stopHost(unusable);
  }
});

test('is reviewable from the keyboard and reads nothing until confirmed', async ({ page }) => {
  await openConsentWithPreview(page);

  // Nothing offers to inspect anything until the reader has said they read
  // what would be: the control is absent rather than disabled, because the
  // answer to "why can I not press this" is the checkbox directly above it.
  await expect(page.getByRole('button', { name: 'Inspect these directories' })).toHaveCount(0);

  // The confirmation is reachable by keyboard and is a plain checkbox — and
  // ticking it is still not consent: it reveals the control that sends one.
  const confirmation = page.getByRole('checkbox');
  await confirmation.focus();
  await expect(confirmation).toBeFocused();
  await page.keyboard.press('Space');
  await expect(confirmation).toBeChecked();
  await expect(page.getByRole('button', { name: 'Inspect these directories' })).toHaveCount(1);

  // No per-tool selector anywhere: one checkbox and one control for the whole
  // preview, so a reader cannot confirm something narrower than what they were
  // shown.
  await expect(page.getByRole('checkbox')).toHaveCount(1);

  // And nothing has been read: no home's credential, and no file content,
  // reaches this page before the confirmation is sent.
  const text = await page.locator('main').innerText();
  for (const secret of Object.values(GLOBAL_HOME_SECRETS)) {
    expect(text).not.toContain(secret);
  }
  expect(text).not.toContain('Body of');
});

test('leaves every byte of all four homes exactly as it found them', async ({ page }) => {
  const before = observeTree(homes.base);
  expect(before.size).toBeGreaterThan(10);

  await openConsentWithPreview(page);
  await page.getByRole('button', { name: 'Work the directories out again' }).click();
  await expect(page.locator('main')).toContainText(
    'An absolute path, so this tool can be inspected',
  );
  // Leaving and coming back reads the current preview rather than capturing a
  // new one, which is the other path through the page.
  await page.getByRole('link', { name: 'Go to the inventory' }).click();
  await page.getByRole('link', { name: /personal setup/iu }).click();
  await expect(page.locator('main')).toContainText(
    'An absolute path, so this tool can be inspected',
  );

  // Nothing under any proposed root was touched. The preview is what a reader
  // reviews before authorizing anything, so a stat, an enumeration, or a read
  // here would mean the product had already looked (FR-023).
  const after = observeTree(homes.base);
  expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
  for (const [path, observed] of after) {
    expect(observed, path).toEqual(before.get(path));
  }
});
