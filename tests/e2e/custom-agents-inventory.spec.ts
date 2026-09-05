// T569: browser acceptance for the unified custom-agent inventory (Phase 55).
// Launches the packaged CLI against a fixture holding every product's agent
// locations at once and verifies what the one Agent tab shows: rows from all
// three products in one name-ordered list, one physical file listed once per
// row however many products recognize it, the two names a shared
// `.claude/agents/*.md` is listed under, the tool and path filters over the
// combined list, the excluded locations, the diagnostics, the absence of any
// MCP row owned by an agent file, and keyboard navigation of the kind tabs.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection); what is asserted here is what a user
// can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openRepositoryStatus } from './repository-status';

/** A literal credential inside a declared block, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EALLAGENTS0000000000000000000000000';

test.describe('every product’s custom agents in one inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-all-agents-'));
    await mkdir(join(fixture, '.codex/agents'), { recursive: true });
    await mkdir(join(fixture, '.claude/agents/review'), { recursive: true });
    await mkdir(join(fixture, '.github/agents'), { recursive: true });

    // Codex: a TOML agent whose `[mcp_servers.*]` table is its own content.
    await writeFile(
      join(fixture, '.codex/agents/docs-researcher.toml'),
      [
        'name = "docs_researcher"',
        'description = "Documentation specialist."',
        'developer_instructions = "Confirm APIs before answering."',
        '',
        '[mcp_servers.docs]',
        `api_key = "${FIXTURE_SECRET}"`,
        '',
      ].join('\n'),
      'utf8',
    );
    // Claude Code alone: a nested file, which no Copilot page documents.
    await writeFile(
      join(fixture, '.claude/agents/review/security.md'),
      ['---', 'name: security-reviewer', 'description: Looks for risks', '---', '', 'x', ''].join(
        '\n',
      ),
      'utf8',
    );
    // One physical file both Markdown products define an agent from, under two
    // different names: Claude Code's declared `name`, Copilot's file name.
    await writeFile(
      join(fixture, '.claude/agents/shared.md'),
      [
        '---',
        'name: shared-reviewer',
        'description: One file, two products',
        '---',
        '',
        'x',
        '',
      ].join('\n'),
      'utf8',
    );
    // One physical file both products name identically, so it is one row with
    // two definitions rather than two rows.
    await writeFile(
      join(fixture, '.claude/agents/debugger.md'),
      ['---', 'name: debugger', 'description: Debugs failures', '---', '', 'x', ''].join('\n'),
      'utf8',
    );
    // Copilot alone: a profile in the directory only Copilot reads.
    await writeFile(
      join(fixture, '.github/agents/planner.md'),
      ['---', 'name: Release planner', 'description: Plans a release', '---', '', 'x', ''].join(
        '\n',
      ),
      'utf8',
    );
    // Malformed: the recognition fails all-or-nothing (FR-028). Claude Code
    // publishes no name for it, Copilot still names it from the file, so the
    // one file is both a named row and a member of the null-named one.
    await writeFile(
      join(fixture, '.claude/agents/broken.md'),
      '---\nname: [unterminated\n---\n\n# Broken\n',
      'utf8',
    );
    // Near misses: the memory a running subagent writes, a subdirectory layer,
    // and the extra directory a `--add-dir` run would contribute.
    await mkdir(join(fixture, '.claude/agent-memory/debugger'), { recursive: true });
    await writeFile(join(fixture, '.claude/agent-memory/debugger/MEMORY.md'), '# notes\n', 'utf8');
    await mkdir(join(fixture, 'packages/api/.claude/agents'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.claude/agents/debugger.md'),
      '---\nname: debugger\n---\n',
      'utf8',
    );
    await mkdir(join(fixture, 'extra/.github/agents'), { recursive: true });
    await writeFile(
      join(fixture, 'extra/.github/agents/helper.md'),
      '---\nname: helper\n---\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists every product’s agents as one name-ordered inventory', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();

    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One list for the kind, not one per product: `broken` and `planner` are
    // Copilot's names for their files, `debugger` is the one name both
    // Markdown products give one file, `docs_researcher` is Codex's,
    // `security-reviewer` is Claude Code's alone, and `shared`/`shared-reviewer`
    // are the two names one file has. The null-named row closes the list with
    // the file whose declarations Claude Code could not read.
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'broken',
      'debugger',
      'docs_researcher',
      'planner',
      'security-reviewer',
      'shared',
      'shared-reviewer',
      'No known agent name',
    ]);
    // One physical file is one line and one link however many products
    // recognize it, with each product stated beside the link.
    const shared = items.filter({ hasText: 'debugger' }).first();
    await expect(shared.locator('.aci-source-family-blocks__members .aci-path')).toHaveText([
      '.claude/agents/debugger.md',
    ]);
    const sharedText = await shared.innerText();
    expect(sharedText).toContain('GitHub Copilot');
    expect(sharedText).toContain('Claude Code');
  });

  test('states no winner and projects no runtime composition', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const text = (await page.getByRole('tabpanel').innerText()).toLowerCase();
    // An admission is not an activation: nothing on this page orders the
    // definitions of one name, names an inheriting parent, or claims a spawn
    // (FR-009).
    for (const projected of ['wins', 'winner', 'precedence', 'active', 'selected', 'inherit']) {
      expect(text).not.toContain(projected);
    }
    await expect(page.getByRole('button', { name: /spawn|run|select|delegate/iu })).toHaveCount(0);
  });

  test('publishes no MCP row owned by an agent file and leaks no declared value', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // An MCP declaration's home is an explicit carrier: this tree holds none,
    // so the Codex agent's `[mcp_servers.*]` table and the profiles' keys
    // create no MCP tab at all.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);

    await page.getByRole('tab', { name: /Agent/u }).click();
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain('Documentation specialist.');
    expect(text).not.toContain('Release planner');
    // The excluded locations appear nowhere.
    expect(text).not.toContain('agent-memory');
    expect(text).not.toContain('packages/api/.claude/agents/debugger.md');
    expect(text).not.toContain('extra/.github/agents/helper.md');
  });

  test('narrows the combined list with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(8);

    await page.getByLabel('Tool').selectOption('codex');
    await expect(items.locator('.aci-row-head__name')).toHaveText(['docs_researcher']);
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'debugger',
      'security-reviewer',
      'shared-reviewer',
      'No known agent name',
    ]);
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'broken',
      'debugger',
      'planner',
      'shared',
    ]);

    // Path: the filter applies to each definition's own file path, and a row
    // with no matching definition is dropped rather than emptied.
    await page.getByLabel('Tool').selectOption('');
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('.github/');
    await expect(items.locator('.aci-row-head__name')).toHaveText(['planner']);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(8);
  });

  test('states the malformed file’s diagnostic beside the rows that hold it', async ({ page }) => {
    await page.goto(host.origin);
    // The count of files that kept a diagnostic is the Repository Source's own
    // state, which is a surface of its own now (FR-030).
    await expect(await openRepositoryStatus(page)).toContainText(
      '1 file kept a diagnostic of its own',
    );
    await page.getByRole('link', { name: /Back to /u }).click();
    await page.getByRole('tab', { name: /Agent/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // The file's own diagnostic travels with every row it is a definition of,
    // because the extraction ran once per file.
    const named = items.filter({ hasText: 'broken' }).first();
    await expect(named).toContainText('This file could not be parsed');
    const unnamed = items.filter({ hasText: 'No known agent name' });
    await expect(unnamed).toContainText('.claude/agents/broken.md');
    await expect(unnamed).toContainText('The declarations in this file could not be read.');
  });

  test('navigates to the agent tab with the keyboard', async ({ page }) => {
    await page.goto(host.origin);
    const agentTab = page.getByRole('tab', { name: /Agent/u });
    await agentTab.click();
    await expect(agentTab).toHaveAttribute('aria-selected', 'true');
    // The strip is one stop in the page tab order and moves with the arrow
    // keys, as the WAI-ARIA tabs pattern requires (QR-004).
    await agentTab.focus();
    await expect(agentTab).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { selected: true })).toBeFocused();
  });
});
