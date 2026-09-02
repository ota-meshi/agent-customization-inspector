// T498: browser acceptance for the Copilot prompt detail (Phase 47). Launches
// the packaged CLI against a fixture whose `.github/prompts/` holds prompt
// files, opens one from its inventory row, and verifies the complete literal
// detail: the declarations the file wrote, the prompt after them, and the
// complete authored file — with a credential shown exactly as authored and no
// masking or reveal control, and a literal environment reference never
// replaced by the process value a same-named variable carries.
//
// A prompt's body carries reference shapes a command's does not: Markdown
// links, images, and `#file` tokens. None of them becomes a link, an image
// request, or a read here — highlighting is tokenizing rather than rendering
// (FR-019, FR-033).
//
// The page is the same detail route the command files use, because the kind is
// the same; what it states beside the path is the name that file's row is
// grouped under, which for a prompt is the one the file declared.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTPROMPT00000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${COPILOT_E2E_PROMPT_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Copilot prompt detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-prompts-detail-'));
    await mkdir(join(fixture, '.github/prompts'), { recursive: true });
    await writeFile(
      join(fixture, '.github/prompts/scaffold.prompt.md'),
      [
        '---',
        'name: scaffold-component',
        'description: Scaffold a React component',
        'argument-hint: "componentName"',
        `token: ${FIXTURE_SECRET}`,
        `endpoint: "${ENVIRONMENT_REFERENCE}"`,
        '---',
        '',
        '# Scaffold',
        '',
        '- See [the guide](https://example.com/guide).',
        '- ![diagram](./diagram.png)',
        '- Use #file:src/index.ts for context.',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(join(fixture, '.github/prompts/review.prompt.md'), '# Review\n', 'utf8');
    await writeFile(
      join(fixture, '.github/prompts/broken.prompt.md'),
      '---\ntools: [read\n---\n\n# Broken\n',
      'utf8',
    );
    process.env['COPILOT_E2E_PROMPT_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['COPILOT_E2E_PROMPT_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens from its row and shows the declarations, the prompt, and the name', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'scaffold-component' })
      .getByRole('link', { name: '.github/prompts/scaffold.prompt.md' })
      .click();
    // The file's own address, and beside it the row it was followed from: one
    // file can be listed under two names, and the link records which
    // (`detail-route.ts` § originRowNameQuery).
    const opened = new URL(page.url());
    expect(opened.pathname).toBe(
      '/prompts-and-commands/detail/repository/.github/prompts/scaffold.prompt.md',
    );
    expect(opened.searchParams.get('name')).toBe('scaffold-component');

    const main = page.locator('main');
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('GitHub Copilot');
    await expect(attributes).toContainText('VS Code');
    // The name the row it was opened from is grouped under: the one the file
    // declared, not its file name.
    await expect(main).toContainText('Invocation name: scaffold-component');
    await expect(main).toContainText('name: scaffold-component');
    await expect(main).toContainText('description: Scaffold a React component');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    await expect(main).toContainText('See [the guide](https://example.com/guide).');
    await expect(main).toContainText('Use #file:src/index.ts for context.');

    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /run|invoke|execute|apply/iu })).toHaveCount(0);
    // A link the prompt names is text, an image is text, and neither is
    // fetched: highlighting is tokenizing rather than rendering (FR-033).
    await expect(page.getByRole('link', { name: 'the guide' })).toHaveCount(0);
    await expect(page.locator('main img')).toHaveCount(0);
  });

  test('serves the complete authored file beside the parse', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.github/prompts/scaffold.prompt.md',
        host.origin,
      ).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    await expect(main).toContainText('---');
    await expect(main).toContainText('# Scaffold');
    await expect(main).toContainText(FIXTURE_SECRET);
    expect(await main.innerText()).not.toContain(ENVIRONMENT_SENTINEL);
  });

  test('names a prompt whose declarations could not be read by its file name', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.github/prompts/broken.prompt.md',
        host.origin,
      ).toString(),
    );
    const main = page.locator('main');
    // The extraction failed, so nothing parsed is shown and the file is the
    // honest landing — while the row keeps the name the file name gives it,
    // which is the same answer the vendor gives a file that declares none
    // (FR-028).
    await expect(page.getByRole('tab', { name: 'File', selected: true })).toBeVisible();
    await expect(main).toContainText('Invocation name: broken');
    await expect(main).toContainText('tools: [read');
    await expect(main).toContainText('could not be parsed');
  });
});
