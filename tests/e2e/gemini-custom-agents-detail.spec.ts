// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// sub-agent detail. Opens a `.gemini/agents/*.md` from the agent tab and
// verifies the two halves the page shows — the metadata as YAML and the
// instructions as Markdown — beside the complete authored source, a credential
// shown exactly as authored with no masking or reveal control, a literal
// environment reference never replaced by the process value a same-named
// variable carries, the absence of any MCP row for a declared `mcpServers`
// block, the failed-extraction state, and navigation back to the agent tab
// (FR-007, FR-025 through FR-028).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { sourceBoxDecorations } from './source-viewer';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential inside a declared block, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EGEMINIAGENTDETAIL0000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${GEMINI_E2E_AGENT_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** The complete authored text of the agent the detail cases open. */
const DOCS_RESEARCHER = [
  '---',
  'name: docs_researcher',
  'description: Documentation specialist.',
  'tools: ["read_file", "web_fetch"]',
  'model: gemini-2.5-pro',
  'mcpServers:',
  '  docs:',
  '    httpUrl: https://docs.example.com/mcp',
  `    headers: { Authorization: "Bearer ${FIXTURE_SECRET}" }`,
  `    endpoint: ${ENVIRONMENT_REFERENCE}`,
  '---',
  '',
  '# Docs researcher',
  '',
  'Use the docs server to confirm APIs.',
  '- Return concise answers.',
  '',
].join('\n');

test.describe('the complete literal Gemini CLI sub-agent detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-agents-detail-'));
    await mkdir(join(fixture, '.gemini/agents'), { recursive: true });
    await writeFile(join(fixture, '.gemini/agents/docs-researcher.md'), DOCS_RESEARCHER, 'utf8');
    await writeFile(
      join(fixture, '.gemini/agents/reviewer.md'),
      '---\nname: reviewer\n---\n\nReview the change.\n',
      'utf8',
    );
    process.env['GEMINI_E2E_AGENT_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['GEMINI_E2E_AGENT_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows its metadata and instructions', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'docs_researcher' })
      .getByRole('link', { name: /docs-researcher\.md/u })
      .click();
    await expect(page).toHaveURL(
      /\/agents\/detail\/repository\/\.gemini\/agents\/docs-researcher\.md\?name=docs_researcher$/u,
    );
    await expect(
      page.getByRole('heading', { name: '.gemini/agents/docs-researcher.md' }),
    ).toBeVisible();

    const main = page.locator('main');
    await expect(page.locator('.aci-detail-attributes')).toContainText('Gemini CLI');
    await expect(main).toContainText('Agent name: docs_researcher');
    // The parse tab leads: the metadata as one YAML document in the file's own
    // order and the instructions as the Markdown they are written in (FR-007).
    await expect(page.getByRole('tab', { name: 'Agent', selected: true })).toBeVisible();
    await expect(main.locator('h3')).toHaveText([
      'Metadata YAML',
      'Instructions Markdown',
      'Source',
    ]);
    await expect(main).toContainText('name: docs_researcher');
    await expect(main).toContainText('model: gemini-2.5-pro');
    await expect(main).toContainText('Use the docs server to confirm APIs.');
    // Every declared value stays the characters the file wrote (FR-025, FR-026).
    await expect(main).toContainText('https://docs.example.com/mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /spawn|run|connect|delegate/iu })).toHaveCount(0);
  });

  test('shows the complete authored source under the file tab', async ({ page }) => {
    await page.goto(
      new URL(
        '/agents/detail/repository/.gemini/agents/docs-researcher.md',
        host.origin,
      ).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    await expect(main).toContainText('Readable text');
    await expect(main).toContainText('---');
    await expect(main).toContainText('mcpServers:');
    await expect(main).toContainText('# Docs researcher');
    await expect(sourceBoxDecorations(page)).toHaveCount(0);
  });

  test('publishes no MCP surface for the declared server block', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);
    await page.goto(
      new URL('/mcp/detail/repository/.gemini/agents/docs-researcher.md', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
  });

  test('returns to the agent tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.gemini/agents/reviewer.md', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.gemini/agents/reviewer.md' })).toBeVisible();
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=agent$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Agent');
  });
});

test.describe('an agent file whose declarations could not be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-agents-detail-failed-'));
    await mkdir(join(fixture, '.gemini/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.gemini/agents/broken.md'),
      '---\nname: [unterminated\nmodel: gemini-2.5-pro\n---\n\nBody.\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lands on the file tab with the failure stated and the source intact', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.gemini/agents/broken.md', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.gemini/agents/broken.md' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'File', selected: true })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('This file could not be parsed');
    await expect(main).toContainText('name: [unterminated');
    await expect(main).toContainText(
      'The declarations in this file could not be read, so its agent name is unknown.',
    );
    expect(await main.innerText()).not.toContain('Metadata');
  });
});
