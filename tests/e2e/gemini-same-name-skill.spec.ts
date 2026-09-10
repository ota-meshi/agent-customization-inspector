// specs/002-gemini-cli-support T056: browser acceptance for the Gemini CLI
// same-name skill statement. Launches the packaged CLI against a tree where a
// `.gemini/skills/` file and its `.agents/skills/` alias declare one name, opens
// the printed loopback URL, and verifies the one row: both definitions listed,
// the alias file carrying three products, and the statement Gemini CLI's
// documented precedence derives to, in words (spec.md FR-007).
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import {
  buildGeminiSameNameSkillFixture,
  type GeminiSameNameSkillFixture,
} from '../fixtures/repositories/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: GeminiSameNameSkillFixture;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = buildGeminiSameNameSkillFixture('aci-gemini-same-name');
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

test('lists both definitions on one row and states Gemini CLI’s first-found rule', async ({
  page,
}) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items).toHaveCount(1);
  await expect(items.locator('.aci-row-head__name')).toHaveText([fixture.skillName]);
  // Both files under the one name, in path order; the alias file is three
  // products' definition and the `.gemini/skills/` file Gemini CLI's alone.
  await expect(items.locator('.aci-path')).toHaveText([fixture.aliasPath, fixture.ownPath]);
  const lines = items.locator('.aci-source-family-blocks__members > li');
  await expect(lines.nth(0).locator('.aci-recognition-marks__one')).toHaveCount(3);
  await expect(lines.nth(1).locator('.aci-recognition-marks__one')).toHaveCount(1);
  await expect(lines.nth(1)).toContainText('Gemini CLI');

  // The statement, in the words the label table gives the derived rule: the
  // vendor documents the alias over the directory and the workspace over the
  // user tier, so the row says a first-found order and never which file won
  // here (FR-007). The other two products read one file each and state
  // nothing.
  await expect(items).toContainText('Gemini CLI uses the first in its documented source order');
  const text = await items.innerText();
  expect(text).not.toContain('OpenAI Codex keeps all of them');
  expect(text).not.toContain('GitHub Copilot depends on the surface');
});
