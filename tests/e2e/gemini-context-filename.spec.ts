// specs/002-gemini-cli-support T056: browser acceptance for the configured
// context filename. Launches the packaged CLI against a tree whose root
// `.gemini/settings.json` names `AGENTS.md` and `CONTEXT.md` as the context
// files, opens the printed loopback URL, and verifies what a reader sees: the
// configured names carry the Gemini CLI mark at the root and below it, the
// root `GEMINI.md` carries Copilot's alone, and the nested default is listed
// nowhere (spec.md FR-004, FR-013).
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import {
  buildGeminiContextFilenameFixture,
  type GeminiContextFilenameFixture,
} from '../fixtures/repositories/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: GeminiContextFilenameFixture;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = buildGeminiContextFilenameFixture('aci-gemini-context-filename');
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

test('marks the configured names as Gemini CLI’s and leaves the default to Copilot', async ({
  page,
}) => {
  await page.goto(host.origin);
  await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
  const panel = page.getByRole('tabpanel');
  const entryFor = (path: string) =>
    panel
      .locator('.aci-source-family-blocks__members > li')
      .filter({ has: page.getByText(path, { exact: true }) });

  // The configured names are the context files at every depth: the root
  // `AGENTS.md` is three products' file, the nested one Copilot's and Gemini
  // CLI's, and `CONTEXT.md` Gemini CLI's alone (FR-004).
  const rootAgents = entryFor('AGENTS.md');
  await expect(rootAgents.locator('.aci-tool-mark--gemini')).toHaveCount(1);
  await expect(rootAgents.locator('.aci-tool-mark--codex')).toHaveCount(1);
  await expect(rootAgents.locator('.aci-tool-mark--copilot')).toHaveCount(1);
  await expect(entryFor('packages/api/AGENTS.md').locator('.aci-tool-mark--gemini')).toHaveCount(1);
  await expect(entryFor('CONTEXT.md').locator('.aci-recognition-marks__one')).toHaveCount(1);
  await expect(entryFor('CONTEXT.md')).toContainText('Gemini CLI');
  await expect(entryFor('docs/CONTEXT.md')).toContainText('Gemini CLI');

  // The default filename the configuration replaced: Copilot's root
  // alternative alone, and the nested one no row at all (FR-013).
  const gemini = entryFor(fixture.copilotOnlyPath);
  await expect(gemini.locator('.aci-recognition-marks__one')).toHaveCount(1);
  await expect(gemini.locator('.aci-tool-mark--copilot')).toHaveCount(1);
  await expect(gemini.locator('.aci-tool-mark--gemini')).toHaveCount(0);
  const text = await page.locator('main').innerText();
  for (const nearMiss of fixture.nearMissPaths) {
    expect(text, nearMiss).not.toContain(nearMiss);
  }
});

test('narrows to Gemini CLI and drops the root GEMINI.md with the other products', async ({
  page,
}) => {
  await page.goto(host.origin);
  const panel = page.getByRole('tabpanel');
  await page.getByLabel('Tool').selectOption('gemini');
  const paths = await panel.locator('.aci-item .aci-path').allInnerTexts();
  expect(paths).toEqual(fixture.expectedInstructionPaths);
  expect(paths).not.toContain(fixture.copilotOnlyPath);
});
