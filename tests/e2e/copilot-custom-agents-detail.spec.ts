// T560: browser acceptance for the Copilot custom-agent detail (Phase 54).
// Launches the packaged CLI against a fixture whose root `.github/agents/`
// holds agent profiles, opens one from the agent tab, and verifies the two
// halves the page shows — the frontmatter as YAML metadata and the body as
// Markdown instructions — beside the complete authored source, a credential
// shown exactly as authored with no masking or reveal control, a literal
// environment reference never replaced by the process value a same-named
// variable carries in the host's own environment, the declared `mcp-servers`
// block reaching no MCP surface, the handoff and tool names as inert values,
// the failed-extraction state that still keeps the row's name, the two names
// one shared file is listed under, navigation back to the agent tab, and the
// dead-link state for a path this scan holds no agent at.
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openNoKindDisclosure } from './no-kind-disclosure';

/** A literal credential inside a declared block, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTAGENTDETAIL00000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${COPILOT_E2E_AGENT_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** A token only the sibling profile carries, so a page showing it is wrong. */
const SIBLING_ONLY_TOKEN = 'sibling-profile-only-token';

/** The complete authored text of the profile the detail cases open. */
const DEPLOYER = [
  '---',
  'name: Deployer',
  'description: Runs a deployment',
  'target: github-copilot',
  'tools: read, shell',
  'handoffs:',
  '  - planner',
  'mcp-servers:',
  '  deploy-mcp:',
  '    type: local',
  '    command: npx',
  '    args: ["-y", "@example/deploy-mcp"]',
  '    env:',
  `      API_KEY: ${FIXTURE_SECRET}`,
  `      ENDPOINT: ${ENVIRONMENT_REFERENCE}`,
  'metadata:',
  '  owner: platform',
  '---',
  '',
  '# Deployer',
  '',
  'Deploy the release, then hand the verification to @planner.',
  '',
].join('\n');

test.describe('the complete literal Copilot agent-profile detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-agents-detail-'));
    await mkdir(join(fixture, '.github/agents'), { recursive: true });
    await mkdir(join(fixture, '.claude/agents'), { recursive: true });
    await writeFile(join(fixture, '.github/agents/deployer.md'), DEPLOYER, 'utf8');
    await writeFile(
      join(fixture, '.github/agents/planner.agent.md'),
      [
        '---',
        'name: Release planner',
        `description: ${SIBLING_ONLY_TOKEN}`,
        '---',
        '',
        'x',
        '',
      ].join('\n'),
      'utf8',
    );
    // One physical file, two products, two names: Claude Code's subagent named
    // by its declared `name`, and a Copilot agent profile named by the file.
    await writeFile(
      join(fixture, '.claude/agents/shared.md'),
      [
        '---',
        'name: shared-reviewer',
        'description: One file, two products',
        '---',
        '',
        'Review.',
        '',
      ].join('\n'),
      'utf8',
    );
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['COPILOT_E2E_AGENT_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['COPILOT_E2E_AGENT_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows its metadata and instructions', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'deployer' })
      .getByRole('link', { name: /deployer\.md/u })
      .click();
    await expect(page).toHaveURL(/\/agents\/detail\/repository\/\.github\/agents\/deployer\.md$/u);
    await expect(page.getByRole('heading', { name: '.github/agents/deployer.md' })).toBeVisible();

    const main = page.locator('main');
    // The file's identity restated from its row: the product, its three
    // surfaces, the kind's caption, and the name the row is grouped under —
    // the file's own attribute line.
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('GitHub Copilot');
    await expect(attributes).toContainText('VS Code, CLI, Cloud agent');
    await expect(main).toContainText('Agent name: deployer');

    // The parse tab leads, with the frontmatter as one YAML document in the
    // file's own order and the body as the Markdown it is (FR-007).
    await expect(page.getByRole('tab', { name: 'Agent', selected: true })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Metadata' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Instructions' })).toBeVisible();
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
    await expect(main).toContainText('name: Deployer');
    await expect(main).toContainText('target: github-copilot');
    // The handoff and the declared server are values, not links or controls.
    await expect(main).toContainText('planner');
    await expect(main).toContainText('@example/deploy-mcp');
    await expect(
      page.locator('.aci-agent-detail').getByRole('link', { name: /planner/u }),
    ).toHaveCount(0);
    // The instructions half holds the prose, and the handoff inside it stays
    // text (FR-019).
    await expect(main).toContainText('Deploy the release, then hand the verification to @planner.');

    // Every declared value stays the characters the file wrote (FR-025,
    // FR-026).
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);

    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    expect(text).not.toContain(SIBLING_ONLY_TOKEN);
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /spawn|run|connect|delegate/iu })).toHaveCount(0);
  });

  test('shows the complete authored source under the file tab', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.github/agents/deployer.md', host.origin).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    await expect(main).toContainText('Readable text');
    // The complete authored source, the frontmatter fence included — which the
    // parse tab removed.
    await expect(main).toContainText('---');
    await expect(main).toContainText('mcp-servers:');
    await expect(main).toContainText('# Deployer');
    // Tokenizing is all it is: no language service stands behind the viewer,
    // so nothing marks the file invalid (FR-033).
    await expect(
      page.locator('.monaco-editor .squiggly-error, .monaco-editor .squiggly-warning'),
    ).toHaveCount(0);
  });

  test('states both names a shared file is listed under', async ({ page }) => {
    // One file, two rows: the page restates each of them rather than choosing
    // one, because which fact names an agent is the admitting product's.
    await page.goto(
      new URL('/agents/detail/repository/.claude/agents/shared.md', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.claude/agents/shared.md' })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('Agent names: shared, shared-reviewer');
    await expect(main).toContainText('GitHub Copilot');
    await expect(main).toContainText('Claude Code');
  });

  test('publishes no MCP surface for the declared server block', async ({ page }) => {
    await page.goto(host.origin);
    // An MCP declaration's home is an explicit carrier: the profile's own
    // block is its content, so no MCP tab exists and no MCP detail resolves.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);
    await page.goto(
      new URL('/mcp/detail/repository/.github/agents/deployer.md', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
  });

  test('returns to the agent tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.github/agents/planner.agent.md', host.origin).toString(),
    );
    await expect(
      page.getByRole('heading', { name: '.github/agents/planner.agent.md' }),
    ).toBeVisible();
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=agent$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Agent');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.github/agents/removed.md', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.monaco-editor')).toHaveCount(0);
  });
});

test.describe('an agent profile whose frontmatter could not be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-agents-detail-failed-'));
    await mkdir(join(fixture, '.github/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.github/agents/broken.md'),
      '---\nname: [unterminated\ntarget: vscode\n---\n\n# Broken\n',
      'utf8',
    );
    // A link whose target is missing never becomes readable at all, so it
    // gains no recognition and reaches no agent detail.
    await symlink(join(fixture, 'no-such-target.md'), join(fixture, '.github/agents/gone.md'));
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lands on the file tab with the failure stated and the name intact', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.github/agents/broken.md', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.github/agents/broken.md' })).toBeVisible();
    // Extraction failed all-or-nothing, so the parse panel has nothing to show
    // and the complete source is the honest landing (FR-028).
    await expect(page.getByRole('tab', { name: 'File', selected: true })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('This file could not be parsed');
    await expect(main).toContainText('name: [unterminated');
    // The name survives the failure, because Copilot takes it from the file
    // rather than from the declarations that could not be read.
    await expect(main).toContainText('Agent name: broken');
    expect(await main.innerText()).not.toContain('Metadata');
  });

  test('opens no agent detail for a candidate whose bytes were never accepted', async ({
    page,
  }) => {
    await page.goto(
      new URL('/agents/detail/repository/.github/agents/gone.md', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await page.goto(host.origin);
    const unclassified = (await openNoKindDisclosure(page)).locator('.aci-item');
    await expect(unclassified.filter({ hasText: 'gone.md' })).toContainText(
      'This file could not be read.',
    );
  });
});
