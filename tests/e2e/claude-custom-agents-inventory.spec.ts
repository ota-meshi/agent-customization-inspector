// T530: browser acceptance for the Claude subagent inventory (Phase 51).
// Launches the packaged CLI against a fixture whose root `.claude/agents/`
// subtree holds Markdown subagents, opens the printed loopback URL, and
// verifies the rendered rows — one row per agent name, with a subfolder
// changing nothing about identity and a duplicate name listing both files with
// no winner — beside the rows Copilot's own reading of `.claude/agents/` adds,
// the retained Codex agent rows, the filters, the excluded memory and
// extra-directory locations, and the diagnostics.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection); what is asserted here is what a user
// can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential inside a declared block, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDEAGENTS00000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_AGENTS_ENDPOINT}';

test.describe('subagents in the root agents subtree', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-agents-'));
    await mkdir(join(fixture, '.claude/agents/review'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/agents/code-reviewer.md'),
      [
        '---',
        'name: code-reviewer',
        'description: Reviews code for quality',
        'tools: Read, Glob, Grep',
        '---',
        '',
        'Review like an owner.',
        '',
      ].join('\n'),
      'utf8',
    );
    // A subfolder changes nothing about identity: the vendor states the name
    // comes only from the `name` frontmatter field.
    await writeFile(
      join(fixture, '.claude/agents/review/security.md'),
      ['---', 'name: security-reviewer', 'description: Looks for risks', '---', '', 'x', ''].join(
        '\n',
      ),
      'utf8',
    );
    // Two files under one tree declaring one name: the vendor loads one by
    // filesystem read order and documents no precedence, so the row lists both
    // and states no winner.
    await writeFile(
      join(fixture, '.claude/agents/debugger.md'),
      ['---', 'name: debugger', 'description: Debugs failures', '---', '', 'x', ''].join('\n'),
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude/agents/review/debugger.md'),
      ['---', 'name: debugger', 'description: The same name again', '---', '', 'x', ''].join('\n'),
      'utf8',
    );
    // The credential, the environment reference, and an `mcpServers` block are
    // authored content this file happens to hold. None may reach a row, and
    // the declared server joins no MCP inventory (FR-026, FR-027).
    await writeFile(
      join(fixture, '.claude/agents/browser-tester.md'),
      [
        '---',
        'name: browser-tester',
        'description: Drives a browser',
        'mcpServers:',
        '  - playwright:',
        '      command: npx',
        '      env:',
        `        API_KEY: ${FIXTURE_SECRET}`,
        `        ENDPOINT: ${ENVIRONMENT_REFERENCE}`,
        '---',
        '',
        'Drive the browser.',
        '',
      ].join('\n'),
      'utf8',
    );
    // Declares no name: the vendor documents treating such a file as
    // documentation kept beside the agents, so it joins the row that says the
    // name is not known rather than being named after its path.
    await writeFile(
      join(fixture, '.claude/agents/README.md'),
      ['---', 'description: Notes beside the agents', '---', '', 'x', ''].join('\n'),
      'utf8',
    );
    // Malformed frontmatter: the recognition fails all-or-nothing (FR-028).
    await writeFile(
      join(fixture, '.claude/agents/broken.md'),
      '---\nname: [unterminated\n---\n\n# Broken\n',
      'utf8',
    );
    // The Codex agent rows this phase must leave exactly as their own phase
    // committed them.
    await mkdir(join(fixture, '.codex/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/agents/reviewer.toml'),
      ['name = "reviewer"', 'description = "PR reviewer."', ''].join('\n'),
      'utf8',
    );
    // Near miss: the memory directories a running subagent writes.
    await mkdir(join(fixture, '.claude/agent-memory/code-reviewer'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/agent-memory/code-reviewer/MEMORY.md'),
      '# Remembered\n',
      'utf8',
    );
    await mkdir(join(fixture, '.claude/agent-memory-local/code-reviewer'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/agent-memory-local/code-reviewer/MEMORY.md'),
      '# Local\n',
      'utf8',
    );
    // Near miss: a subdirectory `.claude` layer belongs to a runtime working
    // directory this product never selects.
    await mkdir(join(fixture, 'packages/api/.claude/agents'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.claude/agents/code-reviewer.md'),
      '---\nname: code-reviewer\n---\n',
      'utf8',
    );
    // Near miss: the extra directory a `--add-dir` run would contribute.
    await mkdir(join(fixture, 'extra/.claude/agents'), { recursive: true });
    await writeFile(
      join(fixture, 'extra/.claude/agents/helper.md'),
      '---\nname: helper\n---\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per declared name, a subfolder changing nothing', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();

    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Seven named rows in name order — the Codex agent among them, because the
    // inventory is the kind's rather than a product's — then the one
    // null-named row that closes the list. `README` and `broken` are rows
    // because Copilot also loads project agents from `.claude/agents/` and
    // identifies each by its configuration file's own name, so the two files
    // that publish no declared name to Claude Code still head a Copilot row.
    await expect(items.locator('.aci-agent-row__name')).toHaveText([
      'README',
      'broken',
      'browser-tester',
      'code-reviewer',
      'debugger',
      'reviewer',
      'security-reviewer',
      'No known agent name',
    ]);
    // The nested file heads its own name's row: the subfolder path does not
    // affect identity.
    // A nested file is Claude's alone: no Copilot page documents a subfolder
    // inside an agents directory, so its row has the one definition.
    const nested = items.filter({ hasText: 'security-reviewer' });
    await expect(nested.locator('.aci-agent-row__definitions .aci-path')).toHaveText([
      '.claude/agents/review/security.md',
    ]);
    // The duplicate name is one row listing both files, in path order, with
    // no winner stated anywhere on the page.
    const duplicate = items.filter({ hasText: 'debugger' }).first();
    await expect(duplicate.locator('.aci-agent-row__definitions .aci-path')).toHaveText([
      '.claude/agents/debugger.md',
      '.claude/agents/review/debugger.md',
    ]);
    await expect(duplicate.locator('.aci-agent-row__definitions')).toContainText('Claude Code');
    const duplicateText = await duplicate.innerText();
    for (const projected of ['wins', 'winner', 'precedence', 'active', 'selected']) {
      expect(duplicateText.toLowerCase()).not.toContain(projected);
    }
  });

  test('keeps the Codex agent rows exactly as their own phase committed them', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const codex = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'reviewer' })
      .filter({ hasText: '.codex/agents/reviewer.toml' });
    await expect(codex.locator('.aci-agent-row__definitions')).toContainText('OpenAI Codex');
  });

  test('publishes no MCP row for a subagent and leaks no declared value', async ({ page }) => {
    await page.goto(host.origin);
    // An MCP declaration's home is an explicit carrier: this tree holds none.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);

    await page.getByRole('tab', { name: /Agent/u }).click();
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('Review like an owner.');
    expect(text).not.toContain('Read, Glob, Grep');
    // The excluded locations appear nowhere: the memory a running subagent
    // wrote, the subdirectory layer, and the `--add-dir` directory.
    expect(text).not.toContain('agent-memory');
    expect(text).not.toContain('packages/api/.claude/agents/code-reviewer.md');
    expect(text).not.toContain('extra/.claude/agents/helper.md');
    await expect(page.getByRole('button', { name: /spawn|run|select|delegate/iu })).toHaveCount(0);
  });

  test('narrows the agent rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(8);

    // Tool: selecting Claude drops the Codex row and the two rows only
    // Copilot names, selecting Copilot leaves the six direct children it
    // reaches, and selecting Codex leaves exactly its own — the kind's
    // inventory holds all three products.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(5);
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items.locator('.aci-agent-row__name')).toHaveText([
      'README',
      'broken',
      'browser-tester',
      'code-reviewer',
      'debugger',
    ]);
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-agent-row__name')).toHaveText(['reviewer']);

    // Path: the filter applies to each definition's own file path, and a row
    // with no matching definition is dropped rather than emptied.
    await page.getByLabel('Tool').selectOption('');
    await page.getByLabel('Path contains').fill('review/');
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-agent-row__name')).toHaveText([
      'debugger',
      'security-reviewer',
    ]);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(8);
  });

  test('states the malformed file’s diagnostic beside the row that holds it', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.locator('.aci-scan-progress')).toContainText(
      '1 file(s) kept a diagnostic of their own',
    );
    await page.getByRole('tab', { name: /Agent/u }).click();
    const unnamed = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'No known agent name' });
    // Both members of the row, each stating its own fact.
    await expect(unnamed).toContainText('.claude/agents/README.md');
    await expect(unnamed).toContainText('This file declares no agent name.');
    await expect(unnamed).toContainText('.claude/agents/broken.md');
    await expect(unnamed).toContainText('This file could not be parsed');
  });
});
