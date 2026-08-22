// T470: browser acceptance for the Copilot CLI command detail (Phase 43).
// Launches the packaged CLI against a fixture whose root `.claude/commands/`
// holds command files, opens one from the Copilot definition of its row, and
// verifies the complete literal detail: the declarations the file wrote, the
// prompt after them, and the complete authored file — with a credential shown
// exactly as authored and no masking or reveal control, and a literal
// environment reference never replaced by the process value a same-named
// variable carries.
//
// One page, both products. The detail is addressed by the path alone because
// no per-tool fact distinguishes what it would show: the same bytes, the same
// one parse. What differs between the products is the name each derives, and
// the page states the names its inventory rows are grouped under.
//
// Nothing here states the priority the CLI documents. A same-name skill
// outranks a command, which turns on sources this scan never observes
// (FR-009).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTCOMMAND0000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${COPILOT_E2E_COMMAND_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Copilot command detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-commands-detail-'));
    await mkdir(join(fixture, '.claude/commands'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/commands/deploy.md'),
      [
        '---',
        'description: Deploy the current branch',
        'argument-hint: "[environment]"',
        'allowed-tools:',
        '  - Bash(git status)',
        'disable-model-invocation: false',
        `token: ${FIXTURE_SECRET}`,
        `endpoint: "${ENVIRONMENT_REFERENCE}"`,
        '---',
        '',
        '# Deploy',
        '',
        '- Hand the diff to the code-review agent.',
        '- Then read ./checklist.md.',
        '',
      ].join('\n'),
      'utf8',
    );
    process.env['COPILOT_E2E_COMMAND_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['COPILOT_E2E_COMMAND_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens from the Copilot definition and shows the whole declaration set', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: '.claude/commands/deploy.md' })
      .getByRole('link', { name: 'GitHub Copilot' })
      .click();
    await expect(page).toHaveURL(/\/prompts-and-commands\/\.claude\/commands\/deploy\.md$/u);

    const main = page.locator('main');
    // Both products recognize the file, and the page states both beside the
    // one name they agree on at the root.
    await expect(main).toContainText('GitHub Copilot (CLI)');
    await expect(main).toContainText('Claude Code (CLI and IDE clients)');
    await expect(main).toContainText('Invocation name: deploy');
    // The fields the CLI reference names, and the keys beyond them the file
    // also wrote: an authored key set is not closed (FR-007).
    await expect(main).toContainText('description: Deploy the current branch');
    await expect(main).toContainText('argument-hint');
    await expect(main).toContainText('disable-model-invocation');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    // The prompt after the block, with the names it mentions left as text.
    await expect(main).toContainText('Hand the diff to the code-review agent.');
    await expect(main).toContainText('read ./checklist.md');

    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // Nothing states the documented priority, and no control masks, reveals,
    // or runs anything.
    expect(text).not.toContain('lower priority');
    expect(text).not.toContain('outrank');
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /run|invoke|execute|apply/iu })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /checklist\.md/u })).toHaveCount(0);
  });

  test('serves the complete authored file beside the parse', async ({ page }) => {
    await page.goto(
      new URL('/prompts-and-commands/.claude/commands/deploy.md', host.origin).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    await expect(main).toContainText('---');
    await expect(main).toContainText('# Deploy');
    await expect(main).toContainText(FIXTURE_SECRET);
    expect(await main.innerText()).not.toContain(ENVIRONMENT_SENTINEL);
  });
});
