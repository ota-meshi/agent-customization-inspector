// specs/002-gemini-cli-support T042: the Gemini CLI member of the fixed-five
// confirmation, as a reader sees it (spec.md FR-010 through FR-012, FR-016;
// parent FR-013, FR-014, FR-018, FR-023).
//
// Gemini CLI's production port is bound, so this suite launches the packaged
// CLI against real fixture homes — `GEMINI_CLI_HOME` naming the directory the
// `.gemini` is below, as the vendor documents the setting — and asserts what
// the host then actually read. What must hold after one confirmation:
//
//  - The Gemini CLI home is inspected from the one shared batch, as its own
//    Source, beside the other four members.
//  - It publishes every contracted kind — the context file, the JSONC settings
//    document with its MCP servers and hooks, the namespaced commands, the
//    personal skill, the sub-agent, and the policy file — and nothing beside
//    them: the extension copies, the trust record, the environment file, the
//    credentials, and the temporary state stay unread (FR-016).
//  - The shared agent home's skill carries this vendor's mark beside Codex's
//    and Copilot's (FR-013).
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
  repository = mkdtempSync(join(tmpdir(), 'aci-gemini-admission-repo-'));
  writeFileSync(join(repository, 'GEMINI.md'), '# repository context\n', 'utf8');
  homes = buildGlobalHomeFixture();
  host = await launchHost(repository, homes.environment, ['--inspect-personal-setup']);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(homes.base, { recursive: true, force: true });
});

test('inspects the Gemini CLI home as its own Source from the one confirmation', async ({
  page,
}) => {
  await page.goto(host.origin);
  // The consented home is stated by its own escaped root — the `.gemini`
  // below the directory the variable named, which is the join the capture
  // performs and the fixture's `homes.gemini` already is (FR-011).
  const personal = await openPersonalSetup(page);
  await expect(personal).toContainText(homes.homes.gemini);

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
    'Gemini home — Inspected',
    'Shared agent home — Inspected',
  ]);
  await expect(main).toContainText('5 of these directories were read');
});

test('publishes the one GEMINI.md instruction row beside the repository’s own', async ({
  page,
}) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Instructions/u }).click();
  const addresses = await page
    .getByRole('tabpanel')
    .locator('.aci-row-file a')
    .evaluateAll((anchors) =>
      anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
    );
  // The home's one context file, under its own Source, beside the
  // repository's file of the same name — two Sources, one path each (FR-010,
  // FR-030). The home's `settings.json` names other context filenames and
  // changes nothing here: the home admits `GEMINI.md` alone (spec.md
  // § Clarifications).
  expect(addresses).toContain('/instructions/detail/global-gemini/GEMINI.md');
  expect(addresses).toContain('/instructions/detail/repository/GEMINI.md');
  expect(
    addresses.filter((address) => address.startsWith('/instructions/detail/global-gemini/')),
  ).toEqual(['/instructions/detail/global-gemini/GEMINI.md']);
});

test('publishes every contracted Gemini CLI kind from the one confirmation', async ({ page }) => {
  await page.goto(host.origin);
  const panel = page.getByRole('tabpanel');

  // The personal skill under its authored name, and the shared agent home's
  // skill recognized by the three vendors that document the location
  // (FR-013).
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await expect(panel).toContainText('changelog');
  const shared = panel.locator('.aci-item').filter({ hasText: 'pathfinder' });
  await expect(shared).toContainText('Gemini CLI');
  await expect(shared).toContainText('OpenAI Codex');
  await expect(shared).toContainText('GitHub Copilot');

  // The namespaced personal commands: subdirectories form the name, `.toml`
  // is dropped.
  await page.getByRole('tab', { name: /^Prompt/u }).click();
  await expect(panel).toContainText('git:commit');
  await expect(panel).toContainText('refactor');

  // The personal sub-agent; the nested archive stays a near miss.
  await page.getByRole('tab', { name: /^Agent/u }).click();
  await expect(panel).toContainText('reviewer');
  await expect(panel).not.toContainText('agents/archive/old.md');

  // The user policy file is a permissions policy; the nested one is not.
  await page.getByRole('tab', { name: /^Permissions/u }).click();
  await expect(panel).toContainText('policies/safety.toml');
  await expect(panel).not.toContainText('policies/archive/old.toml');

  // The settings document, its MCP servers, and its contained hooks: three
  // rules over one candidate, read once.
  await page.getByRole('tab', { name: /^Settings/u }).click();
  await expect(panel).toContainText('settings.json');
  await page.getByRole('tab', { name: /^MCP/u }).click();
  await expect(panel).toContainText('github');
  await expect(panel).toContainText('docs');
  await page.getByRole('tab', { name: /^Hook/u }).click();
  await expect(panel).toContainText('BeforeTool');

  // Nothing the exclusion names reaches any inventory surface (FR-016,
  // FR-018): not the extension copy, the trust record, the credentials, the
  // account list, the temporary state, or the hook script.
  const text = await page.locator('main').innerText();
  for (const excluded of [
    'extensions/security-tools',
    'gemini-extension.json',
    'trustedFolders.json',
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
      '/settings-and-configuration/detail/global-gemini/settings.json',
      host.origin,
    ).toString(),
  );
  const main = page.locator('main');
  // The JSONC as written, comment included.
  await expect(main).toContainText('// Personal defaults for every project.');
  await expect(main).toContainText('"vimMode": true');
  // The context file's environment reference, unresolved (FR-026).
  await page.goto(new URL('/instructions/detail/global-gemini/GEMINI.md', host.origin).toString());
  await expect(main).toContainText(GLOBAL_HOME_ENVIRONMENT_REFERENCES.gemini);
  // And no credential-shaped literal from any home on the inventory, because
  // no file holding one was read.
  await page.goto(host.origin);
  const text = await page.locator('main').innerText();
  for (const secret of Object.values(GLOBAL_HOME_SECRETS)) {
    expect(text).not.toContain(secret);
  }
});

test('shows the home’s policy file whole, as the permissions document it is', async ({ page }) => {
  await page.goto(
    new URL('/permissions/detail/global-gemini/policies/safety.toml', host.origin).toString(),
  );
  const main = page.locator('main');
  await expect(page.getByRole('heading', { name: 'policies/safety.toml' })).toBeVisible();
  // The user policy file is published as the one document its author wrote:
  // its rules as TOML, byte for byte, with nothing read out of it and no
  // control that would apply, allow, or deny anything (FR-025).
  await expect(page.locator('.aci-detail-attributes')).toContainText('Gemini CLI');
  await expect(main).toContainText('[[rule]]');
  await expect(main).toContainText('commandPrefix = "rm -rf"');
  await expect(main).toContainText('decision = "deny"');
  await expect(page.getByRole('button', { name: /apply|allow|deny|trust|run/iu })).toHaveCount(0);
});

test('leaves every byte of all five homes exactly as it found them', async ({ page }) => {
  const before = observeTree(homes.base);
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Settings/u }).click();
  await page.goto(
    new URL(
      '/settings-and-configuration/detail/global-gemini/settings.json',
      host.origin,
    ).toString(),
  );
  const after = observeTree(homes.base);
  expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
  for (const [path, observed] of after) {
    expect(observed, path).toEqual(before.get(path));
  }
});
