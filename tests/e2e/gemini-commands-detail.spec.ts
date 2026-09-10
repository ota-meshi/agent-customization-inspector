// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// command detail. Opens a namespaced TOML command from its row and verifies
// the complete literal detail: the declarations the file wrote, the prompt
// beside them with its `!{...}` shell block and `{{args}}` placeholder as the
// characters that were written, a credential shown exactly as authored with
// no masking or reveal control, a literal environment reference never
// replaced by the process value a same-named variable carries, the complete
// authored TOML on the file tab, and the failed-extraction state (spec.md
// FR-006; FR-007, FR-025 through FR-028).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EGEMINICOMMAND00000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${GEMINI_E2E_COMMAND_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Gemini CLI command detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-commands-detail-'));
    await mkdir(join(fixture, '.gemini/commands/git'), { recursive: true });
    await writeFile(
      join(fixture, '.gemini/commands/git/commit.toml'),
      [
        '# Namespaced: invoked as /git:commit.',
        'description = "Write a commit message for the staged changes."',
        `token = "${FIXTURE_SECRET}"`,
        `endpoint = "${ENVIRONMENT_REFERENCE}"`,
        'prompt = """',
        'Staged diff:',
        '!{git diff --cached}',
        '',
        'Style guide: @{docs/commits.md}',
        'Extra instructions: {{args}}',
        '"""',
        '',
      ].join('\n'),
      'utf8',
    );
    await mkdir(join(fixture, 'docs'), { recursive: true });
    await writeFile(join(fixture, 'docs/commits.md'), '# commits\n', 'utf8');
    process.env['GEMINI_E2E_COMMAND_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['GEMINI_E2E_COMMAND_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows its declarations and prompt', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: '.gemini/commands/git/commit.toml' })
      .getByRole('link', { name: '.gemini/commands/git/commit.toml' })
      .click();
    await expect(page).toHaveURL(
      /\/prompts-and-commands\/detail\/repository\/\.gemini\/commands\/git\/commit\.toml\?name=git(%3A|:)commit$/u,
    );
    await expect(
      page.getByRole('heading', { name: '.gemini/commands/git/commit.toml' }),
    ).toBeVisible();

    const main = page.locator('main');
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('Gemini CLI');
    // The name the row it was opened from is listed under: the path below the
    // commands directory, colon-joined (FR-006).
    await expect(main).toContainText('Invocation name: git:commit');
    await expect(main).toContainText('Readable text');

    // The declarations the file wrote — every key but the prompt — spelled
    // back as one YAML document, the credential whole and the reference as its
    // own characters (FR-025, FR-026).
    await expect(main.locator('h3').first()).toContainText('Metadata');
    await expect(main).toContainText('description: Write a commit message for the staged changes.');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    // The prompt beside them: the shell block, the file reference, and the
    // placeholder are characters, run, opened, and filled by nothing (FR-019).
    await expect(main).toContainText('!{git diff --cached}');
    await expect(main).toContainText('@{docs/commits.md}');
    await expect(main).toContainText('{{args}}');

    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // The parse panel shows the halves, not the TOML spelling: the key
    // assignment lines and the triple quotes are the file tab's.
    expect(text).not.toContain('prompt = """');
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /run|invoke|execute|apply/iu })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /commits\.md/u })).toHaveCount(0);
  });

  test('serves the complete authored TOML beside the parse', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.gemini/commands/git/commit.toml',
        host.origin,
      ).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    // The comment the parse drops, the assignment spellings, and the
    // triple-quoted delimiters, as written.
    await expect(main).toContainText('# Namespaced: invoked as /git:commit.');
    await expect(main).toContainText('prompt = """');
    await expect(main).toContainText(FIXTURE_SECRET);
    expect(await main.innerText()).not.toContain(ENVIRONMENT_SENTINEL);
  });

  test('returns to the command tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.gemini/commands/git/commit.toml',
        host.origin,
      ).toString(),
    );
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=prompt(%2F|\/)command$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Prompt / Command');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.gemini/commands/gone.toml',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
  });
});

test.describe('a Gemini CLI command the TOML parser cannot read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-commands-detail-broken-'));
    await mkdir(join(fixture, '.gemini/commands'), { recursive: true });
    await writeFile(
      join(fixture, '.gemini/commands/broken.toml'),
      'description = "unterminated\nprompt = "x"\n',
      'utf8',
    );
    // Well-formed TOML that declares no `prompt`: the vendor requires the key,
    // so the file has no prompt to show and the extraction fails the same way
    // (spec.md FR-006).
    await writeFile(
      join(fixture, '.gemini/commands/promptless.toml'),
      'description = "Declares no prompt."\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lands on the complete file and states the extraction failure', async ({ page }) => {
    for (const path of ['.gemini/commands/broken.toml', '.gemini/commands/promptless.toml']) {
      await page.goto(
        new URL(`/prompts-and-commands/detail/repository/${path}`, host.origin).toString(),
      );
      await expect(page.getByRole('heading', { name: path })).toBeVisible();
      const main = page.locator('main');
      // The row keeps the name its path gives it, and the failure is stated
      // beside the complete source rather than a half-parsed document
      // (FR-006, FR-028).
      await expect(main).toContainText('This file could not be parsed');
      await expect(main).toContainText('description = "');
      expect(await main.innerText(), path).not.toContain('Metadata YAML');
    }
  });
});
