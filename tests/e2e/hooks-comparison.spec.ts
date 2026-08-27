// T909: browser acceptance for the hook comparison (Phase 91). Launches the
// packaged CLI against a tree holding one lifecycle event declared by three
// carriers — a Codex standalone hook file and the two Claude-format settings
// documents both Claude Code and Copilot read — opens the comparison from an
// inventory row's entry link, and verifies the declaration comparison: one
// declared event compared across the carriers of its own row, each side
// serialized to canonical JSON and diffed in Monaco (research.md § 7),
// credential and environment-reference values shown exactly as authored with
// no masking, reveal control, or process-environment substitution, no carrier
// source anywhere (FR-007), a contained declaration selected through the file
// that carries it (FR-030), and every selection outside the named row
// rejected — including the files whose `hooks` belongs to the customization
// they define and so publishes no hook row.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The credential each carrier declares differently, shown whole on both sides. */
const CODEX_SECRET = 'ghp_E2EHOOKCOMPARECODEX000000000000000000000';
const SETTINGS_SECRET = 'ghp_E2EHOOKCOMPARESETTINGS0000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${HOOK_COMPARE_E2E_ENDPOINT}';

/** The process value that must never replace the reference. */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** The event whose row owns the comparison, declared by three carriers. */
const SHARED_EVENT = 'PreToolUse';

test.describe('the hook declaration comparison', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-hook-compare-'));
    // Codex's standalone form: a file whose whole purpose is hooks, declaring
    // the shared event with a credential and an environment reference inside
    // the command, and a carrier-level `description` that belongs to the file
    // rather than to the declaration.
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/hooks.json'),
      `${JSON.stringify(
        {
          description: 'Repository lifecycle hooks for the comparison fixture.',
          hooks: {
            [SHARED_EVENT]: [
              {
                matcher: '^Bash$',
                hooks: [
                  {
                    type: 'command',
                    command: `curl -H "Authorization: Bearer ${CODEX_SECRET}" ${ENVIRONMENT_REFERENCE}/policy`,
                    timeout: 30,
                  },
                ],
              },
            ],
            SessionStart: [{ hooks: [{ type: 'command', command: './codex-only.sh' }] }],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The Claude-format settings pair, whose inline `hooks` block both Claude
    // Code and Copilot read: one physical file, one read, one recognition per
    // product. The keys are authored in an order canonical serialization
    // changes, and the document carries a `permissions` block that is no part
    // of the hook declaration.
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify(
        {
          permissions: { allow: ['Bash(git status)'] },
          hooks: {
            [SHARED_EVENT]: [
              {
                matcher: 'Bash',
                hooks: [
                  {
                    type: 'command',
                    command: `curl -H "Authorization: Bearer ${SETTINGS_SECRET}" ${ENVIRONMENT_REFERENCE}/audit`,
                    timeout: 15,
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude/settings.local.json'),
      `${JSON.stringify(
        {
          hooks: {
            [SHARED_EVENT]: [
              { hooks: [{ type: 'command', command: './.claude/hooks/announce.sh' }] },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The script one declaration names: what a client would run when the
    // event fires, which is a runtime fact rather than a declaration — it is
    // on no hook row, so no comparison can name it (FR-009).
    await mkdir(join(fixture, '.claude/hooks'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/hooks/announce.sh'),
      '#!/bin/sh\necho "session started"\n',
      'utf8',
    );
    // A readable current hook carrier declaring another event only: it is on
    // its own row, and the shared event's comparison has no side for it.
    await mkdir(join(fixture, '.github/hooks'), { recursive: true });
    await writeFile(
      join(fixture, '.github/hooks/format.json'),
      `${JSON.stringify(
        { version: 1, hooks: { postToolUse: [{ type: 'command', command: 'npx prettier -c .' }] } },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A subagent whose frontmatter declares hooks: part of what the agent is,
    // published by the agent's own row and by no hook row at all (T889). A
    // link naming it has no side here either.
    await mkdir(join(fixture, '.claude/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/agents/reviewer.md'),
      [
        '---',
        'name: reviewer',
        'description: Review a diff for correctness.',
        'hooks:',
        '  PreToolUse:',
        '    - matcher: Bash',
        '      hooks:',
        '        - type: command',
        '          command: ./scripts/agent-owned.sh',
        '---',
        '',
        'Review the diff.',
        '',
      ].join('\n'),
      'utf8',
    );
    process.env['HOOK_COMPARE_E2E_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['HOOK_COMPARE_E2E_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens from the event row and diffs the serialized declarations, literal and unmasked', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    // The shared event's row links the comparison of its own declarations.
    await page
      .getByRole('link', { name: `Compare this event's declarations: ${SHARED_EVENT}` })
      .click();
    await expect(page).toHaveURL(/\/hooks\/compare\?/u);
    await expect(page).toHaveURL(new RegExp(`event=${SHARED_EVENT}`, 'u'));
    await expect(page.getByRole('heading', { name: 'Compare hook declarations' })).toBeFocused();

    const main = page.locator('main');
    // The comparison's subject is the row's declared event, in the carriers'
    // own spelling (FR-007).
    await expect(main.locator('.aci-hook-compare__event')).toHaveText(SHARED_EVENT);
    // The link opens the row's first two carriers — both contained
    // declarations, named by the documents that carry them (FR-030) — each
    // side stating its own identity and the products the row lists for it.
    await expect(main).toContainText('.claude/settings.json');
    await expect(main).toContainText('.claude/settings.local.json');
    await expect(main).toContainText('Repository · Hook · declared inside another file');
    await expect(main).toContainText('Claude Code');
    await expect(main).toContainText('GitHub Copilot');

    // The other carrier form on one side: the standalone file whose whole
    // purpose is hooks, reached through this row's own picker.
    await page.getByLabel('Second hook file', { exact: true }).selectOption('.codex/hooks.json');
    await expect(main).toContainText('Repository · Hook · hook file');
    await expect(main).toContainText('OpenAI Codex');

    // The Monaco diff holds both serialized declarations: the groups as JSON,
    // the credentials whole and unmarked, the environment reference as its own
    // characters (FR-025, FR-026).
    const diff = main.locator('.aci-hook-recognition-comparison__diff');
    await expect(diff).toBeVisible();
    await expect(diff).toContainText(SETTINGS_SECRET);
    await expect(diff).toContainText(CODEX_SECRET);
    await expect(diff).toContainText(ENVIRONMENT_REFERENCE);
    await expect(diff).toContainText('^Bash$');

    const text = await main.innerText();
    // Never the process value: no environment reference is resolved (FR-026).
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // Never the carriers' own bytes: a hook carrier shows its source on no
    // surface (FR-007), so what the diff holds is this event's declaration —
    // not the file's description, not its permissions block, not another
    // event's groups.
    expect(text).not.toContain('Repository lifecycle hooks for the comparison fixture.');
    expect(text).not.toContain('Bash(git status)');
    expect(text).not.toContain('./codex-only.sh');
    // No masking, reveal, run, or merge control anywhere on the page
    // (FR-012, FR-020, FR-027).
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /run|execute|merge|apply|fix/iu })).toHaveCount(
      0,
    );
  });

  test('moves a side among the row’s own carriers', async ({ page }) => {
    // Three carriers declare this event, so each side offers a file to move
    // to. The pickers stay inside the row: stepping to another event goes
    // through that event's own entry link.
    await page.goto(
      new URL(
        `/hooks/compare?event=${SHARED_EVENT}&left=.claude%2Fsettings.json&right=.codex%2Fhooks.json`,
        host.origin,
      ).toString(),
    );
    const main = page.locator('main');
    await expect(main.locator('.aci-hook-recognition-comparison__diff')).toContainText(
      SETTINGS_SECRET,
    );

    const second = page.getByLabel('Second hook file', { exact: true });
    await expect(second).toBeVisible();
    await second.selectOption('.claude/settings.local.json');
    // The router writes a path value into the query unencoded, so the URL
    // reads as the file's own path.
    await expect(page).toHaveURL(/right=\.claude\/settings\.local\.json/u);
    await expect(main).toContainText('.claude/settings.local.json');
    await expect(main.locator('.aci-hook-recognition-comparison__diff')).toContainText(
      'announce.sh',
    );
    // The side that moved away is gone with its declaration: the Codex
    // command is no longer on the page.
    await expect(main.locator('.aci-hook-recognition-comparison__diff')).not.toContainText(
      CODEX_SECRET,
    );
    // The other side's own file is unselectable — the two sides would hold one
    // file (FR-011).
    await expect(
      page
        .getByLabel('First hook file', { exact: true })
        .locator('option[value=".claude/settings.local.json"]'),
    ).toBeDisabled();
  });

  test('rejects a file the named event’s row does not hold', async ({ page }) => {
    // A readable, current hook carrier that declares another event: it is on
    // its own row, not this one (FR-011).
    await page.goto(
      new URL(
        `/hooks/compare?event=${SHARED_EVENT}&left=.codex%2Fhooks.json&right=.github%2Fhooks%2Fformat.json`,
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'A file this link names does not declare this event in the current scan.',
    );
    expect(await page.locator('main').innerText()).not.toContain(CODEX_SECRET);

    // An owner whose `hooks` is part of the customization it defines: the
    // subagent publishes its keys on its own row and no hook row at all, so
    // no hook comparison can name it.
    await page.goto(
      new URL(
        `/hooks/compare?event=${SHARED_EVENT}&left=.codex%2Fhooks.json&right=.claude%2Fagents%2Freviewer.md`,
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'A file this link names does not declare this event in the current scan.',
    );
    expect(await page.locator('main').innerText()).not.toContain('./scripts/agent-owned.sh');

    // The command a declaration names: a file this scan holds, and what a
    // client would run when the event fires. Nothing a client decides or does
    // at runtime is a comparable side, because no row holds such a value
    // (FR-009).
    await page.goto(
      new URL(
        `/hooks/compare?event=${SHARED_EVENT}&left=.claude%2Fsettings.json&right=.claude%2Fhooks%2Fannounce.sh`,
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'A file this link names does not declare this event in the current scan.',
    );
    expect(await page.locator('main').innerText()).not.toContain(SETTINGS_SECRET);
  });

  test('rejects an event no current row is, and a link with no event', async ({ page }) => {
    await page.goto(
      new URL(
        '/hooks/compare?event=NoSuchEvent&left=.codex%2Fhooks.json&right=.claude%2Fsettings.json',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'No declared hook event in the current scan matches this link’s.',
    );

    await page.goto(
      new URL(
        '/hooks/compare?left=.codex%2Fhooks.json&right=.claude%2Fsettings.json',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText('This link names no hook comparison.');
  });

  test('rejects the same carrier on both sides', async ({ page }) => {
    await page.goto(
      new URL(
        `/hooks/compare?event=${SHARED_EVENT}&left=.claude%2Fsettings.json&right=.claude%2Fsettings.json`,
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'A comparison needs the declaration from two distinct files, and this link names the same file twice.',
    );
  });

  test('reaches the comparison from a carrier’s own detail page', async ({ page }) => {
    // The carrier view carries one entry link per declared event whose row
    // holds a counterpart; the event declared by one carrier alone has none.
    await page.goto(new URL('/hooks/.codex/hooks.json', host.origin).toString());
    await expect(page.getByRole('heading', { name: '.codex/hooks.json' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: "Compare this event's declarations: SessionStart" }),
    ).toHaveCount(0);
    await page
      .getByRole('link', { name: `Compare this event's declarations: ${SHARED_EVENT}` })
      .click();
    await expect(page).toHaveURL(/\/hooks\/compare\?/u);
    await expect(page).toHaveURL(new RegExp(`event=${SHARED_EVENT}`, 'u'));
    await expect(page.locator('main')).toContainText('Repository · Hook · hook file');
  });
});
