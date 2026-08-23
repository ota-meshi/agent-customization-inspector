// T414: browser acceptance for the Codex rule detail (Phase 36). Launches the
// packaged CLI against a fixture whose root `.codex/` layer carries rule
// files, opens one from the rule tab, and verifies the complete literal
// detail: the file's whole authored source, a credential shown exactly as
// authored with no masking or reveal control, a literal environment reference
// never replaced by the process value a same-named variable carries in the
// host's own environment, the read-outcome line, navigation back to the rule
// tab, the dead-link state for a path this scan holds no rule at — a
// candidate whose bytes were never accepted among them — and the absence of
// anything that would apply, enforce, or run what a rule declares.
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openNoKindDisclosure } from './no-kind-disclosure';

/** A literal credential in a declared pattern, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ERULEDETAIL00000000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_RULE_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** A token only the sibling rule carries, so a page showing it is wrong. */
const SIBLING_ONLY_TOKEN = 'sibling-rule-only-token';

/** The complete authored text of the rule the detail cases open. */
const DEPLOY_RULE = [
  '# Blocks the deploy script outside the sandbox.',
  'prefix_rule(',
  `    pattern = ["curl", "-H", "Authorization: Bearer ${FIXTURE_SECRET}"],`,
  '    decision = "forbidden",',
  `    justification = "Endpoint ${ENVIRONMENT_REFERENCE} is unreachable; see ./scripts/deploy.sh.",`,
  ')',
  '',
].join('\n');

test.describe('the complete literal Codex rule detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-rules-detail-'));
    await mkdir(join(fixture, '.codex/rules'), { recursive: true });
    await writeFile(join(fixture, '.codex/rules/deploy.rules'), DEPLOY_RULE, 'utf8');
    await writeFile(
      join(fixture, '.codex/rules/default.rules'),
      `prefix_rule(pattern = ["gh", "pr", "view"], justification = "${SIBLING_ONLY_TOKEN}")\n`,
      'utf8',
    );
    // The referenced script is never opened on the rule's account: a path a
    // rule names gains no read authority.
    await mkdir(join(fixture, 'scripts'), { recursive: true });
    await writeFile(join(fixture, 'scripts/deploy.sh'), 'echo deploying\n', 'utf8');
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['CODEX_E2E_RULE_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CODEX_E2E_RULE_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows its whole authored source', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Permissions/u }).click();
    // The row is headed by the file's path; the product under it is the link
    // to that file's own detail.
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    await rows
      .filter({ hasText: '.codex/rules/deploy.rules' })
      .getByRole('link', { name: '.codex/rules/deploy.rules' })
      .click();
    await expect(page).toHaveURL(/\/permissions\/\.codex\/rules\/deploy\.rules$/u);
    await expect(page.getByRole('heading', { name: '.codex/rules/deploy.rules' })).toBeVisible();

    const main = page.locator('main');
    // The file's identity restated from its row, beside the kind's caption.
    await expect(main).toContainText('OpenAI Codex (Local clients) · Permissions');
    // The read outcome, and nothing narrating what a rule might do.
    await expect(main).toContainText('Readable text');

    // The complete authored source, line for line: the comment, the call, the
    // pattern with its credential whole and unmarked, the restrictive
    // decision, and the justification with its environment reference as the
    // exact characters that were written (FR-025, FR-026).
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
    await expect(main).toContainText('prefix_rule(');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    await expect(main).toContainText('forbidden');
    await expect(main).toContainText('Blocks the deploy script outside the sandbox.');

    // Coloured rather than shown as one undifferentiated run: the page names
    // Starlark's grammar for a file Codex recognizes, because the vendor's
    // own page presents rule-file content that way and `.rules` claims none
    // by itself. Distinct token classes are what colouring looks like in the
    // DOM; a plain-text model would put every character in one.
    const tokenClasses = await page
      .locator('.monaco-editor .view-line span[class^="mtk"]')
      .evaluateAll((nodes) => new Set(nodes.map((node) => node.className)).size);
    expect(tokenClasses).toBeGreaterThan(1);
    // Tokenizing is all it is: the named grammar has no language service
    // behind it, so nothing marks the file invalid (FR-033, research.md § 7).
    await expect(
      page.locator('.monaco-editor .squiggly-error, .monaco-editor .squiggly-warning'),
    ).toHaveCount(0);

    const text = await main.innerText();
    // Never the process value a same-named variable carries: the reference is
    // authored text, resolved against nothing.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // The sibling rule is a different file and is not on this page.
    expect(text).not.toContain(SIBLING_ONLY_TOKEN);
    // No masking, reveal, or enforcement control anywhere on the page: a
    // decision this file declares is text, and this product applies none of
    // it (FR-009).
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /apply|enforce|allow|block|run/iu })).toHaveCount(
      0,
    );
    // The referenced script is a value inside the text, never a link.
    await expect(page.getByRole('link', { name: /deploy\.sh/u })).toHaveCount(0);
  });

  test('returns to the rule tab it was opened from', async ({ page }) => {
    await page.goto(new URL('/permissions/.codex/rules/default.rules', host.origin).toString());
    await expect(page.getByRole('heading', { name: '.codex/rules/default.rules' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the inventory' }).click();
    await expect(page).toHaveURL(/\?kind=permissions$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Permissions');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(new URL('/permissions/.codex/rules/removed.rules', host.origin).toString());
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.monaco-editor')).toHaveCount(0);
  });
});

test.describe('a candidate whose bytes were never accepted', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-rules-detail-unusable-'));
    await mkdir(join(fixture, '.codex/rules'), { recursive: true });
    await writeFile(join(fixture, '.codex/rules/default.rules'), 'prefix_rule()\n', 'utf8');
    // A NUL byte leaves the candidate with no source text (FR-025).
    await writeFile(join(fixture, '.codex/rules/binary.rules'), Buffer.from([0x70, 0x00, 0x72]));
    // A link whose target is missing never becomes readable at all.
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

  test('opens no rule detail, and says so rather than showing an empty one', async ({ page }) => {
    // A candidate whose bytes were never accepted gains no recognition, so it
    // is in no kind's inventory and there is no rule for a detail to be
    // about. The page states that instead of rendering a rule page with
    // nothing in it; the file's own finding is on the inventory, under the
    // files in no kind, which is where a `partial` generation says which file
    // made it partial (FR-028).
    for (const path of [
      '/permissions/.codex/rules/binary.rules',
      '/permissions/.codex/rules/broken.rules',
    ]) {
      await page.goto(new URL(path, host.origin).toString());
      await expect(page.locator('main')).toContainText(
        "Nothing in the current scan sits at this link's path.",
      );
      await expect(page.locator('.monaco-editor')).toHaveCount(0);
    }

    await page.goto(host.origin);
    const unclassified = (await openNoKindDisclosure(page)).locator('.aci-item');
    await expect(unclassified).toHaveCount(2);
    await expect(unclassified.filter({ hasText: 'binary.rules' })).toContainText(
      'This file contains NUL bytes',
    );
    await expect(unclassified.filter({ hasText: 'broken.rules' })).toContainText(
      'This file could not be read.',
    );
  });
});
