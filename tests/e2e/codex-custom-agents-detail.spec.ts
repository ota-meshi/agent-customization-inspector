// T521: browser acceptance for the Codex custom-agent detail (Phase 50).
// Launches the packaged CLI against a fixture whose root `.codex/agents/`
// holds standalone TOML agents, opens one from the agent tab, and verifies the
// two halves the page shows — the metadata as YAML and the instructions as
// Markdown — beside the complete authored source, a credential shown exactly
// as authored with no masking or reveal control, a literal environment
// reference never replaced by the process value a same-named variable carries
// in the host's own environment, the absence of any MCP row or connection for
// a declared `mcp_servers` table, the failed-extraction state, navigation back
// to the agent tab, and the dead-link state for a path this scan holds no
// agent at.
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openNoKindDisclosure } from './no-kind-disclosure';

/** A literal credential inside a declared table, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EAGENTDETAIL000000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_AGENT_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** A token only the sibling agent carries, so a page showing it is wrong. */
const SIBLING_ONLY_TOKEN = 'sibling-agent-only-token';

/** The complete authored text of the agent the detail cases open. */
const DOCS_RESEARCHER = [
  '# The docs specialist.',
  'name = "docs_researcher"',
  'description = "Documentation specialist."',
  'model = "gpt-5.6-luna"',
  'model_reasoning_effort = "medium"',
  'sandbox_mode = "read-only"',
  'config_file = "./.codex/agents/shared.toml"',
  'developer_instructions = """',
  '# Docs researcher',
  '',
  'Use the docs MCP server to confirm APIs.',
  '- Return concise answers.',
  '"""',
  '',
  '[mcp_servers.docs]',
  'url = "https://docs.example.com/mcp"',
  '',
  '[mcp_servers.docs.env]',
  `API_KEY = "${FIXTURE_SECRET}"`,
  `ENDPOINT = "${ENVIRONMENT_REFERENCE}"`,
  '',
].join('\n');

test.describe('the complete literal Codex custom-agent detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-agents-detail-'));
    await mkdir(join(fixture, '.codex/agents'), { recursive: true });
    await writeFile(join(fixture, '.codex/agents/docs-researcher.toml'), DOCS_RESEARCHER, 'utf8');
    await writeFile(
      join(fixture, '.codex/agents/reviewer.toml'),
      [
        'name = "reviewer"',
        `description = "${SIBLING_ONLY_TOKEN}"`,
        'developer_instructions = "Review code like an owner."',
        '',
      ].join('\n'),
      'utf8',
    );
    // The configured target is never opened on the agent's account: a path a
    // declaration names gains no read authority and creates no candidate.
    await writeFile(join(fixture, '.codex/agents/shared.toml'), 'name = "shared"\n', 'utf8');
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['CODEX_E2E_AGENT_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CODEX_E2E_AGENT_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows its metadata and instructions', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    // The row is headed by the declared agent name; the file path under it is
    // the link to that file's own detail.
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'docs_researcher' })
      .getByRole('link', { name: /docs-researcher\.toml/u })
      .click();
    await expect(page).toHaveURL(
      /\/agents\/detail\/repository\/\.codex\/agents\/docs-researcher\.toml\?name=docs_researcher$/u,
    );
    await expect(
      page.getByRole('heading', { name: '.codex/agents/docs-researcher.toml' }),
    ).toBeVisible();

    const main = page.locator('main');
    // The file's identity restated from its row: the product that recognizes it
    // and the surfaces its admitting rules rest on, on the customization's own
    // attribute line.
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('OpenAI Codex');
    await expect(attributes).toContainText('Local clients');
    await expect(main).toContainText('Agent name: docs_researcher');

    // The parse tab leads, with the metadata as one YAML document in the
    // file's own order and the instructions as the Markdown they are written
    // in (FR-007).
    await expect(page.getByRole('tab', { name: 'Agent', selected: true })).toBeVisible();
    // The declarations lead the two halves, and this kind's comparison leads
    // with the same half, so the two surfaces read alike. Each half's name is
    // the band of the panel holding it, with the format the text is in at the
    // band's end (`SourceViewer.vue` § panelLabel); the File tab's own panel is
    // attached behind the unselected tab.
    await expect(main.locator('h3')).toHaveText([
      'Metadata YAML',
      'Instructions Markdown',
      'Source',
    ]);
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
    await expect(main).toContainText('name: docs_researcher');
    await expect(main).toContainText('model_reasoning_effort: medium');
    // The instructions half holds the prose and nothing else; the key that
    // carried it is not repeated as a metadata entry.
    await expect(main).toContainText('Use the docs MCP server to confirm APIs.');
    expect(await main.innerText()).not.toContain('developer_instructions');

    // Every declared value stays the characters the file wrote: the declared
    // server URL, the credential whole and unmarked, and the environment
    // reference as authored (FR-025, FR-026).
    await expect(main).toContainText('https://docs.example.com/mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);

    const text = await main.innerText();
    // Never the process value a same-named variable carries.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // The sibling agent is a different file and is not on this page.
    expect(text).not.toContain(SIBLING_ONLY_TOKEN);
    // No masking, reveal, spawn, or connect control anywhere on the page.
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /spawn|run|connect|delegate/iu })).toHaveCount(0);
    // The configured path is a value inside the text, never a link.
    await expect(page.getByRole('link', { name: /shared\.toml/u })).toHaveCount(0);
  });

  test('shows the complete authored source under the file tab', async ({ page }) => {
    await page.goto(
      new URL(
        '/agents/detail/repository/.codex/agents/docs-researcher.toml',
        host.origin,
      ).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    await expect(main).toContainText('Readable text');
    // The complete authored source, spellings included: the comment the parse
    // drops, the triple-quoted delimiters, and the table headers.
    await expect(main).toContainText('# The docs specialist.');
    await expect(main).toContainText('[mcp_servers.docs.env]');
    await expect(main).toContainText('developer_instructions = """');
    // Uncoloured, and that is the measured state rather than a defect of this
    // page: the pinned `monaco-editor` ships no TOML grammar, and the near fit
    // would mislabel a `developer_instructions` block's prose
    // (`composables/monaco-languages.ts`). The named grammars this kind's
    // detail does apply — YAML for the metadata, Markdown for the
    // instructions — are what the parse-tab case above covers. What holds
    // either way is that tokenizing is all it is: no language service stands
    // behind the viewer, so nothing marks the file invalid (FR-033).
    await expect(
      page.locator('.monaco-editor .squiggly-error, .monaco-editor .squiggly-warning'),
    ).toHaveCount(0);
  });

  test('publishes no MCP surface for the declared server table', async ({ page }) => {
    await page.goto(host.origin);
    // An MCP declaration's home is an explicit carrier: the agent's own table
    // is its content, so no MCP tab exists and no MCP detail resolves.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);
    await page.goto(
      new URL('/mcp/detail/repository/.codex/agents/docs-researcher.toml', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
  });

  test('returns to the agent tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.codex/agents/reviewer.toml', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.codex/agents/reviewer.toml' })).toBeVisible();
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=agent$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Agent');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.codex/agents/removed.toml', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.monaco-editor')).toHaveCount(0);
  });
});

test.describe('an agent file whose declarations could not be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-agents-detail-failed-'));
    await mkdir(join(fixture, '.codex/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/agents/broken.toml'),
      'name = "unterminated\nmodel = "gpt-5.6-terra"\n',
      'utf8',
    );
    // A link whose target is missing never becomes readable at all, so it
    // gains no recognition and reaches no agent detail.
    await symlink(join(fixture, 'no-such-target.toml'), join(fixture, '.codex/agents/gone.toml'));
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lands on the file tab with the failure stated and the source intact', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.codex/agents/broken.toml', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.codex/agents/broken.toml' })).toBeVisible();
    // Extraction failed all-or-nothing, so the parse panel has nothing to
    // show and the complete source is the honest landing (FR-028).
    await expect(page.getByRole('tab', { name: 'File', selected: true })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('This file could not be parsed');
    await expect(main).toContainText('name = "unterminated');
    // The row it is listed under says the name is not known rather than
    // absent, and nothing is published from the half that would have parsed.
    // The two states the row tells apart, told apart here too: this file's
    // declarations could not be read, so the name is unknown rather than
    // absent (FR-028).
    await expect(main).toContainText(
      'The declarations in this file could not be read, so its agent name is unknown.',
    );
    expect(await main.innerText()).not.toContain('Metadata');
  });

  test('opens no agent detail for a candidate whose bytes were never accepted', async ({
    page,
  }) => {
    await page.goto(
      new URL('/agents/detail/repository/.codex/agents/gone.toml', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await page.goto(host.origin);
    const unclassified = (await openNoKindDisclosure(page)).locator('.aci-item');
    await expect(unclassified.filter({ hasText: 'gone.toml' })).toContainText(
      'This file could not be read.',
    );
  });
});
