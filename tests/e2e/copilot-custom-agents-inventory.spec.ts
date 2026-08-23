// T549: browser acceptance for the Copilot custom-agent inventory (Phase 53).
// Launches the packaged CLI against a fixture whose root holds agent profiles
// in both directories Copilot documents, opens the printed loopback URL, and
// verifies the rendered rows — one row per agent name, which Copilot takes
// from the configuration file's own name rather than from the declared
// `name` — beside the surfaces each row states, the filters, the excluded
// subfolder and User locations, the shared `.claude/agents/` file two products
// name differently, and the diagnostics.
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
const FIXTURE_SECRET = 'ghp_E2ECOPILOTAGENTS000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${COPILOT_E2E_AGENTS_ENDPOINT}';

test.describe('agent profiles in the two documented directories', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-agents-'));
    await mkdir(join(fixture, '.github/agents/team'), { recursive: true });
    await mkdir(join(fixture, '.claude/agents'), { recursive: true });
    // The declared `name` is a display name this product does not identify the
    // agent by, so this file heads the `planner` row rather than a
    // `Release planner` one.
    await writeFile(
      join(fixture, '.github/agents/planner.md'),
      [
        '---',
        'name: Release planner',
        'description: Plans a release',
        'target: github-copilot',
        'tools: read, search',
        '---',
        '',
        'Draft the plan, then hand the review to @reviewer.',
        '',
      ].join('\n'),
      'utf8',
    );
    // The `.agent.md` Cloud spelling and the plain one reduce to a single
    // name, so they are two definitions of one row with no winner stated.
    await writeFile(
      join(fixture, '.github/agents/reviewer.agent.md'),
      ['---', 'description: The Cloud spelling', '---', '', 'Review like an owner.', ''].join('\n'),
      'utf8',
    );
    await writeFile(
      join(fixture, '.github/agents/reviewer.md'),
      ['---', 'description: The plain spelling', '---', '', 'x', ''].join('\n'),
      'utf8',
    );
    // The credential, the environment reference, and an `mcp-servers` block
    // are authored content this file happens to hold. None may reach a row,
    // and the declared server joins no MCP inventory (FR-026, FR-027).
    await writeFile(
      join(fixture, '.github/agents/deployer.md'),
      [
        '---',
        'name: Deployer',
        'description: Runs a deployment',
        'mcp-servers:',
        '  deploy-mcp:',
        '    command: npx',
        '    env:',
        `      API_KEY: ${FIXTURE_SECRET}`,
        `      ENDPOINT: ${ENVIRONMENT_REFERENCE}`,
        '---',
        '',
        'Deploy the release.',
        '',
      ].join('\n'),
      'utf8',
    );
    // Declares no `name` at all, and still heads a row: Copilot names an agent
    // from its file, so there is nothing for the null-named row to hold.
    await writeFile(
      join(fixture, '.github/agents/README.md'),
      ['---', 'description: Notes beside the profiles', '---', '', 'x', ''].join('\n'),
      'utf8',
    );
    // Malformed frontmatter: the recognition fails all-or-nothing (FR-028)
    // while the row keeps the name its path gives it.
    await writeFile(
      join(fixture, '.github/agents/broken.md'),
      '---\nname: [unterminated\n---\n\n# Broken\n',
      'utf8',
    );
    // One physical file, two products: Claude Code's subagent named by its
    // declared `name`, and a Copilot agent profile named by the file.
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
    // Near miss: a subfolder inside an agents directory, which no Copilot page
    // documents.
    await writeFile(
      join(fixture, '.github/agents/team/nested.md'),
      ['---', 'name: nested', '---', '', 'x', ''].join('\n'),
      'utf8',
    );
    // Near miss: the CLI's User scope is `~/.copilot/agents/`, a different
    // Source boundary. Its spelling inside a repository is admitted by nothing.
    await mkdir(join(fixture, '.copilot/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.copilot/agents/personal.md'),
      '---\nname: personal\n---\n',
      'utf8',
    );
    // Near miss: a subdirectory `.github` layer belongs to a runtime working
    // directory this product never selects.
    await mkdir(join(fixture, 'packages/api/.github/agents'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.github/agents/planner.md'),
      '---\nname: nested-layer\n---\n',
      'utf8',
    );
    // Near miss: the extra directory a `--add-dir` run would contribute.
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

  test('names each row after the file rather than after the declared name', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();

    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Every row in name order. `README` and `broken` are rows like any other,
    // and no null-named row closes the list: a Copilot agent's name comes from
    // its path, which a missing declaration and a failed parse alike leave
    // intact. `shared` and `shared-reviewer` are the two names one file has.
    await expect(items.locator('.aci-agent-row__name')).toHaveText([
      'README',
      'broken',
      'deployer',
      'planner',
      'reviewer',
      'shared',
      'shared-reviewer',
    ]);
    // The declared display name is not a row and not a row heading.
    expect(await page.locator('main').innerText()).not.toContain('Release planner');
    // The two spellings of one name are two definitions of one row, in path
    // order, with no winner stated anywhere on the page.
    const duplicate = items.filter({ hasText: 'reviewer' }).first();
    await expect(duplicate.locator('.aci-agent-row__definitions .aci-path')).toHaveText([
      '.github/agents/reviewer.agent.md',
      '.github/agents/reviewer.md',
    ]);
    const duplicateText = await duplicate.innerText();
    for (const projected of ['wins', 'winner', 'precedence', 'active', 'selected']) {
      expect(duplicateText.toLowerCase()).not.toContain(projected);
    }
  });

  test('states all three Copilot surfaces on one admission', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const planner = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'planner' })
      .first();
    // The `.github/agents/` rule rests on all three surface behaviors, so the
    // row names each of them beside the product — never a claim that any of
    // them loaded the agent (FR-009).
    await expect(planner.locator('.aci-agent-row__definitions')).toContainText('GitHub Copilot');
    await expect(planner.locator('.aci-agent-row__surfaces')).toHaveText([
      'VS Code, CLI, Cloud agent',
    ]);
  });

  test('names no hosted surface for the directory the Cloud agent does not read', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    // `.claude/agents/` is documented by the editor and the CLI and not by the
    // Cloud agent, so its own rule rests on those two alone and the row states
    // two surfaces rather than three (`copilot.repo.agent.claude`).
    const shared = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'shared' })
      .first();
    await expect(shared.locator('.aci-agent-row__surfaces')).toHaveText(['VS Code, CLI']);
  });

  test('gives one shared file a row under each product’s own name', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    const copilotRow = items.filter({ hasText: 'shared' }).first();
    await expect(copilotRow.locator('.aci-agent-row__definitions')).toContainText('GitHub Copilot');
    await expect(copilotRow.locator('.aci-agent-row__definitions .aci-path')).toHaveText([
      '.claude/agents/shared.md',
    ]);
    const claudeRow = items.filter({ hasText: 'shared-reviewer' });
    await expect(claudeRow.locator('.aci-agent-row__definitions')).toContainText('Claude Code');
    await expect(claudeRow.locator('.aci-agent-row__definitions .aci-path')).toHaveText([
      '.claude/agents/shared.md',
    ]);
  });

  test('publishes no MCP row for a profile and leaks no declared value', async ({ page }) => {
    await page.goto(host.origin);
    // An MCP declaration's home is an explicit carrier: this tree holds none.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);

    await page.getByRole('tab', { name: /Agent/u }).click();
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('Deploy the release.');
    expect(text).not.toContain('read, search');
    // The excluded locations appear nowhere: the subfolder, the User spelling,
    // the subdirectory layer, and the `--add-dir` directory.
    expect(text).not.toContain('.github/agents/team/nested.md');
    expect(text).not.toContain('.copilot/agents/personal.md');
    expect(text).not.toContain('packages/api/.github/agents/planner.md');
    expect(text).not.toContain('extra/.github/agents/helper.md');
    await expect(page.getByRole('button', { name: /spawn|run|select|delegate/iu })).toHaveCount(0);
  });

  test('narrows the agent rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Agent/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(7);

    // Tool: selecting Copilot drops the row only Claude Code names, and
    // selecting Claude leaves exactly it.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(6);
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-agent-row__name')).toHaveText(['shared-reviewer']);

    // Path: the filter applies to each definition's own file path, and a row
    // with no matching definition is dropped rather than emptied.
    await page.getByLabel('Tool').selectOption('');
    await page.getByLabel('Path contains').fill('.claude/');
    await expect(items.locator('.aci-agent-row__name')).toHaveText(['shared', 'shared-reviewer']);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(7);
  });

  test('states the malformed file’s diagnostic beside the row that holds it', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.locator('.aci-scan-progress')).toContainText(
      '1 file(s) kept a diagnostic of their own',
    );
    await page.getByRole('tab', { name: /Agent/u }).click();
    const broken = page.getByRole('tabpanel').locator('.aci-item').filter({ hasText: 'broken' });
    await expect(broken).toContainText('.github/agents/broken.md');
    await expect(broken).toContainText('This file could not be parsed');
  });
});
