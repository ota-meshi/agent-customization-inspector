// T541: browser acceptance for the Claude subagent detail (Phase 52).
// Launches the packaged CLI against a fixture whose root `.claude/agents/`
// subtree holds Markdown subagents, opens one from the agent tab, and verifies
// the two halves the page shows — the frontmatter as YAML metadata and the
// body as Markdown instructions — beside the complete authored source, a
// credential shown exactly as authored with no masking or reveal control, a
// literal environment reference never replaced by the process value a
// same-named variable carries in the host's own environment, the declared
// `mcpServers` block reaching no MCP surface, the memory scope and preloaded
// skills as inert values, the failed-extraction state, navigation back to the
// agent tab, and the dead-link state for a path this scan holds no agent at.
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openNoKindDisclosure } from './no-kind-disclosure';

/** A literal credential inside a declared block, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDEAGENTDETAIL0000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_AGENT_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** A token only the sibling subagent carries, so a page showing it is wrong. */
const SIBLING_ONLY_TOKEN = 'sibling-subagent-only-token';

/** The complete authored text of the subagent the detail cases open. */
const BROWSER_TESTER = [
  '---',
  'name: browser-tester',
  'description: Tests features in a real browser',
  'tools: Read, Glob, Grep',
  'model: sonnet',
  'memory: project',
  'skills:',
  '  - api-conventions',
  'mcpServers:',
  '  - playwright:',
  '      type: stdio',
  '      command: npx',
  '      args: ["-y", "@playwright/mcp@latest"]',
  '      env:',
  `        API_KEY: ${FIXTURE_SECRET}`,
  `        ENDPOINT: ${ENVIRONMENT_REFERENCE}`,
  '  - github',
  '---',
  '',
  '# Browser tester',
  '',
  'Use the Playwright tools to navigate and screenshot.',
  'Hand findings to @code-reviewer.',
  '',
].join('\n');

test.describe('the complete literal Claude subagent detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-agents-detail-'));
    await mkdir(join(fixture, '.claude/agents/review'), { recursive: true });
    await writeFile(join(fixture, '.claude/agents/browser-tester.md'), BROWSER_TESTER, 'utf8');
    await writeFile(
      join(fixture, '.claude/agents/review/security.md'),
      [
        '---',
        'name: security-reviewer',
        `description: ${SIBLING_ONLY_TOKEN}`,
        '---',
        '',
        'x',
        '',
      ].join('\n'),
      'utf8',
    );
    // Admitted by both the agent rule (its directory) and the instruction rule
    // (its name), so the detail route has to show a parse either variant
    // carries.
    await writeFile(
      join(fixture, '.claude/agents/CLAUDE.md'),
      [
        '---',
        'name: overlapping',
        'description: An agent file whose name is also an instruction file',
        '---',
        '',
        'Both kinds own this file.',
        '',
      ].join('\n'),
      'utf8',
    );
    // The preloaded skill is never loaded on the agent's account: a name a
    // frontmatter field lists gains no read authority.
    await mkdir(join(fixture, '.claude/skills/api-conventions'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/api-conventions/SKILL.md'),
      '---\nname: api-conventions\n---\n\nConventions.\n',
      'utf8',
    );
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['CLAUDE_E2E_AGENT_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CLAUDE_E2E_AGENT_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows its metadata and instructions', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'browser-tester' })
      .getByRole('link', { name: /browser-tester\.md/u })
      .click();
    await expect(page).toHaveURL(
      /\/agents\/detail\/repository\/\.claude\/agents\/browser-tester\.md\?name=browser-tester$/u,
    );
    await expect(
      page.getByRole('heading', { name: '.claude/agents/browser-tester.md' }),
    ).toBeVisible();

    const main = page.locator('main');
    // Both Markdown products define an agent from this direct child, and both
    // resolve the same name here — Claude Code from the declared `name`,
    // Copilot from the file's own — so the row is one and the line is
    // singular.
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('GitHub Copilot');
    await expect(attributes).toContainText('VS Code, CLI');
    await expect(attributes).toContainText('Claude Code');
    await expect(attributes).toContainText('CLI and IDE clients');
    await expect(main).toContainText('Agent name: browser-tester');

    // The parse tab leads, with the frontmatter as one YAML document in the
    // file's own order and the body as the Markdown it is (FR-007).
    await expect(page.getByRole('tab', { name: 'Agent', selected: true })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Metadata' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Instructions' })).toBeVisible();
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
    await expect(main).toContainText('name: browser-tester');
    await expect(main).toContainText('memory: project');
    // The preloaded skill and the declared server are values, not links.
    await expect(main).toContainText('api-conventions');
    await expect(main).toContainText('@playwright/mcp@latest');
    await expect(page.getByRole('link', { name: /api-conventions/u })).toHaveCount(0);
    // The instructions half holds the prose, and the agent reference inside it
    // stays text (FR-019).
    await expect(main).toContainText('Use the Playwright tools to navigate and screenshot.');
    await expect(main).toContainText('@code-reviewer');

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
      new URL('/agents/detail/repository/.claude/agents/browser-tester.md', host.origin).toString(),
    );
    await page.getByRole('tab', { name: 'File' }).click();
    const main = page.locator('main');
    await expect(main).toContainText('Readable text');
    // The complete authored source, the frontmatter fence included — which the
    // parse tab removed.
    await expect(main).toContainText('---');
    await expect(main).toContainText('mcpServers:');
    await expect(main).toContainText('# Browser tester');
    // No token-class assertion here, unlike the Codex agent detail: that one
    // names TOML for a file whose `.toml` suffix the viewer would resolve
    // anyway, so proving the named grammar took effect is the point. A Claude
    // subagent is `.md` and the language is the path's own resolution, which
    // the instruction and skill detail suites already exercise. What this case
    // owns is that tokenizing is all it is: the grammar has no language
    // service behind it, so nothing marks the file invalid (FR-033).
    await expect(
      page.locator('.monaco-editor .squiggly-error, .monaco-editor .squiggly-warning'),
    ).toHaveCount(0);
  });

  test('shows the parse of a file that is also an instruction file', async ({ page }) => {
    // `.claude/agents/CLAUDE.md` is admitted by both rules, and
    // `get-file-detail` answers with the instructions variant. The agent route
    // maps that variant's two halves onto its own rather than showing an empty
    // parse panel (pages/agents/[source]/[...path].vue § presentation). It is also two
    // agent rows, because the two products name it differently: `CLAUDE` from
    // the file, `overlapping` from the declaration.
    await page.goto(
      new URL('/agents/detail/repository/.claude/agents/CLAUDE.md', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.claude/agents/CLAUDE.md' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Agent', selected: true })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('Agent names: CLAUDE, overlapping');
    await expect(main.getByRole('heading', { name: 'Metadata' })).toBeVisible();
    await expect(main).toContainText('name: overlapping');
    await expect(main).toContainText('Both kinds own this file.');
    // And the same file opens as an instruction file on its own route.
    await page.goto(
      new URL('/instructions/detail/repository/.claude/agents/CLAUDE.md', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText('name: overlapping');
  });

  test('publishes no MCP surface for the declared server block', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);
    await page.goto(
      new URL('/mcp/detail/repository/.claude/agents/browser-tester.md', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
  });

  test('returns to the agent tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL(
        '/agents/detail/repository/.claude/agents/review/security.md',
        host.origin,
      ).toString(),
    );
    await expect(
      page.getByRole('heading', { name: '.claude/agents/review/security.md' }),
    ).toBeVisible();
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=agent$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Agent');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.claude/agents/removed.md', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.monaco-editor')).toHaveCount(0);
  });
});

test.describe('a subagent whose frontmatter could not be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-agents-detail-failed-'));
    await mkdir(join(fixture, '.claude/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/agents/broken.md'),
      '---\nname: [unterminated\nmodel: sonnet\n---\n\n# Broken\n',
      'utf8',
    );
    // A link whose target is missing never becomes readable at all, so it
    // gains no recognition and reaches no agent detail.
    await symlink(join(fixture, 'no-such-target.md'), join(fixture, '.claude/agents/gone.md'));
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lands on the file tab with the failure stated and the source intact', async ({ page }) => {
    await page.goto(
      new URL('/agents/detail/repository/.claude/agents/broken.md', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.claude/agents/broken.md' })).toBeVisible();
    // Extraction failed all-or-nothing, so the parse panel has nothing to show
    // and the complete source is the honest landing (FR-028).
    await expect(page.getByRole('tab', { name: 'File', selected: true })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('This file could not be parsed');
    await expect(main).toContainText('name: [unterminated');
    // Claude Code's recognition publishes no name — its identity is the
    // declaration the parse never reached — while Copilot's is the file's own
    // name, which a failed parse cannot take away (FR-028). The page states
    // the one name the file is listed under.
    await expect(main).toContainText('Agent name: broken');
    expect(await main.innerText()).not.toContain('Metadata');
  });

  test('opens no agent detail for a candidate whose bytes were never accepted', async ({
    page,
  }) => {
    await page.goto(
      new URL('/agents/detail/repository/.claude/agents/gone.md', host.origin).toString(),
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
