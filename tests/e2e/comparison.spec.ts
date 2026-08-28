// T929: the comparison target the US3 validation section documents
// (quickstart.md § User story validation · 3. Compare two files).
//
// One launch of the packaged CLI against a tree holding one skill name in two
// readable copies, plus the two cases a selection can be refused for: a copy
// with no readable source, and a path this scan does not hold. What it
// verifies is the flow a reader takes — the entry link on the row, the diff
// itself, the switchers, the way back — and the negative half that makes this
// product a viewer: literal differences with no ranking, no merge, no
// validation, no fix, and no control that would write anything.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The credential each copy declares differently; both reach the diff whole. */
const CLAUDE_SECRET = 'ghp_E2ECOMPARECLAUDE00000000000000000000000';
const AGENTS_SECRET = 'ghp_E2ECOMPAREAGENTS00000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${COMPARE_E2E_ENDPOINT}';

/** The process value that must never replace the reference. */
const ENVIRONMENT_SENTINEL = 'resolved-compare-sentinel-value';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-comparison-'));
  // Two readable copies of one invocation name, drifted: the same keys with
  // different values, plus one key only one copy declares.
  await mkdir(join(fixture, '.claude/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/deploy/SKILL.md'),
    [
      '---',
      'name: deploy',
      'description: Ship the service from the Claude copy.',
      `token: ${CLAUDE_SECRET}`,
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      'Run the deploy checklist, then announce the release.',
      '',
    ].join('\n'),
    'utf8',
  );
  await mkdir(join(fixture, '.agents/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/deploy/SKILL.md'),
    [
      '---',
      'name: deploy',
      'description: Ship the service from the shared copy.',
      `token: ${AGENTS_SECRET}`,
      '---',
      '',
      'Run the deploy checklist.',
      '',
    ].join('\n'),
    'utf8',
  );
  // A companion each copy ships, binary in one of them: selecting that pair is
  // refused rather than compared, and the binary side is not an absence
  // either (quickstart § 3 item 1).
  await writeFile(
    join(fixture, '.claude/skills/deploy/reference.md'),
    '# Deploy reference\n\nThe long version.\n',
    'utf8',
  );
  await writeFile(
    join(fixture, '.agents/skills/deploy/reference.md'),
    Buffer.from([0x23, 0x00, 0x72, 0x65, 0x66]),
  );
  // A third directory whose entry point no reading can name: it is on no
  // skill row, so a link naming it owns no comparison at all.
  await mkdir(join(fixture, '.github/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, '.github/skills/deploy/SKILL.md'),
    Buffer.from([0x23, 0x00, 0x64, 0x65, 0x70, 0x6c, 0x6f, 0x79]),
  );
  process.env['COMPARE_E2E_ENDPOINT'] = ENVIRONMENT_SENTINEL;
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  delete process.env['COMPARE_E2E_ENDPOINT'];
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('opens from the row and diffs the two copies literally', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await page
    .getByRole('link', { name: /^Compare this skill/u })
    .first()
    .click();
  await expect(page).toHaveURL(/\/skills\/compare\/repository\?/u);
  // The heading takes focus on entry, so a keyboard user starts at the top of
  // the comparison rather than wherever the row left them (WCAG 2.4.3).
  await expect(page.getByRole('heading', { name: /Compare/u }).first()).toBeFocused();

  const main = page.locator('main');
  // Both sides state their own identity, and the diff holds both copies'
  // complete text: the credentials whole, the environment reference as its own
  // characters, and the differing prose line by line (FR-025, FR-026).
  await expect(main).toContainText('.claude/skills/deploy/SKILL.md');
  await expect(main).toContainText('.agents/skills/deploy/SKILL.md');
  await expect(main).toContainText(CLAUDE_SECRET);
  await expect(main).toContainText(AGENTS_SECRET);
  await expect(main).toContainText(ENVIRONMENT_REFERENCE);
  await expect(main).toContainText('announce the release');
  expect(await main.innerText()).not.toContain(ENVIRONMENT_SENTINEL);
});

test('ranks nothing, merges nothing, and offers no way to change either side', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await page
    .getByRole('link', { name: /^Compare this skill/u })
    .first()
    .click();
  await expect(page.locator('main')).toContainText(CLAUDE_SECRET);

  // A comparison is two texts side by side. No side is better, nothing is
  // merged or synchronized, nothing is validated or linted, and nothing is
  // offered to fix (FR-012, FR-020, FR-032).
  for (const pattern of [
    /merge/iu,
    /apply/iu,
    /accept/iu,
    /sync/iu,
    /format/iu,
    /convert/iu,
    /fix/iu,
    /validate/iu,
    /lint/iu,
    /^run/iu,
  ]) {
    await expect(page.getByRole('button', { name: pattern }), String(pattern)).toHaveCount(0);
  }
  const chrome = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main === null) {
      throw new Error('no main element rendered');
    }
    const copy = main.cloneNode(true) as HTMLElement;
    // The authored text and the paths are the reader's own words; what this
    // scans is the product's.
    for (const authored of copy.querySelectorAll(
      '.aci-authored-text, .aci-path, .monaco-editor, pre',
    )) {
      authored.remove();
    }
    return copy.innerText.toLowerCase();
  });
  for (const word of [
    'better',
    'worse',
    'recommend',
    'severity',
    'score',
    'invalid',
    'compliant',
  ]) {
    expect(chrome, word).not.toContain(word);
  }
});

test('refuses a side with no readable source, and a directory no row owns', async ({ page }) => {
  const pair =
    'name=deploy&leftSource=repository&left=.claude%2Fskills%2Fdeploy%2FSKILL.md&rightSource=repository&right=.agents%2Fskills%2Fdeploy%2FSKILL.md';
  // The companion one copy ships as binary: the file exists in both copies, so
  // this is not the one-sided case — it is a side whose source was never read,
  // and the comparison says so instead of diffing nothing against something
  // (quickstart § 3 item 1).
  await page.goto(
    new URL(`/skills/compare/repository?${pair}&file=reference.md`, host.origin).toString(),
  );
  await expect(page.locator('main')).toContainText('no readable source text to compare');
  expect(await page.locator('main').innerText()).not.toContain(CLAUDE_SECRET);

  // A directory no skill name owns — its entry point is binary, so it names
  // no skill — owns no comparison either.
  await page.goto(
    new URL(
      '/skills/compare/repository?name=deploy&leftSource=repository&left=.claude%2Fskills%2Fdeploy%2FSKILL.md&rightSource=repository&right=.github%2Fskills%2Fdeploy%2FSKILL.md&file=SKILL.md',
      host.origin,
    ).toString(),
  );
  await expect(page.locator('main')).toContainText('current scan');
});

test('leaves the comparison behind when the route does, and comes back to the row', async ({
  page,
}) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  const entry = page.getByRole('link', { name: /^Compare this skill/u }).first();
  await entry.click();
  await expect(page.locator('main')).toContainText(CLAUDE_SECRET);

  // Leaving the route drops what it mounted: the inventory that comes back
  // carries none of the compared text, which is what "route close clears the
  // displayed detail state" means for a reader (FR-027).
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
  expect(await page.locator('main').innerText()).not.toContain(CLAUDE_SECRET);
  // The row is still there to open again, and the same entry link addresses it.
  await expect(entry).toBeVisible();
});
