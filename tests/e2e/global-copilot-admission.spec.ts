// T981: the Copilot member of the fixed-four confirmation, as a reader sees it
// (FR-013, FR-014, FR-015, FR-018, FR-023, FR-045).
//
// Copilot's production port is bound with the widened member set, so this
// suite launches the packaged CLI against real fixture homes and asserts what
// the host then actually read. What must hold after one confirmation:
//
//  - The Copilot home publishes every contracted kind — the instruction pair,
//    the personal skill, the `.agent.md` custom agent, the standalone hook
//    file, the JSONC settings document, and the user MCP carrier — and
//    nothing beside them: the vendor's automatically managed state stays
//    unread (FR-015, FR-018).
//  - The shared agent home publishes its personal skill under its own Source,
//    recognized by Codex and Copilot alike, and the personal plugin
//    marketplace's declared plugin (FR-045).
//  - Nothing in any home was modified, and no credential from any of them
//    reaches an inventory surface.
import { rm } from 'node:fs/promises';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import {
  GLOBAL_HOME_SECRETS,
  buildGlobalHomeFixture,
  observeTree,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The repository the session is launched against. */
let repository: string;

/** The four Global homes the environment points at. */
let homes: GlobalHomeFixture;

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-copilot-admission-repo-'));
  writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');
  homes = buildGlobalHomeFixture();
  host = await launchHost(repository, homes.environment, ['--inspect-personal-setup']);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(homes.base, { recursive: true, force: true });
});

test('publishes every contracted Copilot kind from the one confirmation', async ({ page }) => {
  const before = observeTree(homes.base);
  await page.goto(host.origin);
  const panel = page.getByRole('tabpanel');

  // The personal skill, beside the shared agent home's — each a row under its
  // own name, and the shared one recognized by both vendors that document the
  // location (FR-045).
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await expect(panel).toContainText('changelog');
  await expect(panel).toContainText('pathfinder');

  // The user MCP carrier's declared server, one row per name.
  await page.getByRole('tab', { name: /^MCP/u }).click();
  await expect(panel).toContainText('tickets');
  await expect(panel).toContainText('mcp-config.json');

  // The `.agent.md` custom agent, under the name its file is invoked by.
  await page.getByRole('tab', { name: /^Agent/u }).click();
  await expect(panel).toContainText('security-auditor');

  // The standalone hook file's declaration and the settings document's inline
  // one: two carriers, each its own provenance.
  await page.getByRole('tab', { name: /^Hook/u }).click();
  await expect(panel).toContainText('hooks/format-on-save.json');
  await expect(panel).toContainText('settings.json');

  // The user settings document itself, served as the JSONC its author wrote.
  await page.getByRole('tab', { name: /^Settings/u }).click();
  await expect(panel).toContainText('settings.json');

  // The personal marketplace's declared plugin, from the shared agent home.
  await page.getByRole('tab', { name: /^Plugin/u }).click();
  await expect(panel).toContainText('team-tools');

  // Nothing in any home changed: the managed state beside the admitted files
  // was not touched at all (FR-018, FR-023).
  const after = observeTree(homes.base);
  expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
  for (const [path, observed] of after) {
    expect(observed, path).toEqual(before.get(path));
  }
});

test('keeps the excluded Copilot state off every inventory surface', async ({ page }) => {
  await page.goto(host.origin);
  // The managed state's own credential-shaped value lives in `config.json`,
  // which no rule admits (FR-018): a summary surface showing it would have
  // read a file consent does not cover. The admitted files' own literals are
  // detail-page facts, not summary ones (FR-025 governs those pages).
  const text = await page.locator('main').innerText();
  expect(text).not.toContain(GLOBAL_HOME_SECRETS.copilot);
  expect(text).not.toContain('installed-plugins');
  expect(text).not.toContain('mcp-secrets');
});
