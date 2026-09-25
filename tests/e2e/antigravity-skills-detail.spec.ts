// specs/003-antigravity-cli-support T033, T085: browser acceptance for the
// skill folder Antigravity CLI reads in `.agents/skills/`. The folder's page
// has a file panel because the skill is its directory, and a flat Markdown
// file beside it is no skill: every page that gives a terminal skill location
// shows the folder, and the terminal filters a flat file out (spec.md
// § FR-004; contracts/vendors/antigravity-cli.md § Known uncertainties item 6).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EANTIGRAVITYSKILL000000000000000000';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-antigravity-skill-detail-'));
  await mkdir(join(fixture, '.agents/skills/changelog/scripts'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/changelog/SKILL.md'),
    [
      '---',
      'name: changelog',
      `description: "draft the entry with ${FIXTURE_SECRET}"`,
      '---',
      '',
      '# Changelog',
      '',
      'Run `scripts/collect.sh` to list the commits.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, '.agents/skills/changelog/scripts/collect.sh'),
    'echo hi\n',
    'utf8',
  );
  await writeFile(join(fixture, '.agents/skills/changelog/reference.md'), '# format\n', 'utf8');
  // A skill folder, and a flat Markdown file of the same name beside it that
  // no product reads as a skill.
  await mkdir(join(fixture, '.agents/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/deploy.md'),
    '---\nname: deploy\ndescription: Deploy to staging.\n---\n\nRun the staging pipeline.\n',
    'utf8',
  );
  await writeFile(
    join(fixture, '.agents/skills/deploy/SKILL.md'),
    '---\nname: deploy\ndescription: Deploy to staging.\n---\n\nThen wait for the health check.\n',
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the skills inventory. */
async function openSkills(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(new URL('/?kind=skill', host.origin).toString());
  await expect(page.getByRole('tabpanel')).toContainText('changelog');
}

test('lists the folder and not the flat file beside it', async ({ page }) => {
  await openSkills(page);
  const row = page.locator('.aci-item').filter({ hasText: 'deploy' }).first();
  // The folder is read by the three products that document `.agents/skills/`,
  // and the flat file by none of them, so it is on no row at all.
  await expect(row).toContainText('.agents/skills/deploy/SKILL.md');
  await expect(row).toContainText('Antigravity CLI');
  await expect(row).toContainText('OpenAI Codex');
  expect(await page.locator('main').innerText()).not.toContain('.agents/skills/deploy.md');
});

test('gives the folder shape a file panel, because it has a directory', async ({ page }) => {
  await page.goto(
    new URL(
      '/skills/detail/repository/.agents%2Fskills%2Fchangelog%2FSKILL.md',
      host.origin,
    ).toString(),
  );
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('.agents/skills/changelog/');
  await expect(page.locator('.aci-skill-detail')).toContainText('Antigravity CLI');
  const declarations = page.locator('.aci-skill-detail__declarations');
  await expect(declarations).toContainText('name: changelog');
  // The credential whole, with no mask and no reveal control (FR-025).
  await expect(declarations).toContainText(FIXTURE_SECRET);
  await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
  await page.getByRole('tab', { name: /^files/iu }).click();
  const tree = page.getByRole('navigation', { name: 'Files in this skill' });
  await expect(tree.getByRole('link')).toHaveText(['SKILL.md', 'reference.md', 'collect.sh']);
});
