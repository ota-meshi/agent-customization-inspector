// specs/003-antigravity-cli-support T034: browser acceptance for the
// Antigravity CLI custom agent. Both admitted shapes — a Markdown file
// directly below `.agents/agents/` and an `agent.md` inside its own directory
// there — reach the inventory and their own detail, with the metadata block
// and the body shown as written and nothing spawned, resolved, or masked
// (FR-007, FR-020, FR-025, FR-026).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EANTIGRAVITYAGENT000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${ANTIGRAVITY_E2E_AGENT_ENDPOINT}';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-antigravity-agents-detail-'));
  await mkdir(join(fixture, '.agents/agents/release'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/agents/reviewer.md'),
    [
      '---',
      'name: reviewer',
      'description: Reviews a diff before it is committed.',
      'subagent: true',
      `api_key: ${FIXTURE_SECRET}`,
      `endpoint: "${ENVIRONMENT_REFERENCE}"`,
      '---',
      '',
      'Review the change and report each defect with its file and line.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, '.agents/agents/release/agent.md'),
    [
      '---',
      'name: release-captain',
      'description: Runs the release checklist.',
      '---',
      '',
      'Work the checklist in order and stop at the first step that fails.',
      '',
    ].join('\n'),
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('lists both admitted shapes, each as this vendor’s own row', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Agent/u }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('reviewer');
  await expect(panel).toContainText('release-captain');
  await expect(panel).toContainText('.agents/agents/reviewer.md');
  await expect(panel).toContainText('.agents/agents/release/agent.md');
  await expect(panel).toContainText('Antigravity CLI');
});

test('shows the agent’s metadata and body as written, running nothing', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Agent/u }).click();
  await page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: 'reviewer' })
    .getByRole('link', { name: /reviewer\.md/u })
    .click();
  await expect(page).toHaveURL(/\/agents\/detail\/repository\//u);
  const main = page.locator('main');
  await expect(page.locator('.aci-detail-attributes')).toContainText('Antigravity CLI');
  await expect(main).toContainText('Agent name: reviewer');
  // The frontmatter block and the body below it, in the file's own order.
  await expect(main).toContainText('subagent: true');
  await expect(main).toContainText('Review the change');
  // Every declared value stays the characters the file wrote, and nothing on
  // the page offers to act on them.
  await expect(main).toContainText(FIXTURE_SECRET);
  await expect(main).toContainText(ENVIRONMENT_REFERENCE);
  await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /spawn|run|connect|delegate/iu })).toHaveCount(0);
});
