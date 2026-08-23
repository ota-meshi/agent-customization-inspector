// T405: browser acceptance for the Codex rule inventory (Phase 35). Launches
// the packaged CLI against a fixture whose root `.codex/` layer carries rule
// files, opens the printed loopback URL, and verifies the rendered rows — one
// row per admitted rule file, headed by its Source-relative Path with the
// recognizing product and its surfaces inside it — beside the unchanged
// instruction rows, the filters, the near misses' absence, an unreadable
// file's diagnostic, and the absence of anything a rule declares.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection); what is asserted here is what a user
// can see of them.
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openNoKindDisclosure } from './no-kind-disclosure';

/** A literal credential in a declared pattern, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2ERULES00000000000000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_RULES_ENDPOINT}';

test.describe('rule files at the root configuration layer', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-rules-'));
    await mkdir(join(fixture, '.codex/rules'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/rules/default.rules'),
      [
        'prefix_rule(',
        '    pattern = ["gh", "pr", "view"],',
        '    decision = "prompt",',
        ')',
        '',
      ].join('\n'),
      'utf8',
    );
    // The credential and the environment reference are authored text this
    // file happens to contain. Neither may reach a row, and nothing resolves
    // the reference against the process environment (FR-026, FR-027).
    await writeFile(
      join(fixture, '.codex/rules/deploy.rules'),
      [
        'prefix_rule(',
        `    pattern = ["curl", "-H", "Authorization: Bearer ${FIXTURE_SECRET}"],`,
        '    decision = "forbidden",',
        `    justification = "Endpoint ${ENVIRONMENT_REFERENCE} is unreachable.",`,
        ')',
        '',
      ].join('\n'),
      'utf8',
    );
    // Near miss: the page documents no recursion under a layer's `rules/`.
    await mkdir(join(fixture, '.codex/rules/team'), { recursive: true });
    await writeFile(join(fixture, '.codex/rules/team/review.rules'), 'nested\n', 'utf8');
    // Near miss: a descendant `.codex` layer belongs to a runtime working
    // directory this product never selects.
    await mkdir(join(fixture, 'packages/api/.codex/rules'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.codex/rules/default.rules'),
      'descendant\n',
      'utf8',
    );
    // Near miss: the extension and the container literals are exact.
    await writeFile(join(fixture, '.codex/rules/notes.rules.bak'), 'suffix\n', 'utf8');
    await mkdir(join(fixture, '.codex/rule'), { recursive: true });
    await writeFile(join(fixture, '.codex/rule/default.rules'), 'singular\n', 'utf8');
    // The unchanged instruction row beside the new rule rows.
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per rule file, named by its path, with its product', async ({ page }) => {
    await page.goto(host.origin);
    // Instructions sort first in the closed kind order and rules sort after
    // the MCP carriers, so the rule tab is the one to select here; its badge
    // counts one row per rule file.
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    await page.getByRole('tab', { name: /Permissions/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One row per admitted file in Source-relative Path order, each headed by
    // its path with the recognizing product and its surfaces inside it.
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-path')).toHaveText([
      '.codex/rules/default.rules',
      '.codex/rules/deploy.rules',
    ]);
    for (const index of [0, 1]) {
      await expect(items.nth(index).locator('.aci-permissions-row__owner')).toContainText(
        'OpenAI Codex',
      );
    }
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 2 of 2',
    );
    // Nothing a rule declares reaches the inventory — a pattern, a decision, a
    // justification, or a credential inside one — and nothing resolves the
    // environment reference. The near misses appear nowhere on the page, and
    // no control offers to apply, enforce, or test a rule.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('prefix_rule');
    expect(text).not.toContain('forbidden');
    expect(text).not.toContain('.codex/rules/team/review.rules');
    expect(text).not.toContain('packages/api/.codex/rules/default.rules');
    expect(text).not.toContain('notes.rules.bak');
    expect(text).not.toContain('.codex/rule/default.rules');
    await expect(page.getByRole('tabpanel').getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /apply|enforce|allow|block/iu })).toHaveCount(0);
  });

  test('keeps the instruction rows exactly as their own phase committed them', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['AGENTS.md']);
    const instructionsText = await page.getByRole('tabpanel').innerText();
    expect(instructionsText).not.toContain('.rules');
  });

  test('narrows the rule rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Permissions/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);

    // Tool: the rule files are Codex's recognition alone, so selecting Codex
    // keeps both rows and no other product's selection is offered a rule row.
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items).toHaveCount(2);

    // Path: the filter applies to the row's own path, which is its identity.
    await page.getByLabel('Path contains').fill('deploy');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-path')).toHaveText(['.codex/rules/deploy.rules']);

    await page.getByLabel('Path contains').fill('no-such-rule');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
  });
});

test.describe('a rule file whose bytes cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-rules-unreadable-'));
    await mkdir(join(fixture, '.codex/rules'), { recursive: true });
    await writeFile(join(fixture, '.codex/rules/default.rules'), 'prefix_rule()\n', 'utf8');
    // A link whose target is missing: the candidate exists and its read
    // failed, which is a file-confined outcome the page has to be able to
    // state (FR-028).
    await symlink(
      join(fixture, 'no-such-target.rules'),
      join(fixture, '.codex/rules/broken.rules'),
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists it under the files in no kind with its diagnostic', async ({ page }) => {
    await page.goto(host.origin);
    // A candidate whose bytes were never accepted gains no recognition, so no
    // kind tab can list it: the rule tab holds the readable file alone.
    await page.getByRole('tab', { name: /Permissions/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);
    await expect(items.first().locator('.aci-path')).toHaveText('.codex/rules/default.rules');

    // The scan status says how many files kept a diagnostic, which is what its
    // `Partial` value reports; the causes themselves are on those files' rows.
    await expect(page.locator('.aci-scan-progress')).toContainText(
      '1 file(s) kept a diagnostic of their own',
    );

    // The unreadable candidate is still reachable, and is where a `partial`
    // generation says which file made it partial. The section arrives closed,
    // stating its count on the summary, so a reader who is not looking for it
    // is not given the whole list under the tab they are reading (T1124).
    await expect(page.getByRole('heading', { name: 'Files in no kind' })).toBeVisible();
    await expect(page.locator('.aci-inventory-page__no-kind-count')).toHaveText('1');
    await expect(page.locator('.aci-inventory-page__no-kind .aci-item')).toBeHidden();

    const unclassifiedRows = (await openNoKindDisclosure(page)).locator('.aci-item');
    await expect(unclassifiedRows).toHaveCount(1);
    await expect(unclassifiedRows.first()).toContainText('.codex/rules/broken.rules');
    await expect(unclassifiedRows.first()).toContainText('This file could not be read.');
  });
});
