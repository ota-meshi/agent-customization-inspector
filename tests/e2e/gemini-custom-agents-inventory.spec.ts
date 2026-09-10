// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// sub-agent inventory. Launches the packaged CLI against a tree whose root
// `.gemini/agents/` holds Markdown agents, opens the printed loopback URL, and
// verifies the rendered rows — one per declared agent name, with every file
// declaring it listed inside — beside the filters, the near misses' absence,
// the null-named row's two states, and the absence of any MCP row an agent's
// own `mcpServers` block might have produced (spec.md FR-002, FR-008, FR-028).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential inside a declared block, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EGEMINIAGENTS000000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${GEMINI_E2E_AGENTS_ENDPOINT}';

test.describe('sub-agents at the root agents directory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-agents-'));
    await mkdir(join(fixture, '.gemini/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.gemini/agents/reviewer.md'),
      '---\nname: reviewer\ndescription: Reviews a diff.\ntools: ["read_file"]\nmodel: gemini-2.5-pro\n---\n\nReview the change.\n',
      'utf8',
    );
    // Two files declaring one name: the row unit is the name, so they are two
    // definitions of one row rather than two rows.
    await writeFile(
      join(fixture, '.gemini/agents/test-writer.md'),
      '---\nname: test-writer\n---\n\nWrite the missing tests.\n',
      'utf8',
    );
    await writeFile(
      join(fixture, '.gemini/agents/test-writer-strict.md'),
      '---\nname: test-writer\ndescription: The same agent name in a second file.\n---\n\nBe strict.\n',
      'utf8',
    );
    // An `mcpServers` block in the frontmatter, holding the credential and the
    // reference: the agent's own content, no MCP row (data-model.md § Inventory
    // unit; FR-026, FR-027).
    await writeFile(
      join(fixture, '.gemini/agents/docs-researcher.md'),
      [
        '---',
        'name: docs_researcher',
        'mcpServers:',
        '  docs:',
        '    httpUrl: https://docs.example.com/mcp',
        `    headers: { Authorization: "Bearer ${FIXTURE_SECRET}" }`,
        `    endpoint: ${ENVIRONMENT_REFERENCE}`,
        '---',
        '',
        'Confirm APIs against the docs.',
        '',
      ].join('\n'),
      'utf8',
    );
    // Declares no name: it joins the row that says the name is not known.
    await writeFile(
      join(fixture, '.gemini/agents/nameless.md'),
      '---\ndescription: Declares no name.\n---\n\nDo the work.\n',
      'utf8',
    );
    // Malformed frontmatter: the recognition fails all-or-nothing (FR-028).
    await writeFile(
      join(fixture, '.gemini/agents/broken.md'),
      '---\nname: [unterminated\n---\n',
      'utf8',
    );
    // Near misses: one directory below, a nested agents directory, and the
    // singular and non-Markdown spellings.
    await mkdir(join(fixture, '.gemini/agents/archive'), { recursive: true });
    await writeFile(
      join(fixture, '.gemini/agents/archive/old.md'),
      '---\nname: old\n---\n',
      'utf8',
    );
    await mkdir(join(fixture, 'packages/api/.gemini/agents'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.gemini/agents/reviewer.md'),
      '---\nname: nested\n---\n',
      'utf8',
    );
    await writeFile(join(fixture, '.gemini/agents/README.txt'), 'agents live here\n', 'utf8');
    await mkdir(join(fixture, '.gemini/agent'), { recursive: true });
    await writeFile(join(fixture, '.gemini/agent/solo.md'), '---\nname: solo\n---\n', 'utf8');
    // The unchanged instruction row beside the agent rows.
    await writeFile(join(fixture, 'GEMINI.md'), '# instructions\n', 'utf8');

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
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'docs_researcher',
      'reviewer',
      'test-writer',
      'No known agent name',
    ]);
    const shared = items.filter({ hasText: 'test-writer' }).first();
    await expect(shared.locator('.aci-source-family-blocks__members .aci-path')).toHaveText([
      '.gemini/agents/test-writer-strict.md',
      '.gemini/agents/test-writer.md',
    ]);
    await expect(shared.locator('.aci-source-family-blocks__members')).toContainText('Gemini CLI');

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
    // so the MCP tab does not exist however many agents spell `mcpServers`.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);

    await page.getByRole('tab', { name: /Agent/u }).click();
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('docs.example.com');
    expect(text).not.toContain('Review the change.');
    expect(text).not.toContain('gemini-2.5-pro');
    for (const nearMiss of [
      '.gemini/agents/archive/old.md',
      'packages/api/.gemini/agents/reviewer.md',
      '.gemini/agents/README.txt',
      '.gemini/agent/solo.md',
    ]) {
      expect(text, nearMiss).not.toContain(nearMiss);
    }
    await expect(page.getByRole('button', { name: /spawn|run|select|delegate/iu })).toHaveCount(0);
  });

  test('narrows the agent rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(4);

    // Tool: the control offers the products that recognize something in
    // this tree — the agent files are Gemini CLI's alone.
    await expect(page.getByLabel('Tool').locator('option')).toHaveText([
      'All tools',
      'GitHub Copilot',
      'Gemini CLI',
    ]);
    await page.getByLabel('Tool').selectOption('gemini');
    await expect(items).toHaveCount(4);
    // Copilot is offered for the root `GEMINI.md` it also reads, and
    // recognizes none of these files.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(0);
    await page.getByLabel('Tool').selectOption({ label: 'All tools' });

    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('reviewer');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['reviewer']);
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('no-such-agent');
    await expect(items).toHaveCount(0);
    await page.locator('.aci-empty-result').getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(4);
  });
});
