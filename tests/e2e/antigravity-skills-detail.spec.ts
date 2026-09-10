// specs/003-antigravity-cli-support T033: browser acceptance for the two skill
// shapes Antigravity CLI admits at one location. A `.agents/skills/` holding a
// skill folder and a flat Markdown file is opened from the inventory, and each
// shape's own detail is verified: the folder's page has a file panel because
// it has a directory, and the flat file's page is the skill alone — no tab
// strip and no file panel, because there is no directory for one to have as a
// subject (spec.md § FR-004).
//
// The row the two share is verified too: a name spelled in both shapes is one
// row carrying both files, with no precedence stated between them, because no
// cited page says which shape the terminal prefers
// (contracts/vendors/antigravity-cli.md § Known uncertainties item 6).
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
  // The flat shape the terminal's own page documents, and the same name in the
  // folder shape beside it: one row, two files, no precedence.
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
  // A flat file declaring no `name`: this shape has no folder to take one
  // from, so the row is the file's own name without its extension.
  await writeFile(
    join(fixture, '.agents/skills/x.md'),
    '---\ndescription: Expand the selected expression.\n---\n\nOne step at a time.\n',
    'utf8',
  );
  // A flat file whose frontmatter block is not YAML: the extraction fails
  // all-or-nothing, so this skill has no declarations and no instructions to
  // show and only its diagnostic and its own text remain (FR-028).
  await writeFile(
    join(fixture, '.agents/skills/summarize.md'),
    '---\nname: [\ndescription: Summarize the selected text.\n---\n\nSummarize the selection in three sentences.\n',
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

test('puts a name spelled in both shapes on one row, stating no precedence', async ({ page }) => {
  await openSkills(page);
  const row = page.locator('.aci-item').filter({ hasText: 'deploy' }).first();
  // Both files under the one name, each with the products that read it: the
  // folder is read by the three products that document `.agents/skills/`, and
  // the flat file only by the terminal whose own page documents it.
  await expect(row).toContainText('.agents/skills/deploy.md');
  await expect(row).toContainText('.agents/skills/deploy/SKILL.md');
  await expect(row).toContainText('Antigravity CLI');
  await expect(row).toContainText('OpenAI Codex');
  // No shape is ranked over the other, and no same-name rule is claimed.
  await expect(row).not.toContainText('takes precedence');
  await expect(row).not.toContainText('wins');
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

test('renders a flat skill as the skill alone, with no strip and no file panel', async ({
  page,
}) => {
  await page.goto(
    new URL('/skills/detail/repository/.agents%2Fskills%2Fx.md', host.origin).toString(),
  );
  // Headed by the skill's own path: the directory it sits in holds every other
  // flat skill beside it, so heading the page with that would head two skills
  // the same.
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('.agents/skills/x.md');
  // Named by its own file name, because the shape has no folder to take one
  // from (contracts/vendors/antigravity-cli.md § Known uncertainties item 7).
  await expect(page.locator('.aci-skill-detail')).toContainText('Invocation name: x');
  // The panel-only detail: one tab would not be a choice, and a file panel
  // whose subject is a directory has no subject here.
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Files in this skill' })).toHaveCount(0);
  await expect(page.locator('.aci-skill-detail__instructions')).toContainText(
    'One step at a time.',
  );
  // The file's own text, under the label and on the condition every other
  // single-file detail uses: readable, not parsed successfully. The folder
  // shape reads it in the files tab; this shape has no such tab, so the panel
  // carries it — and carries it for a skill that parsed, which is what the
  // other pages do. Each panel's name is its own band
  // (`SourceViewer.vue` § panelLabel).
  await expect(page.locator('.aci-skill-detail h3')).toHaveText([
    'Frontmatter YAML',
    'Instructions',
    'Source',
  ]);
});

test('keeps the file readable and openable when a flat skill declares no parsable block', async ({
  page,
}) => {
  await page.goto(
    new URL('/skills/detail/repository/.agents%2Fskills%2Fsummarize.md', host.origin).toString(),
  );
  // Nothing parsed, so there are no declarations and no instructions to show
  // and the diagnostic says why (FR-028).
  await expect(page.locator('.aci-skill-detail__declarations')).toHaveCount(0);
  await expect(page.locator('.aci-skill-detail__instructions')).toHaveCount(0);
  // What must survive it: the line stating the read outcome and the command
  // that opens the file, and the file's own text below the diagnostic.
  // Selecting a files tab this shape does not render took all three away.
  await expect(page.locator('.aci-detail-attributes')).toContainText('Readable text');
  await expect(page.locator('.aci-detail-attributes')).toContainText('Open in VS Code');
  await expect(page.locator('.aci-skill-detail h3')).toHaveText(['Source']);
  await expect(page.locator('.aci-skill-detail')).toContainText(
    'Summarize the selection in three sentences.',
  );
});
