// specs/003-antigravity-cli-support T038: browser acceptance for the
// Antigravity CLI repository hooks carrier. A `.agents/hooks.json` maps a hook
// *name* to that hook's events, so one carrier can declare one event twice and
// the two lines are told apart by the name their author wrote; a named hook's
// own `enabled` key travels beside it as the file's own key, never rendered as
// "disabled" — whether a hook runs is runtime this product does not observe
// (contracts/vendors/antigravity-cli.md § Known uncertainties item 9; FR-020).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-antigravity-hooks-'));
  await mkdir(join(fixture, '.agents'), { recursive: true });
  await mkdir(join(fixture, 'scripts'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/hooks.json'),
    JSON.stringify(
      {
        'lint-on-write': {
          PostToolUse: [
            {
              matcher: 'write_file',
              hooks: [{ type: 'command', command: './scripts/lint.sh', timeout: 10 }],
            },
          ],
        },
        'audit-writes': {
          PostToolUse: [{ matcher: 'run_command', hooks: [{ command: './scripts/audit.sh' }] }],
        },
        'safety-gate': {
          enabled: false,
          PreToolUse: [
            { matcher: 'run_command', hooks: [{ command: './scripts/safety-check.sh' }] },
          ],
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(join(fixture, 'scripts/lint.sh'), '#!/bin/sh\nexit 0\n', 'utf8');
  await writeFile(join(fixture, 'scripts/audit.sh'), '#!/bin/sh\nexit 0\n', 'utf8');
  await writeFile(join(fixture, 'scripts/safety-check.sh'), '#!/bin/sh\nexit 0\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('publishes each declared event, with the carrier stated once per event', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Hook/u }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('PostToolUse');
  await expect(panel).toContainText('PreToolUse');
  await expect(panel).toContainText('.agents/hooks.json');
  await expect(panel).toContainText('Antigravity CLI');
});

test('lists the carrier once per event, however many named hooks declare it', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Hook/u }).click();
  const row = page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: 'PostToolUse' })
    .first();
  // Two named hooks declare `PostToolUse` in this one file. The row's unit is
  // the declared event and its lines are one per carrier, so the file is one
  // line here and the names that tell the two blocks apart belong to the
  // detail (`api-types.ts` § DeclaredHookDto).
  await expect(row.locator('.aci-row-file')).toHaveCount(1);
  await expect(row).toContainText('.agents/hooks.json');
});

test('names each declaration by its event and the hook the file wrote', async ({ page }) => {
  await page.goto(new URL('/hooks/detail/repository/.agents%2Fhooks.json', host.origin).toString());
  const main = page.locator('main');
  // Two named hooks declare `PostToolUse` here, so a section's subject is one
  // declaration rather than one event: two sections headed alike over
  // near-identical documents would be indistinguishable. The two halves are
  // joined by the word `in` rather than a symbol, because a symbol can appear
  // inside an authored name.
  await expect(main.getByRole('heading', { name: 'PostToolUse in lint-on-write' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'PostToolUse in audit-writes' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'PreToolUse in safety-gate' })).toBeVisible();
  // Each document starts at the hook's name, which is the shape the file wrote
  // and the shape a reader pastes back.
  await expect(main).toContainText('"lint-on-write"');
  await expect(main).toContainText('write_file');
  await expect(main).toContainText('./scripts/lint.sh');
});

test('heads a declaration view’s sections by the name alone', async ({ page }) => {
  await page.goto(
    new URL(
      '/hooks/detail/repository/.agents%2Fhooks.json?event=PostToolUse',
      host.origin,
    ).toString(),
  );
  const main = page.locator('main');
  // The page is already headed by the event, so a section repeating it would
  // print the event three times on one screen and bury the one word that
  // tells the two sections apart behind a prefix they share. The name leads
  // alone here, which is what a reader skimming headings hears first.
  await expect(main.getByRole('heading', { name: 'lint-on-write', exact: true })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'audit-writes', exact: true })).toBeVisible();
  await expect(main.getByRole('heading', { name: /PostToolUse in/u })).toHaveCount(0);
  // The other event's declaration is not this view's subject.
  await expect(main).not.toContainText('safety-gate');
});

test('leaves a single declaration view’s section unheaded', async ({ page }) => {
  await page.goto(
    new URL(
      '/hooks/detail/repository/.agents%2Fhooks.json?event=PreToolUse',
      host.origin,
    ).toString(),
  );
  // One section under a page already headed by the event: a heading here
  // would repeat what the page just said.
  const main = page.locator('main');
  await expect(main).toContainText('"safety-gate"');
  await expect(main.getByRole('heading', { name: 'safety-gate', exact: true })).toHaveCount(0);
});

test('shows a hook’s own `enabled` key as the key it is, judging nothing', async ({ page }) => {
  await page.goto(new URL('/hooks/detail/repository/.agents%2Fhooks.json', host.origin).toString());
  const main = page.locator('main');
  // The documented per-hook flag travels inside its hook's document. Nothing
  // interprets it: no badge, no state line, and no word calling the hook
  // disabled — whether a hook runs is runtime this product does not observe.
  await expect(main).toContainText('"enabled": false');
  const text = await main.innerText();
  expect(text.toLowerCase()).not.toContain('inactive');
  expect(text.toLowerCase()).not.toContain('disabled');
  await expect(page.getByRole('button', { name: /run|execute|enable|disable/iu })).toHaveCount(0);
});
