// T452: browser acceptance for the Claude command detail (Phase 41). Launches
// the packaged CLI against a fixture whose `.claude/commands/` carries command
// files, opens one from the command tab, and verifies the complete literal
// detail: the declarations the file wrote in its own order, the prompt after
// the block, and the complete authored file — with a credential shown exactly
// as authored and no masking or reveal control, a literal environment
// reference never replaced by the process value a same-named variable carries,
// an agent and a skill named in the prompt left as text, and navigation back
// to the command tab.
//
// The page also states the name the inventory row it was opened from is
// listed under — derived from the path by the product that recognized the
// file, because Claude Code ignores a `name` key in a command file.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDECOMMAND00000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_COMMAND_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Claude command detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-commands-detail-'));
    await mkdir(join(fixture, '.claude/commands/frontend'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/commands/deploy.md'),
      [
        '---',
        'description: Deploy the current branch',
        'argument-hint: "[environment]"',
        'allowed-tools:',
        '  - Bash(git status)',
        '  - Read',
        `token: ${FIXTURE_SECRET}`,
        `endpoint: "${ENVIRONMENT_REFERENCE}"`,
        '---',
        '',
        '# Deploy',
        '',
        '- Hand the diff to the code-reviewer subagent.',
        '- Then run /skill-name and read ./checklist.md.',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude/commands/frontend/component.md'),
      '# Component\n\n- Scaffold one.\n',
      'utf8',
    );
    process.env['CLAUDE_E2E_COMMAND_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CLAUDE_E2E_COMMAND_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows its declarations and prompt', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    await rows
      .filter({ hasText: '.claude/commands/deploy.md' })
      .first()
      .getByRole('link', { name: '.claude/commands/deploy.md' })
      .click();
    await expect(page).toHaveURL(
      /\/prompts-and-commands\/detail\/repository\/\.claude\/commands\/deploy\.md$/u,
    );
    await expect(page.getByRole('heading', { name: '.claude/commands/deploy.md' })).toBeVisible();

    const main = page.locator('main');
    // The product that recognizes the file and the surfaces its admitting rules
    // rest on, on the customization's own attribute line.
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('Claude Code');
    await expect(attributes).toContainText('CLI and IDE clients');
    // The name the row it was opened from is listed under: the file name
    // without its extension, because this one is a direct child.
    await expect(main).toContainText('Invocation name: deploy');
    await expect(main).toContainText('Readable text');
    // The declarations the file wrote, in its own order, spelled back as the
    // YAML the block is.
    await expect(main).toContainText('description: Deploy the current branch');
    await expect(main).toContainText('argument-hint');
    await expect(main).toContainText('Bash(git status)');
    // The credential whole and unmarked, and the environment reference as its
    // own characters.
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    // The prompt after the block, with the names it mentions left as text.
    await expect(main).toContainText('Hand the diff to the code-reviewer subagent.');
    await expect(main).toContainText('read ./checklist.md');

    const text = await main.innerText();
    // Never the process value a same-named variable carries.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // No control that masks, reveals, or runs anything: the name is a fact
    // about where the file sits, never an offer to invoke it.
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /run|invoke|execute|apply/iu })).toHaveCount(0);
    // Nothing the prompt names becomes a link: highlighting is tokenizing, not
    // rendering (FR-033).
    await expect(page.getByRole('link', { name: /checklist\.md|skill-name/u })).toHaveCount(0);
  });

  test('serves the complete authored file beside the parse', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.claude/commands/deploy.md',
        host.origin,
      ).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    // The whole document, frontmatter delimiters included: the parse is one
    // subject and the file another.
    await expect(main).toContainText('---');
    await expect(main).toContainText('# Deploy');
    await expect(main).toContainText(FIXTURE_SECRET);
    expect(await main.innerText()).not.toContain(ENVIRONMENT_SENTINEL);
  });

  test('shows a command with no frontmatter as the prompt it is', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.claude/commands/frontend/component.md',
        host.origin,
      ).toString(),
    );
    const main = page.locator('main');
    await expect(main).toContainText('This file declares none.');
    await expect(main).toContainText('Scaffold one.');
    // The path heads the page, because the page is about the file; the name
    // its row is listed under carries the namespace the directory gives it.
    await expect(
      page.getByRole('heading', { name: '.claude/commands/frontend/component.md' }),
    ).toBeVisible();
    await expect(main).toContainText('Invocation name: frontend:component');
  });

  test('returns to the command tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.claude/commands/frontend/component.md',
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
        '/prompts-and-commands/detail/repository/.claude/commands/gone.md',
        host.origin,
      ).toString(),
    );
    const main = page.locator('main');
    await expect(main).toContainText("Nothing in the current scan sits at this link's path.");
  });
});

test.describe('a Claude command whose frontmatter is malformed', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-commands-detail-broken-'));
    await mkdir(join(fixture, '.claude/commands'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/commands/broken.md'),
      '---\nallowed-tools: [Bash\n---\n\n# Broken\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lands on the complete file and states the extraction failure', async ({ page }) => {
    await page.goto(
      new URL(
        '/prompts-and-commands/detail/repository/.claude/commands/broken.md',
        host.origin,
      ).toString(),
    );
    const main = page.locator('main');
    // Extraction is all-or-nothing: nothing parsed is shown, the failure's
    // Diagnostic says so, and the complete source is the honest landing
    // (FR-028).
    await expect(page.getByRole('tab', { name: 'File', selected: true })).toBeVisible();
    await expect(main).toContainText('allowed-tools: [Bash');
    await expect(main).toContainText('# Broken');
    await expect(main).toContainText('could not be parsed');
  });
});
