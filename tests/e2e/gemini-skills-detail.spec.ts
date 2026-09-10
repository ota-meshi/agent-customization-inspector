// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// skill detail. Opens a `.gemini/skills/<name>/SKILL.md` from its row and
// verifies the skill's own page: the declarations led by the name and
// description, the instructions, the skill's own directory in the files tab,
// a credential shown exactly as authored with no masking or reveal control,
// and the failed-extraction state (FR-007, FR-025 through FR-028).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EGEMINISKILLDETAIL0000000000000000000';

/** A literal environment reference that must render as its own characters. */
const FIXTURE_ENV_REFERENCE = '${GEMINI_E2E_SKILL_ENDPOINT}';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-skill-detail-'));
  await mkdir(join(fixture, '.gemini/skills/changelog/scripts'), { recursive: true });
  await writeFile(
    join(fixture, '.gemini/skills/changelog/SKILL.md'),
    [
      '---',
      'name: changelog',
      `description: "draft with ${FIXTURE_SECRET} at ${FIXTURE_ENV_REFERENCE}"`,
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# Changelog',
      '',
      'Run `scripts/collect.sh` first.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, '.gemini/skills/changelog/scripts/collect.sh'),
    'echo hi\n',
    'utf8',
  );
  await writeFile(join(fixture, '.gemini/skills/changelog/reference.md'), '# format\n', 'utf8');
  // A second skill whose frontmatter cannot be parsed (FR-028).
  await mkdir(join(fixture, '.gemini/skills/broken'), { recursive: true });
  await writeFile(
    join(fixture, '.gemini/skills/broken/SKILL.md'),
    '---\nname: [unterminated\n---\n\n# Broken\n',
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the named skill's detail route from the inventory. */
async function openSkill(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  const links = page
    .locator('.aci-source-family-blocks__members > li')
    .locator(`a[href$="/${path}"], a[href*="/${path}?"]`);
  await links.first().waitFor();
  await links.first().click();
  await expect(page).toHaveURL(/\/detail\//u);
}

test('leads with the skill itself before any file contents', async ({ page }) => {
  await openSkill(page, '.gemini/skills/changelog/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('.gemini/skills/changelog/');
  // The product that recognizes the skill is stated on the page, as text.
  await expect(page.locator('.aci-skill-detail')).toContainText('Gemini CLI');
  // Every key the file declares, led by the name and description (FR-007),
  // with the credential whole and the reference as its own characters.
  const declarations = page.locator('.aci-skill-detail__declarations');
  await expect(declarations).toContainText('name: changelog');
  await expect(declarations).toContainText(`draft with ${FIXTURE_SECRET}`);
  await expect(declarations).toContainText(FIXTURE_ENV_REFERENCE);
  await expect(declarations).toContainText('api_key:');
  await expect(page.locator('.aci-skill-detail__instructions .aci-source-viewer')).toContainText(
    'Run `scripts/collect.sh` first.',
  );
  await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
});

test('lists the skill’s own directory in the files tab', async ({ page }) => {
  await openSkill(page, '.gemini/skills/changelog/SKILL.md');
  await page.getByRole('tab', { name: /^files/iu }).click();
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  // A skill is a directory: the entry point and what ships beside it. Only
  // files are links; `scripts/` is the directory that holds one.
  await expect(tree.getByRole('link')).toHaveText(['SKILL.md', 'reference.md', 'collect.sh']);
  await expect(tree.locator('.aci-directory-file-tree-branch__directory')).toHaveText([
    'scripts/1',
  ]);
  await expect(tree.getByRole('link', { name: 'SKILL.md' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(await page.locator('main').innerText()).not.toContain('echo hi');
});

test('keeps a malformed file readable while its declared name is missing', async ({ page }) => {
  await openSkill(page, '.gemini/skills/broken/SKILL.md');
  await page.getByRole('tab', { name: /^files/iu }).click();
  await expect(page.locator('.aci-skill-detail__main .aci-source-viewer')).toContainText(
    '# Broken',
  );
  // One extraction, one record: the failure is stated once beside the file.
  await expect(
    page.locator('.aci-skill-detail__main li', { hasText: 'This file could not be parsed' }),
  ).toHaveCount(1);
});

test('reports a link whose path the current scan does not hold', async ({ page }) => {
  await page.goto(
    new URL('/skills/detail/repository/.gemini/skills/gone/SKILL.md', host.origin).toString(),
  );
  await expect(page.locator('main')).toContainText(
    "Nothing in the current scan sits at this link's path.",
  );
});
