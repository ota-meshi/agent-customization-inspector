// T574: browser acceptance for the custom-agent comparison (Phase 56).
// Launches the packaged CLI against a fixture whose Codex, Claude Code, and
// Copilot agent files resolve shared agent names, enters the comparison from
// an inventory row and from a detail page, and verifies what can only be
// claimed against a rendered page: the two halves each file's own rule splits
// out — the declared metadata and the instructions — diffed literally,
// credential and environment-reference differences included, with no masking,
// reveal, or environment substitution; the exact recognition rows with the
// name each tool identifies each side by; a declared
// `mcp_servers`/`mcp-servers` block among the declarations' ordinary entries
// and no MCP surface anywhere; the row-owned pair (a comparison never leaves
// the agent-name row that owns both files); and the reported (never compared)
// dead pairs.
//
// No diff of the two files' bytes is among them, and its absence is asserted:
// this kind's locations are written in two formats, so that diff would align
// quoting and delimiters rather than what the files say.
//
// One kind is one comparison surface, so the pairs here span the kind's
// formats: a Codex TOML agent beside a Claude Code subagent that declares its
// name, and two Copilot profiles whose file names reduce to one.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** Two literal credentials, one per side, so each side's display is proven. */
const CODEX_SECRET = 'ghp_E2ECOMPARECODEXAGENT00000000000000000';
const CLAUDE_SECRET = 'ghp_E2ECOMPARECLAUDEAGENT0000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${ACI_E2E_AGENT_COMPARE_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-agents-comparison-'));
  await mkdir(join(fixture, '.codex/agents'), { recursive: true });
  await mkdir(join(fixture, '.claude/agents'), { recursive: true });
  await mkdir(join(fixture, '.github/agents'), { recursive: true });
  // The cross-format pair: a Codex TOML agent and a Claude subagent that
  // declare one name. Their declarations overlap on `description` with
  // different values, each declares one key the other does not, and each
  // spells MCP configuration in its own product's key.
  await writeFile(
    join(fixture, '.codex/agents/reviewer.toml'),
    [
      'name = "reviewer"',
      'description = "Reviews code like an owner."',
      'sandbox_mode = "read-only"',
      'developer_instructions = "Review the change."',
      '',
      '[mcp_servers.docs]',
      `api_key = "${CODEX_SECRET}"`,
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, '.claude/agents/reviewer.md'),
    [
      '---',
      'name: reviewer',
      'description: Reviews code from the editor',
      'model: sonnet',
      'mcpServers:',
      '  - docs:',
      '      command: npx',
      '      env:',
      `        API_KEY: ${CLAUDE_SECRET}`,
      `        ENDPOINT: ${ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      'Review the change from the editor.',
      '',
    ].join('\n'),
    'utf8',
  );
  // The one-product pair: two Copilot profiles whose file names reduce to one
  // agent name, so they reach one row and no Codex or Claude recognition.
  await writeFile(
    join(fixture, '.github/agents/planner.agent.md'),
    ['---', 'description: The Cloud spelling', '---', '', 'Plan.', ''].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, '.github/agents/planner.md'),
    ['---', 'description: The plain spelling', '---', '', 'Plan again.', ''].join('\n'),
    'utf8',
  );
  // A name only one file resolves, so its row offers no comparison at all.
  await writeFile(
    join(fixture, '.codex/agents/solo.toml'),
    ['name = "solo"', 'description = "Alone."', ''].join('\n'),
    'utf8',
  );
  // The sentinel the product must never substitute for the authored
  // reference: the spawned CLI inherits this process environment.
  process.env['ACI_E2E_AGENT_COMPARE_ENDPOINT'] = ENVIRONMENT_SENTINEL;
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  delete process.env['ACI_E2E_AGENT_COMPARE_ENDPOINT'];
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/**
 * The comparison URL for a hand-written pair, encoded per query value. The row
 * name is a coordinate of its own, because one file can sit on two rows.
 */
function compareUrl(name: string, left: string, right: string): string {
  return new URL(
    `/agents/compare/repository?name=${encodeURIComponent(name)}&leftSource=repository&left=${encodeURIComponent(
      left,
    )}&rightSource=repository&right=${encodeURIComponent(right)}`,
    host.origin,
  ).toString();
}

test('opens from a row and shows the complete literal diff', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /Agent/u }).click();
  // The name's own row offers the comparison of its files; selecting it lands
  // on the compare route with the row's first two readable files.
  await page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: 'reviewer' })
    .getByRole('link', { name: /Compare this name's files: reviewer/u })
    .click();
  await page.waitForURL(/\/agents\/compare\/repository\?/u);
  await expect(page.getByRole('heading', { name: 'Compare custom-agent files' })).toBeVisible();

  // Two diffs — the declarations and the instructions — and no diff of the
  // files' bytes beside them, because two formats have none to assert. Each
  // file whole is on the page all the same, as its own viewer (FR-027).
  await expect(page.locator('.aci-custom-agent-source-diff')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Source comparison' })).toHaveCount(0);
  const sources = page.locator('.aci-custom-agent-compare__sources');
  await expect(sources.locator('section')).toHaveCount(2);
  // The authored spellings each format wraps its halves in are here and
  // nowhere else: the TOML prose key and the Markdown fence.
  await expect(sources).toContainText('developer_instructions');
  await expect(sources).toContainText('---');
  // Every declared value stays the characters the file wrote — the
  // credentials and the environment reference exactly as authored, unmasked
  // and unresolved (FR-027, FR-025).
  const declarations = page.locator('.aci-custom-agent-source-diff').first();
  await expect(declarations).toContainText(CODEX_SECRET);
  await expect(declarations).toContainText(CLAUDE_SECRET);
  await expect(declarations).toContainText(ENVIRONMENT_REFERENCE);
  const text = await page.locator('main').innerText();
  // Never the process value a same-named variable carries.
  expect(text).not.toContain(ENVIRONMENT_SENTINEL);
  expect(text).not.toContain('••••');
  expect(text).not.toContain('ghp_****');
  expect(text).not.toContain('Reveal');
  // Descriptive only: no verdict, no winner, no fix (FR-012). Which of two
  // same-name agents a spawn would select, and what a spawned session would
  // inherit, are never stated (FR-009).
  expect(text).not.toContain('wins');
  expect(text).not.toContain('takes precedence');
  expect(text).not.toContain('recommended');
  expect(text.toLowerCase()).not.toContain('inherit');
  // Nothing runs, spawns, connects, merges, or edits either side.
  await expect(
    page.getByRole('button', { name: /run|spawn|connect|merge|fix|apply/iu }),
  ).toHaveCount(0);
});

test('renders the per-tool agent names and the serialized declarations', async ({ page }) => {
  await page.goto(
    compareUrl('reviewer', '.codex/agents/reviewer.toml', '.claude/agents/reviewer.md'),
  );
  await expect(page.getByRole('heading', { name: 'Compare custom-agent files' })).toBeVisible();

  // Each side's identity: path, Source family, recognized kind, read outcome
  // (US3 scenario 1).
  const files = page.locator('.aci-custom-agent-compare__files');
  await expect(files).toContainText('.codex/agents/reviewer.toml');
  await expect(files).toContainText('.claude/agents/reviewer.md');
  await expect(files.locator('.aci-custom-agent-compare__file-facts').first()).toContainText(
    'Repository · Agent',
  );

  // The two facts have two homes (research.md § 7): one recognition row per
  // recognizing tool, in the contracted tool order, each recognition
  // distinguishable from the physical file (US3 scenario 2) — and the files'
  // declared metadata compared once, under no tool caption.
  const metadata = page.locator('.aci-custom-agent-recognition-comparison');
  // The two halves stand in the order the detail shows them, so a reader who
  // read either file meets them the same way here; then each file whole —
  // two viewers rather than a diff, because the formats have no alignment to
  // assert (FR-027) — and last the recognitions, which are context rather
  // than the subject.
  await expect(metadata.locator('h3')).toHaveText([
    'Declared metadata',
    'Instructions',
    'Source',
    'Tool recognition',
  ]);
  const toolTable = metadata.locator('table').first();
  await expect(toolTable.locator('tbody th')).toHaveText([
    'GitHub Copilot · Agent',
    'Claude Code · Agent',
    'OpenAI Codex · Agent',
  ]);
  // Copilot and Claude Code both read the `.claude/agents/*.md` direct child,
  // each under its own product's name for it; Codex reads only the TOML file.
  const copilotRow = toolTable.locator('tr', { hasText: 'GitHub Copilot' });
  await expect(copilotRow.locator('td').first()).toHaveText('Not recognized');
  // Two surfaces, not three: the Cloud agent documents `.github/agents/`
  // alone, so a `.claude/agents/*.md` rests on the editor and CLI behaviors
  // and derives no hosted surface (`copilot.repo.agent.claude`).
  await expect(copilotRow.locator('td').nth(1)).toHaveText(
    'Named reviewer — surfaces: VS Code, CLI',
  );
  const claudeRow = toolTable.locator('tr', { hasText: 'Claude Code' });
  await expect(claudeRow.locator('td').first()).toHaveText('Not recognized');
  await expect(claudeRow.locator('td').nth(1)).toHaveText(
    'Named reviewer — surfaces: CLI and IDE clients',
  );
  const codexRow = toolTable.locator('tr', { hasText: 'OpenAI Codex' });
  await expect(codexRow.locator('td').first()).toHaveText(
    'Named reviewer — surfaces: Local clients',
  );
  await expect(codexRow.locator('td').nth(1)).toHaveText('Not recognized');

  // The declared metadata is one canonical YAML document per side — the
  // documented agent keys leading, every other key sorted — diffed in Monaco
  // under no tool caption (frontmatter-yaml.ts, declaration-order.ts):
  // YAML on both sides whichever format the file was written in, the shared
  // key shows both values, and a side-only key stands on its side alone
  // (FR-011).
  const metadataDiff = metadata.locator('.aci-custom-agent-source-diff').first();
  await expect(metadata.locator('.aci-custom-agent-source-diff')).toHaveCount(2);
  await expect(metadataDiff).toContainText('description: Reviews code like an owner.');
  await expect(metadataDiff).toContainText('description: Reviews code from the editor');
  await expect(metadataDiff).toContainText('sandbox_mode: read-only');
  await expect(metadataDiff).toContainText('model: sonnet');
  // Each product's MCP spelling survives as the key its file wrote, an
  // ordinary declared entry of the diffed document (FR-007).
  await expect(metadataDiff).toContainText('mcp_servers:');
  await expect(metadataDiff).toContainText('mcpServers:');
  // The Codex prose key is not in the metadata half: the split put it in the
  // instructions half below, which diffs the two files' prose without the
  // quoting and fences their formats wrap it in.
  expect(await metadataDiff.innerText()).not.toContain('developer_instructions');
  const instructionsDiff = metadata.locator('.aci-custom-agent-source-diff').nth(1);
  await expect(instructionsDiff).toContainText('Review the change.');
  await expect(instructionsDiff).toContainText('Review the change from the editor.');
  // Neither side's delimiters reach it: those stay on each file's own detail.
  expect(await instructionsDiff.innerText()).not.toContain('developer_instructions');
  expect(await instructionsDiff.innerText()).not.toContain('---');
});

test('owns no MCP surface for either compared agent', async ({ page }) => {
  await page.goto(host.origin);
  // An MCP declaration's home is an explicit carrier, so the two agents'
  // declared blocks create no MCP tab at all (data-model.md § Inventory unit).
  await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);
  await page.goto(
    compareUrl('reviewer', '.codex/agents/reviewer.toml', '.claude/agents/reviewer.md'),
  );
  await expect(page.getByRole('heading', { name: 'Compare custom-agent files' })).toBeVisible();
  // And neither agent's detail resolves as an MCP carrier: the declared block
  // is the file's own content on the surface of its own kind.
  await page.goto(
    new URL('/mcp/detail/repository/.codex/agents/reviewer.toml', host.origin).toString(),
  );
  await expect(page.locator('main')).toContainText(
    "Nothing in the current scan sits at this link's path.",
  );
});

test('compares two agent files one product names identically', async ({ page }) => {
  // The `.agent.md` Cloud spelling and the plain one reduce to a single agent
  // name, so these two files resolve one Copilot name — a pair of profiles,
  // with no Codex or Claude row at all.
  await page.goto(
    compareUrl('planner', '.github/agents/planner.agent.md', '.github/agents/planner.md'),
  );
  const toolTable = page.locator('.aci-custom-agent-recognition-comparison table').first();
  await expect(toolTable.locator('tbody th')).toHaveText(['GitHub Copilot · Agent']);
  await expect(toolTable.locator('td').first()).toHaveText(
    'Named planner — surfaces: VS Code, CLI, Cloud agent',
  );
  await expect(toolTable.locator('td').nth(1)).toHaveText(
    'Named planner — surfaces: VS Code, CLI, Cloud agent',
  );
  // Both files parsed, so the serialized documents are two parses rather than
  // a stated failure.
  const metadata = page.locator('.aci-custom-agent-recognition-comparison');
  await expect(metadata).not.toContainText('could not be parsed');
  // A two-file row offers no pick: both files already stand on the two sides,
  // so a selector would be a dead control.
  await expect(page.getByLabel('First custom-agent file')).toHaveCount(0);
});

test('reports a pair the model does not express instead of comparing it', async ({ page }) => {
  // The same file twice.
  await page.goto(
    compareUrl('reviewer', '.codex/agents/reviewer.toml', '.codex/agents/reviewer.toml'),
  );
  await expect(page.locator('main')).toContainText(
    'A comparison needs two distinct custom-agent files',
  );
  // A name whose row does not hold both files: both are real files of this
  // kind, but `reviewer` is not a row `solo.toml` sits on.
  await page.goto(compareUrl('reviewer', '.codex/agents/reviewer.toml', '.codex/agents/solo.toml'));
  await expect(page.locator('main')).toContainText(
    'No agent name in the current scan holds both of this link’s files.',
  );
  // A path the current scan holds no file of this kind at.
  await page.goto(
    compareUrl('reviewer', '.codex/agents/reviewer.toml', '.claude/agents/nothing.md'),
  );
  await expect(page.locator('main')).toContainText(
    'No agent name in the current scan holds both of this link’s files.',
  );
  // No pair at all.
  await page.goto(new URL('/agents/compare/repository', host.origin).toString());
  await expect(page.locator('main')).toContainText(
    'This link names no pair of custom-agent files.',
  );
});

test('offers no comparison for a name only one file resolves', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /Agent/u }).click();
  const single = page.getByRole('tabpanel').locator('.aci-item').filter({ hasText: 'solo' });
  await expect(single).toHaveCount(1);
  await expect(single.getByRole('link', { name: /Compare/u })).toHaveCount(0);
});

test('enters from the detail page and returns to the kind’s own tab', async ({ page }) => {
  await page.goto(
    new URL('/agents/detail/repository/.claude/agents/reviewer.md', host.origin).toString(),
  );
  await page.getByRole('link', { name: 'Compare this file' }).click();
  await page.waitForURL(/\/agents\/compare\/repository\?/u);
  await expect(page.getByRole('heading', { name: 'Compare custom-agent files' })).toBeVisible();
  // Back to the inventory's own tab, not the kind order's default.
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page).toHaveURL(/\?kind=agent$/u);
  await expect(page.getByRole('tab', { selected: true })).toContainText('Agent');
});
