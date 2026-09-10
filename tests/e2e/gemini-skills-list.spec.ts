// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// skill list. Launches the packaged CLI against a tree holding skills under
// `.gemini/skills/` and under the `.agents/skills/` alias, opens the printed
// loopback URL, and verifies the rendered rows: one per resolved name, the
// alias file carrying three products' marks, the directory-named fallback,
// and the near misses' absence (spec.md FR-002, FR-007, FR-013).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EGEMINISKILLS000000000000000000000000';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-skills-'));
  await mkdir(join(fixture, '.gemini/skills/changelog/scripts'), { recursive: true });
  await writeFile(
    join(fixture, '.gemini/skills/changelog/SKILL.md'),
    `---\nname: changelog\ndescription: Draft a changelog entry.\n---\n\ntoken: ${FIXTURE_SECRET}\n`,
    'utf8',
  );
  await writeFile(
    join(fixture, '.gemini/skills/changelog/scripts/collect.sh'),
    'git log\n',
    'utf8',
  );
  // Authored with a name that does not match its directory, which is what
  // makes the rendered name meaningful: it cannot have come from the path.
  await mkdir(join(fixture, '.gemini/skills/api-design'), { recursive: true });
  await writeFile(
    join(fixture, '.gemini/skills/api-design/SKILL.md'),
    '---\nname: design-api\n---\n\n# Design\n',
    'utf8',
  );
  // The alias location: Codex's and Copilot's too, so one file carries three
  // products (FR-013).
  await mkdir(join(fixture, '.agents/skills/release-notes'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/release-notes/SKILL.md'),
    '---\nname: release-notes\n---\n\n# Release notes\n',
    'utf8',
  );
  // Near misses: a nested skills directory, the missing name segment, and an
  // unrelated file.
  await mkdir(join(fixture, 'packages/api/.gemini/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, 'packages/api/.gemini/skills/deploy/SKILL.md'),
    '# Nested\n',
    'utf8',
  );
  await writeFile(join(fixture, '.gemini/skills/SKILL.md'), 'no name segment\n', 'utf8');
  await writeFile(join(fixture, 'NOTES.md'), '# notes\n', 'utf8');

  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('lists exactly the allowlisted skills by their authored names, with their products', async ({
  page,
}) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items).toHaveCount(3);
  // Rows are ordered by their own unit — the resolved name — and `design-api`
  // lives in `api-design/`, so a row showing it proves the name came from the
  // frontmatter rather than the directory (FR-007).
  await expect(page.locator('.aci-row-head__name')).toHaveText([
    'changelog',
    'design-api',
    'release-notes',
  ]);
  await expect(page.locator('.aci-item .aci-path')).toHaveText([
    '.gemini/skills/changelog/SKILL.md',
    '.gemini/skills/api-design/SKILL.md',
    '.agents/skills/release-notes/SKILL.md',
  ]);
  // A `.gemini/skills/` file is Gemini CLI's alone; the alias file is one
  // line stating three products (FR-013).
  const changelog = items.filter({ hasText: '.gemini/skills/changelog/SKILL.md' });
  await expect(changelog).toContainText('Gemini CLI');
  await expect(changelog).not.toContainText('OpenAI Codex');
  await expect(changelog).toContainText('1 supporting file');
  const shared = items.filter({ hasText: '.agents/skills/release-notes/SKILL.md' });
  await expect(shared.locator('.aci-recognition-marks__one')).toHaveCount(3);
  for (const product of ['GitHub Copilot', 'OpenAI Codex', 'Gemini CLI']) {
    await expect(shared).toContainText(product);
  }
  await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');
});

test('shows no near-miss path and no authored source text', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(3);
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('packages/api/.gemini/skills/deploy/SKILL.md');
  expect(text).not.toContain('.gemini/skills/SKILL.md');
  expect(text).not.toContain('NOTES.md');
  expect(text).not.toContain('collect.sh');
  // The inventory carries no `sourceText`, so a credential in an authored
  // skill cannot appear in a list the user never opted into reading (FR-027).
  expect(text).not.toContain(FIXTURE_SECRET);
  for (const authored of ['token:', '# Design', '# Release notes', 'git log']) {
    expect(text, `rendered page contains authored source: ${authored}`).not.toContain(authored);
  }
});

test('narrows the rows by product without changing what the others recognized', async ({
  page,
}) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items).toHaveCount(3);
  // Gemini CLI reads every admitted skill in this tree.
  await page.getByLabel('Tool').selectOption('gemini');
  await expect(items).toHaveCount(3);
  // Codex reads the alias alone, and its row narrows to its own definition.
  await page.getByLabel('Tool').selectOption('codex');
  await expect(items).toHaveCount(1);
  await expect(items.locator('.aci-row-head__name')).toHaveText(['release-notes']);
  await expect(items.locator('.aci-recognition-marks__one')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(items).toHaveCount(3);
});
