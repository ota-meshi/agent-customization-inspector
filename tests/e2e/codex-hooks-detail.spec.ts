// T849: browser acceptance for the Codex hook detail (Phase 85). Launches the
// packaged CLI against a fixture whose hook declarations carry a literal
// credential, a literal environment reference, and handler scripts named by
// path, opens each declaration's own page and each carrier's file-unit view,
// and verifies that the declarations are shown exactly as authored with no
// control that masks, reveals, resolves, or runs any of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A credential shape no environment can resolve; it must reach the page as written. */
const SECRET = 'ghp_FIXTURE000000000000000000000000000000';

/** An environment reference the page must show as characters, never as a value. */
const ENVIRONMENT_REFERENCE = '${CODEX_HOOK_ENDPOINT}';

test.describe('Codex hook declarations opened one at a time', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-hook-detail-'));
    await mkdir(join(fixture, '.codex/hooks'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/hooks.json'),
      `${JSON.stringify(
        {
          description: 'Repository lifecycle hooks.',
          hooks: {
            PreToolUse: [
              {
                matcher: '^Bash$',
                hooks: [
                  {
                    type: 'command',
                    command: `curl -H "Authorization: Bearer ${SECRET}" ${ENVIRONMENT_REFERENCE}/policy`,
                    statusMessage: 'Checking Bash command',
                    timeout: 30,
                  },
                ],
              },
            ],
            Stop: [{ hooks: [{ type: 'command', command: './.codex/hooks/stop.py' }] }],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, '.codex/config.toml'),
      [
        'model = "gpt-5.4-codex"',
        '',
        '[[hooks.UserPromptSubmit]]',
        '',
        '[[hooks.UserPromptSubmit.hooks]]',
        'type = "command"',
        'command = "./.codex/hooks/prompt.py"',
        'statusMessage = "Recording the prompt"',
        '',
      ].join('\n'),
      'utf8',
    );
    for (const script of ['stop.py', 'prompt.py']) {
      await writeFile(join(fixture, '.codex/hooks', script), 'print("fixture")\n', 'utf8');
    }
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('shows one declaration as authored, with its credential and reference literal', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'PreToolUse' })
      .getByRole('link', { name: /\.codex\/hooks\.json/u })
      .click();
    // The declaration's own page, headed by the event its row is named by.
    await expect(page.locator('.aci-hook-detail').getByRole('heading', { level: 2 })).toHaveText(
      'PreToolUse',
    );
    await expect(page.locator('.aci-detail-attributes')).toContainText('OpenAI Codex');
    await expect(page.locator('.aci-detail-attributes')).toContainText('hook file');
    // The groups as one JSON document: the matcher, the handler, the timeout,
    // and the status message the file wrote, with the credential and the
    // environment reference exactly as authored — nothing masked, nothing
    // resolved (FR-025, FR-026).
    const viewer = page.locator('.aci-source-viewer');
    await expect(viewer).toBeVisible();
    await expect(viewer).toContainText('^Bash$');
    await expect(viewer).toContainText(SECRET);
    await expect(viewer).toContainText(ENVIRONMENT_REFERENCE);
    // No control offers to hide or uncover a value, and none runs the command.
    for (const forbidden of [/mask/iu, /reveal/iu, /^Run/u, /resolve/iu]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
    // The file's own bytes are not on the page: a carrier admitted for its
    // declarations shows the declarations (FR-007).
    await expect(page.locator('body')).not.toContainText('"description": "Repository lifecycle');
  });

  test('shows every declaration of a carrier on its file-unit view, with the file’s own keys', async ({
    page,
  }) => {
    await page.goto(new URL('/hooks/detail/repository/.codex%2Fhooks.json', host.origin).href);
    await expect(page.locator('.aci-hook-detail').getByRole('heading', { level: 2 })).toHaveText(
      '.codex/hooks.json',
    );
    // Both declared events, each in its own section, and the keys the carrier
    // declares about itself — which only this response publishes, because such
    // a file has no other row (FR-007).
    await expect(page.getByRole('heading', { level: 3, name: 'PreToolUse' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Stop' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: /own declarations/u })).toBeVisible();
    await expect(page.locator('.aci-source-viewer')).toHaveCount(3);
    // The handler script a declaration names is a value, not a link: nothing
    // opens or reads it (FR-020, FR-024).
    await expect(page.getByRole('link', { name: /stop\.py/u })).toHaveCount(0);
  });

  test('serves the inline table of a config layer as the same carrier’s hook page', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'UserPromptSubmit' })
      .getByRole('link', { name: /\.codex\/config\.toml/u })
      .click();
    await expect(page.locator('.aci-hook-detail').getByRole('heading', { level: 2 })).toHaveText(
      'UserPromptSubmit',
    );
    // The contained form, whose neighbouring keys belong to the settings
    // recognition of the same file and are shown there instead.
    await expect(page.locator('.aci-detail-attributes')).toContainText(
      'declared inside another file',
    );
    await expect(page.locator('.aci-source-viewer')).toContainText('prompt.py');
    await expect(page.locator('body')).not.toContainText('gpt-5.4-codex');
    // The carrier line reaches the file-unit view of the same file, which is
    // the shared configuration document's hook page.
    await page.getByRole('link', { name: '.codex/config.toml' }).click();
    await expect(page.locator('.aci-hook-detail').getByRole('heading', { level: 2 })).toHaveText(
      '.codex/config.toml',
    );
    await expect(page.getByRole('heading', { level: 3, name: 'UserPromptSubmit' })).toBeVisible();
    // Its settings row serves the document itself, which is where the model
    // key is read — a different row of the same file (FR-007).
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings/u }).click();
    await page
      .getByRole('tabpanel')
      .getByRole('link', { name: /\.codex\/config\.toml/u })
      .first()
      .click();
    await expect(page.locator('.aci-source-viewer')).toContainText('gpt-5.4-codex');
  });

  test('reports a link the current scan does not hold, and offers a way back', async ({ page }) => {
    // A handler script a declaration names is no hook carrier: the link is the
    // same dead coordinate a removed file would be, reported rather than
    // guessed at (FR-030).
    await page.goto(new URL('/hooks/detail/repository/.codex%2Fhooks%2Fstop.py', host.origin).href);
    await expect(page.locator('.aci-subject-unavailable')).toContainText('current scan');
    await page.getByRole('link', { name: /Return to the inventory/u }).click();
    await expect(page.getByRole('tab', { name: /Hook/u })).toHaveAttribute('aria-selected', 'true');
  });
});
