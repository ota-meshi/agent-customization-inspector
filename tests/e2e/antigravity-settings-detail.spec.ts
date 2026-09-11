// specs/003-antigravity-cli-support T050: browser acceptance for the one home
// file three recognitions read. `antigravity-cli/settings.json` is admitted as
// the settings document it is, as the permission policy its `permissions`
// object declares, and as the hook carrier its inline block makes it — the
// arrangement `.claude/settings.json` and `.codex/config.toml` already have.
//
// What must hold: each surface lists the file once and no surface lists it
// twice, and which detail answers for it follows from the row a reader arrived
// through rather than from the file (FR-007, FR-011).
import { rm } from 'node:fs/promises';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import {
  buildGlobalHomeFixture,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The carrier under test, as its Source-relative Path spells it. */
const CARRIER = 'antigravity-cli/settings.json';

let repository: string;
let homes: GlobalHomeFixture;
let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-antigravity-settings-repo-'));
  writeFileSync(join(repository, 'GEMINI.md'), '# repository context\n', 'utf8');
  homes = buildGlobalHomeFixture();
  host = await launchHost(repository, homes.environment, ['--inspect-personal-setup']);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(homes.base, { recursive: true, force: true });
});

/** Every address the open inventory tab links to. */
async function addressesOf(page: import('@playwright/test').Page): Promise<string[]> {
  return page
    .getByRole('tabpanel')
    .locator('a')
    .evaluateAll((anchors) =>
      anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
    );
}

test('reaches three surfaces, each listing the one carrier once', async ({ page }) => {
  await page.goto(host.origin);
  for (const [tab, segment] of [
    [/^Settings/u, '/settings-and-configuration/detail/global-antigravity/'],
    [/^Permissions/u, '/permissions/detail/global-antigravity/'],
    [/^Hook/u, '/hooks/detail/global-antigravity/'],
  ] as const) {
    await page.getByRole('tab', { name: tab }).click();
    const addresses = (await addressesOf(page)).map((address) => decodeURIComponent(address));
    const mine = addresses.filter(
      (address) => address.startsWith(segment) && address.includes(CARRIER),
    );
    // The carrier is linked from this surface, and its links address the one
    // file: a second row for the same file would be the same document
    // published twice (FR-007). Several links to one address are one row's —
    // a detail link and its comparison entry — so the addresses are counted
    // rather than the anchors.
    expect(new Set(mine).size, segment).toBe(1);
  }
  // The home's other hook carrier is a separate file rather than a second row
  // for this one: a `config/hooks.json` and this document's inline block are
  // two carriers, which is what the hook surface lists.
  await page.getByRole('tab', { name: /^Hook/u }).click();
  const hookAddresses = (await addressesOf(page)).map((address) => decodeURIComponent(address));
  expect(hookAddresses).toContain('/hooks/detail/global-antigravity/config/hooks.json');
});

test('serves the document whole under its settings row', async ({ page }) => {
  await page.goto(
    new URL(
      `/settings-and-configuration/detail/global-antigravity/${encodeURIComponent(CARRIER)}`,
      host.origin,
    ).toString(),
  );
  const main = page.locator('main');
  // The kind's row unit is the file, so the whole document its author wrote is
  // the answer — the permission lists and the hook block visible here too,
  // which is the one document seen under its own row rather than a second
  // publication of one fact.
  await expect(main).toContainText('"colorScheme": "dark"');
  await expect(main).toContainText('permissions');
});

test('serves the policy alone under its permissions row', async ({ page }) => {
  await page.goto(
    new URL(
      `/permissions/detail/global-antigravity/${encodeURIComponent(CARRIER)}`,
      host.origin,
    ).toString(),
  );
  const main = page.locator('main');
  await expect(page.locator('.aci-detail-attributes')).toContainText('Antigravity CLI');
  // The three access lists as their author wrote them, and nothing to act on:
  // the documented deny-then-ask-then-allow precedence is a composition
  // record rather than an ordering this page performs (FR-025).
  await expect(main).toContainText('command(rm -rf)');
  await expect(page.getByRole('button', { name: /apply|allow|deny|trust|run/iu })).toHaveCount(0);
});

test('serves the inline block alone under its hook row', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Hook/u }).click();
  const link = page
    .getByRole('tabpanel')
    .locator('a[href*="/hooks/detail/global-antigravity/"]')
    .first();
  await link.click();
  await expect(page).toHaveURL(/\/hooks\/detail\/global-antigravity\//u);
  // A file admitted so its declarations can be published shows those
  // declarations and never its own bytes (FR-007), so the settings keys
  // around the block are not here.
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('"colorScheme"');
});
