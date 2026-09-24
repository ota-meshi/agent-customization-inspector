// specs/003-antigravity-cli-support T050: the Antigravity home member of the
// fixed-five confirmation, as a reader sees it (spec.md § FR-008 through
// § FR-011; parent FR-013, FR-014, FR-018, FR-023).
//
// This suite launches the packaged CLI against real fixture homes and asserts
// what the host then actually read. The member's root is not exported: no
// cited page documents an environment property that relocates it, so the home
// directory the launch points at is what locates the `.gemini` below it
// (spec.md § FR-008). What must hold after one confirmation:
//
//  - The Antigravity home is inspected from the one shared batch, as its own
//    Source, beside the other four members.
//  - It publishes every contracted kind — the context file, the shared
//    configuration directory's MCP carrier, hook carrier, custom agent and
//    skill, the terminal's own skills in both admitted shapes, and the
//    settings document under its three recognitions — and nothing beside
//    them: the installed plugin copies, the other two products' private
//    directories, the credentials, and the conversation state stay unread
//    (FR-010).
//  - The shared agent home's skill carries Codex's and Copilot's marks and
//    not this vendor's, which reads no `~/.agents` (FR-045).
//  - Nothing in any home was modified, and no credential from any of them
//    reaches a surface.
import { rm } from 'node:fs/promises';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import {
  GLOBAL_HOME_ENVIRONMENT_REFERENCES,
  GLOBAL_HOME_SECRETS,
  buildGlobalHomeFixture,
  observeTree,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openPersonalSetup } from './repository-status';

/** The repository the session is launched against. */
let repository: string;

/** The five Global homes the environment points at. */
let homes: GlobalHomeFixture;

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-antigravity-admission-repo-'));
  writeFileSync(join(repository, 'GEMINI.md'), '# repository context\n', 'utf8');
  homes = buildGlobalHomeFixture();
  host = await launchHost(repository, homes.environment, ['--inspect-personal-setup']);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(homes.base, { recursive: true, force: true });
});

test('inspects the Antigravity home as its own Source from the one confirmation', async ({
  page,
}) => {
  await page.goto(host.origin);
  // The consented home is stated by its own escaped root — the `.gemini`
  // below the directory the variable named, which is the join the capture
  // performs and the fixture's `homes.antigravity` already is (FR-011).
  const personal = await openPersonalSetup(page);
  await expect(personal).toContainText(homes.homes.antigravity);

  await page.goto(new URL('/global-consent', host.origin).toString());
  const main = page.locator('main');
  await expect(main).toContainText('Scan status');
  // All five members were read, each stating its own outcome from the one
  // shared batch (FR-014), in the closed member order.
  const outcomes = await page.locator('.aci-global-consent-page__outcomes li').allInnerTexts();
  expect(outcomes).toEqual([
    'Copilot home — Inspected',
    'Claude home — Inspected',
    'Codex home — Inspected',
    'Antigravity home — Inspected',
    'Shared agent home — Inspected',
  ]);
  await expect(main).toContainText('5 of these directories were read');
});

test('publishes the home’s four context files beside the repository’s own', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Instructions/u }).click();
  const addresses = await page
    .getByRole('tabpanel')
    .locator('.aci-row-file a')
    .evaluateAll((anchors) =>
      anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
    );
  // The home's four context files, under their own Source, beside the
  // repository's file of the same name — two Sources, one path each (FR-010,
  // FR-030). The Rules page names `GEMINI.md` and `AGENTS.md` directly in the
  // home and in its `config/`, and nothing else there is a context file
  // (spec.md FR-009).
  expect(addresses).toContain('/instructions/detail/repository/GEMINI.md');
  expect(
    addresses
      .filter((address) => address.startsWith('/instructions/detail/global-antigravity/'))
      .toSorted(),
  ).toEqual([
    '/instructions/detail/global-antigravity/AGENTS.md',
    '/instructions/detail/global-antigravity/GEMINI.md',
    '/instructions/detail/global-antigravity/config/AGENTS.md',
    '/instructions/detail/global-antigravity/config/GEMINI.md',
  ]);
});

test('publishes every contracted Antigravity CLI kind from the one confirmation', async ({
  page,
}) => {
  await page.goto(host.origin);
  const panel = page.getByRole('tabpanel');

  // Skill folders at both documented global roots: the shared configuration
  // directory's and the terminal's own. The folder that declares no `name`
  // takes its folder, which is what every product resolving a `SKILL.md` does
  // (contracts/vendors/antigravity-cli.md § Known uncertainties item 7). The
  // flat Markdown file beside them is no skill (spec.md § FR-004).
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await expect(panel).toContainText('changelog');
  await expect(panel).toContainText('release-notes');
  await expect(panel).not.toContainText('refactor');
  // The shared agent home's skill names the two products that document that
  // location; this vendor is not one of them (FR-045).
  const shared = panel.locator('.aci-item').filter({ hasText: 'pathfinder' });
  await expect(shared).toContainText('OpenAI Codex');
  await expect(shared).toContainText('GitHub Copilot');
  await expect(shared).not.toContainText('Antigravity CLI');

  // The global custom agents in both admitted shapes — the file directly below
  // `config/agents/` and the `agent.md` inside its own directory there — while
  // a directory whose file is not that entry point stays a near miss.
  await page.getByRole('tab', { name: /^Agent/u }).click();
  await expect(panel).toContainText('reviewer');
  await expect(panel).toContainText('triage');
  await expect(panel).not.toContainText('config/agents/archive/old.md');

  // The modular global rules, one row per file directly in either rules
  // directory, while a second level below one stays a near miss.
  await page.getByRole('tab', { name: /^Rule/u }).click();
  await expect(panel).toContainText('config/rules/style.md');
  await expect(panel).toContainText('antigravity-cli/rules/terse.md');
  await expect(panel).not.toContainText('config/rules/archive/old.md');

  // The settings document's permission policy, one row for the file.
  await page.getByRole('tab', { name: /^Permissions/u }).click();
  await expect(panel).toContainText('antigravity-cli/settings.json');

  // The settings document, the shared directory's MCP servers, and the two
  // hook carriers: the standalone `config/hooks.json` and the settings
  // document's inline block.
  await page.getByRole('tab', { name: /^Settings/u }).click();
  await expect(panel).toContainText('antigravity-cli/settings.json');
  await page.getByRole('tab', { name: /^MCP/u }).click();
  await expect(panel).toContainText('github');
  await expect(panel).toContainText('internal-docs');
  await page.getByRole('tab', { name: /^Hook/u }).click();
  await expect(panel).toContainText('PostToolUse');
  await expect(panel).toContainText('PreToolUse');

  // Nothing the exclusions name reaches any inventory surface (FR-010,
  // FR-018): not the installed plugin copies or the manifest that tracks
  // them, not the other two products' private directories, and not the
  // credentials, conversation state, or hook script.
  const text = await page.locator('main').innerText();
  for (const excluded of [
    'antigravity-cli/plugins/security-tools',
    'import_manifest.json',
    'antigravity/skills/desktop-only',
    'antigravity-ide/skills/ide-only',
    'oauth_creds.json',
    'google_accounts.json',
    'tmp/session.json',
    'hooks/audit.sh',
  ]) {
    expect(text, excluded).not.toContain(excluded);
  }
});

test('shows the home’s settings whole, and no credential from any home', async ({ page }) => {
  await page.goto(
    new URL(
      '/settings-and-configuration/detail/global-antigravity/antigravity-cli%2Fsettings.json',
      host.origin,
    ).toString(),
  );
  const main = page.locator('main');
  // The document whole, the three access lists among its other keys: the
  // settings row's subject is the file (FR-011).
  await expect(main).toContainText('"colorScheme": "dark"');
  await expect(main).toContainText('command(rm -rf)');
  // The context file's environment reference, unresolved (FR-026).
  await page.goto(
    new URL('/instructions/detail/global-antigravity/GEMINI.md', host.origin).toString(),
  );
  await expect(main).toContainText(GLOBAL_HOME_ENVIRONMENT_REFERENCES.antigravity);
  // And no credential-shaped literal from any home on the inventory, because
  // no file holding one was read.
  await page.goto(host.origin);
  const text = await page.locator('main').innerText();
  for (const secret of Object.values(GLOBAL_HOME_SECRETS)) {
    expect(text).not.toContain(secret);
  }
});

test('shows the home’s permission policy as written, with nothing to act on', async ({ page }) => {
  await page.goto(
    new URL(
      '/permissions/detail/global-antigravity/antigravity-cli%2Fsettings.json',
      host.origin,
    ).toString(),
  );
  const main = page.locator('main');
  await expect(page.locator('.aci-detail-attributes')).toContainText('Antigravity CLI');
  // The three access lists as their author wrote them, each entry the literal
  // `action(target)` text: nothing is matched against a command, a path, or a
  // URL, and the documented deny-then-ask-then-allow precedence is a
  // composition record rather than an ordering this page performs (FR-025).
  await expect(main).toContainText('command(rm -rf)');
  await expect(main).toContainText('command(*)');
  await expect(main).toContainText('read_file(/var/log/app)');
  await expect(page.getByRole('button', { name: /apply|allow|deny|trust|run/iu })).toHaveCount(0);
});

test('leaves every byte of all five homes exactly as it found them', async ({ page }) => {
  const before = observeTree(homes.base);
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Settings/u }).click();
  await page.goto(
    new URL(
      '/settings-and-configuration/detail/global-antigravity/antigravity-cli%2Fsettings.json',
      host.origin,
    ).toString(),
  );
  const after = observeTree(homes.base);
  expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
  for (const [path, observed] of after) {
    expect(observed, path).toEqual(before.get(path));
  }
});
