// T594: browser acceptance for the Codex settings-and-configuration detail
// (Phase 58). Launches the packaged CLI against a fixture whose root
// `.codex/config.toml` is Codex's project configuration layer, opens it from
// the settings tab, and verifies the complete literal detail: the document's
// whole authored source with its comments and authored spellings, a credential
// shown exactly as authored with no masking or reveal control, a literal
// environment reference never replaced by the process value a same-named
// variable carries in the host's own environment, the read-outcome line,
// navigation back to the settings tab, the dead-link state for a path this
// scan holds no settings row at, and the absence of anything that would apply,
// trust, or follow what the document declares.
//
// The MCP rows of the same physical file are checked here too, from the other
// side: which detail answers for a file follows from the row it is reached
// through, so the MCP page publishes declarations without the document's bytes
// while this page publishes the document (FR-007).
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openNoKindDisclosure } from './no-kind-disclosure';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECONFIGDETAIL000000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_CONFIG_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** The complete authored text of the configuration document the cases open. */
const CONFIG_DOCUMENT = [
  '# The project layer for this repository.',
  'model = "gpt-5.4-codex"',
  'project_doc_max_bytes = 32_768',
  'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]',
  '',
  '[experimental]',
  'model_instructions_file = "./.codex/model-instructions.md"',
  '',
  '[mcp_servers.context7]',
  'command = "npx"',
  '',
  '[mcp_servers.context7.env]',
  `API_KEY = "${FIXTURE_SECRET}"`,
  `ENDPOINT = "${ENVIRONMENT_REFERENCE}"`,
  '',
].join('\n');

test.describe('the complete literal Codex configuration detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-config-detail-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(join(fixture, '.codex/config.toml'), CONFIG_DOCUMENT, 'utf8');
    // The configured target is never opened on the document's account: a path
    // the configuration names gains no read authority.
    await writeFile(join(fixture, '.codex/model-instructions.md'), '# configured\n', 'utf8');
    await writeFile(join(fixture, 'TEAM_GUIDE.md'), '# configured fallback\n', 'utf8');
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['CODEX_E2E_CONFIG_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CODEX_E2E_CONFIG_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the document from its row and shows its whole authored source', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    // The row is headed by the file's path; the product under it is the link
    // to that file's own detail.
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    await rows
      .filter({ hasText: '.codex/config.toml' })
      .getByRole('link', { name: '.codex/config.toml' })
      .click();
    await expect(page).toHaveURL(
      /\/settings-and-configuration\/detail\/repository\/\.codex\/config\.toml$/u,
    );
    await expect(page.getByRole('heading', { name: '.codex/config.toml' })).toBeVisible();

    const main = page.locator('main');
    // The file's identity restated from its row, beside the kind's caption.
    await expect(main).toContainText('OpenAI Codex (Local clients) · Settings / Config');
    // The read outcome, and nothing narrating what the configuration might do.
    await expect(main).toContainText('Readable text');

    // The complete authored document, line for line: the comment and the
    // underscored integer a parser's resolution would have dropped, the
    // section headers in the author's own order, and the declared values with
    // the credential whole and unmarked and the environment reference as the
    // exact characters that were written (FR-025, FR-026).
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
    await expect(main).toContainText('# The project layer for this repository.');
    await expect(main).toContainText('project_doc_max_bytes = 32_768');
    await expect(main).toContainText('[experimental]');
    await expect(main).toContainText('./.codex/model-instructions.md');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);

    // Coloured rather than shown as one undifferentiated run: the `toml`
    // grammar registered from `@ota-meshi/site-kit-monarch-syntaxes` colours
    // this document's table headers, `key = value` lines, quoted strings,
    // numbers, and `#` comments. Distinct token classes are what colouring
    // looks like in the DOM; a plain-text model would put every character in
    // one.
    //
    // Polled rather than read once, because a grammar is a lazily fetched
    // chunk: the text renders as soon as the model exists and is re-tokenized
    // when the grammar arrives, so a single read taken when the text appears
    // catches the plain render on a browser that fetches a moment slower —
    // every character in one class, which is what an uncoloured document
    // looks like too.
    await expect(async () => {
      const tokenClasses = await page
        .locator('.monaco-editor .view-line span[class^="mtk"]')
        .evaluateAll((nodes) => new Set(nodes.map((node) => node.className)).size);
      expect(tokenClasses).toBeGreaterThan(1);
    }).toPass();
    // Tokenizing is all it is: no language service stands behind that
    // grammar, so nothing marks the document invalid (FR-033).
    await expect(
      page.locator('.monaco-editor .squiggly-error, .monaco-editor .squiggly-warning'),
    ).toHaveCount(0);

    const text = await main.innerText();
    // Never the process value a same-named variable carries: the reference is
    // authored text, resolved against nothing.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // No masking, reveal, or application control anywhere on the page: a
    // value this document declares is text, and this product applies none of
    // it (FR-009).
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /apply|enable|trust|activate|run/iu }),
    ).toHaveCount(0);
    // A configured target is a value inside the text, never a link.
    await expect(page.getByRole('link', { name: /model-instructions\.md/u })).toHaveCount(0);
  });

  test('publishes declarations without the bytes on the MCP row of the same file', async ({
    page,
  }) => {
    // The other row of the one file: its subject is a declaration, so its
    // detail leads with that declaration and carries no source at all — while
    // the settings page above shows the document those declarations sit in.
    await page.goto(
      new URL('/mcp/detail/repository/.codex/config.toml?server=context7', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: 'context7' })).toBeVisible();
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('# The project layer for this repository.');
    expect(text).not.toContain('project_doc_max_bytes');
  });

  test('returns to the settings tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.codex/config.toml',
        host.origin,
      ).toString(),
    );
    await expect(page.getByRole('heading', { name: '.codex/config.toml' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the inventory' }).click();
    await expect(page).toHaveURL(/\?kind=settings%2Fconfig$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Settings / Config');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/packages/api/.codex/config.toml',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.monaco-editor')).toHaveCount(0);
  });
});

test.describe('a configuration document whose bytes were never accepted', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-config-detail-unusable-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    // A link whose target is missing never becomes readable at all.
    await symlink(join(fixture, 'no-such-target.toml'), join(fixture, '.codex/config.toml'));
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens no settings detail, and says so rather than showing an empty one', async ({
    page,
  }) => {
    // A candidate whose bytes were never accepted gains no recognition, so it
    // is in no kind's inventory and there is no document for a detail to be
    // about. The page states that instead of rendering a settings page with
    // nothing in it; the file's own finding is on the inventory, under the
    // files in no kind, which is where a `partial` generation says which file
    // made it partial (FR-028).
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.codex/config.toml',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.monaco-editor')).toHaveCount(0);

    await page.goto(host.origin);
    const unclassified = (await openNoKindDisclosure(page)).locator('.aci-item');
    await expect(unclassified).toHaveCount(1);
    await expect(unclassified.first()).toContainText('.codex/config.toml');
    await expect(unclassified.first()).toContainText('This file could not be read.');
  });
});

test.describe('a configuration document no parser can read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-config-detail-malformed-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(join(fixture, '.codex/config.toml'), 'model = "unterminated\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('still shows the document, because nothing is read out of it', async ({ page }) => {
    // Nothing is extracted for this row, so nothing can fail to be read: the
    // settings detail is the bytes their author wrote whether or not a parser
    // accepts them. The MCP row of the same file is the one that reports the
    // failure (FR-028).
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.codex/config.toml',
        host.origin,
      ).toString(),
    );
    await expect(page.getByRole('heading', { name: '.codex/config.toml' })).toBeVisible();
    await expect(page.locator('main')).toContainText('model = "unterminated');
    await expect(page.locator('main')).not.toContainText('could not be read');
  });
});
