// T510: browser acceptance for the Codex custom-agent inventory (Phase 49).
// Launches the packaged CLI against a fixture whose root `.codex/agents/`
// holds standalone TOML agents, opens the printed loopback URL, and verifies
// the rendered rows — one row per declared agent name, with every file
// declaring it listed inside — beside the filters, the near misses' absence,
// the null-named row's two states, and the absence of any MCP row an agent's
// own `mcp_servers` block might have produced.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection); what is asserted here is what a user
// can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential inside a declared table, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EAGENTS0000000000000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_AGENTS_ENDPOINT}';

test.describe('custom agents at the root agents directory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-agents-'));
    await mkdir(join(fixture, '.codex/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/agents/pr-explorer.toml'),
      [
        'name = "pr_explorer"',
        'description = "Read-only codebase explorer."',
        'model = "gpt-5.3-codex-spark"',
        'sandbox_mode = "read-only"',
        'developer_instructions = "Stay in exploration mode."',
        '',
      ].join('\n'),
      'utf8',
    );
    // Two files declaring one name: the row unit is the name, so they are two
    // definitions of one row rather than two rows.
    await writeFile(
      join(fixture, '.codex/agents/reviewer.toml'),
      [
        'name = "reviewer"',
        'description = "PR reviewer."',
        'developer_instructions = "Review code like an owner."',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(fixture, '.codex/agents/reviewer-strict.toml'),
      [
        'name = "reviewer"',
        'description = "The same agent name in a second file."',
        'developer_instructions = "Be strict."',
        '',
      ].join('\n'),
      'utf8',
    );
    // The credential, the environment reference, and an `mcp_servers` table
    // are authored content this file happens to hold. None may reach a row,
    // nothing resolves the reference against the process environment, and the
    // declared server joins no MCP inventory (FR-026, FR-027; data-model.md
    // § Inventory unit).
    await writeFile(
      join(fixture, '.codex/agents/docs-researcher.toml'),
      [
        'name = "docs_researcher"',
        'description = "Documentation specialist."',
        'developer_instructions = "Confirm APIs against the docs."',
        '',
        '[mcp_servers.docs]',
        'url = "https://docs.example.com/mcp"',
        '',
        '[mcp_servers.docs.env]',
        `API_KEY = "${FIXTURE_SECRET}"`,
        `ENDPOINT = "${ENVIRONMENT_REFERENCE}"`,
        '',
      ].join('\n'),
      'utf8',
    );
    // Declares no name: the vendor makes the declared `name` the identity and
    // a matching filename convention, so this file joins the row that says the
    // name is not known rather than being named after its path.
    await writeFile(
      join(fixture, '.codex/agents/nameless.toml'),
      ['description = "Declares no name."', 'developer_instructions = "Do the work."', ''].join(
        '\n',
      ),
      'utf8',
    );
    // Malformed TOML: the recognition fails all-or-nothing, so the name is
    // unknown rather than absent and the file keeps its diagnostic (FR-028).
    await writeFile(join(fixture, '.codex/agents/broken.toml'), 'name = "unterminated\n', 'utf8');
    // Near miss: the page names `.codex/agents/` and documents no recursion.
    await mkdir(join(fixture, '.codex/agents/team'), { recursive: true });
    await writeFile(join(fixture, '.codex/agents/team/nested.toml'), 'name = "nested"\n', 'utf8');
    // Near miss: a subdirectory `.codex` layer belongs to a runtime working
    // directory this product never selects.
    await mkdir(join(fixture, 'packages/api/.codex/agents'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.codex/agents/reviewer.toml'),
      'name = "reviewer"\n',
      'utf8',
    );
    // Near misses: the extension and the container literals are exact.
    await writeFile(join(fixture, '.codex/agents/reviewer.toml.bak'), 'name = "suffix"\n', 'utf8');
    await mkdir(join(fixture, '.codex/agent'), { recursive: true });
    await writeFile(join(fixture, '.codex/agent/reviewer.toml'), 'name = "singular"\n', 'utf8');
    // The unchanged instruction row beside the new agent rows.
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per declared name, with every file declaring it', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    await page.getByRole('tab', { name: /Agent/u }).click();

    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Three named rows in name order, then the one null-named row that closes
    // the list (data-model.md § Inventory unit).
    await expect(items).toHaveCount(4);
    await expect(items.locator('.aci-agent-row__name')).toHaveText([
      'docs_researcher',
      'pr_explorer',
      'reviewer',
      'No known agent name',
    ]);
    // The name two files declare is one row listing both, in path order.
    const shared = items.filter({ hasText: 'reviewer' }).first();
    await expect(shared.locator('.aci-source-family-blocks__members .aci-path')).toHaveText([
      '.codex/agents/reviewer-strict.toml',
      '.codex/agents/reviewer.toml',
    ]);
    await expect(shared.locator('.aci-source-family-blocks__members')).toContainText(
      'OpenAI Codex',
    );

    // The null-named row's members state their two different facts.
    const unnamed = items.filter({ hasText: 'No known agent name' });
    await expect(unnamed).toContainText('This file declares no agent name.');
    await expect(unnamed).toContainText('The declarations in this file could not be read.');

    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 4 of 4',
    );
  });

  test('publishes no MCP row for an agent and leaks no declared value', async ({ page }) => {
    await page.goto(host.origin);
    // An MCP declaration's home is an explicit carrier: this tree holds none,
    // so the MCP tab does not exist however many agents spell `mcp_servers`.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);

    await page.getByRole('tab', { name: /Agent/u }).click();
    const text = await page.locator('main').innerText();
    // Nothing an agent declares reaches the inventory — the instructions, the
    // model, the declared server, the credential inside it — and nothing
    // resolves the environment reference.
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('docs.example.com');
    expect(text).not.toContain('Stay in exploration mode.');
    expect(text).not.toContain('gpt-5.3-codex-spark');
    // The near misses appear nowhere on the page.
    expect(text).not.toContain('.codex/agents/team/nested.toml');
    expect(text).not.toContain('packages/api/.codex/agents/reviewer.toml');
    expect(text).not.toContain('reviewer.toml.bak');
    expect(text).not.toContain('.codex/agent/reviewer.toml');
    // And no control offers to spawn, select, or run an agent.
    await expect(page.getByRole('button', { name: /spawn|run|select|delegate/iu })).toHaveCount(0);
  });

  test('keeps the instruction rows exactly as their own phase committed them', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['AGENTS.md']);
    const instructionsText = await page.getByRole('tabpanel').innerText();
    expect(instructionsText).not.toContain('.codex/agents/');
  });

  test('narrows the agent rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(4);

    // Tool: the agent files are Codex's recognition alone.
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items).toHaveCount(4);

    // Path: the filter applies to each definition's own file path, and a row
    // with no matching definition is dropped rather than emptied.
    await page.getByLabel('Path contains').fill('reviewer');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-agent-row__name')).toHaveText(['reviewer']);

    await page.getByLabel('Path contains').fill('no-such-agent');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(4);
  });

  test('states the malformed file’s diagnostic beside the row that holds it', async ({ page }) => {
    await page.goto(host.origin);
    // A file-confined extraction failure keeps the generation publishable and
    // marks it partial; the scan status says how many files kept a diagnostic.
    await expect(page.locator('.aci-scan-progress')).toContainText(
      '1 file(s) kept a diagnostic of their own',
    );
    await page.getByRole('tab', { name: /Agent/u }).click();
    const unnamed = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'No known agent name' });
    await expect(unnamed).toContainText('.codex/agents/broken.toml');
    await expect(unnamed).toContainText('This file could not be parsed');
  });
});
