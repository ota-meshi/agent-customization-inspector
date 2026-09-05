// T927: Repository-complete browser acceptance for US2 — what a detail shows
// when a reader opens one, across every readable outcome a file can have.
//
// The per-family detail suites each assert their own kind's page; what this
// one owns is the outcome matrix on one tree: complete literal text for a
// readable file, the same for text the decoder had to replace a byte in, a
// binary file as its diagnostic alone, a file whose declarations could not be
// read, and a link into a path this scan does not hold. Plus the negative
// half that applies to every one of them — nothing stands between the reader
// and the content (FR-027), nothing is masked or resolved (FR-025, FR-026),
// and no control offers to run, validate, or fix anything (FR-020, FR-032).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { waitForInventory } from './repository-status';
import { openNoKindDisclosure } from './no-kind-disclosure';

/** A credential shape no environment can resolve; it must reach the page whole. */
const SECRET = 'ghp_E2EDETAIL0000000000000000000000000000';

/** An environment reference the page must show as characters, never as a value. */
const ENVIRONMENT_REFERENCE = '${DETAIL_E2E_ENDPOINT}';

/** The process value that must never replace the reference. */
const ENVIRONMENT_SENTINEL = 'resolved-detail-sentinel-value';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-detail-complete-'));
  // A readable skill carrying both literals a detail must show as written.
  await mkdir(join(fixture, '.claude/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/deploy/SKILL.md'),
    [
      '---',
      'name: deploy',
      'description: Ship the service.',
      `token: ${SECRET}`,
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      'Run the deploy checklist.',
      '',
    ].join('\n'),
    'utf8',
  );
  // Text with one byte no UTF-8 decoding can accept: readable, replaced, and
  // complete.
  await mkdir(join(fixture, '.claude/skills/replaced'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/replaced/SKILL.md'),
    Buffer.concat([
      Buffer.from('---\nname: replaced\ndescription: A ', 'utf8'),
      Buffer.from([0xff]),
      Buffer.from(' name.\n---\n\nBody after the replacement.\n', 'utf8'),
    ]),
  );
  // NUL bytes: diagnostic-only, with no text on the wire at all.
  await mkdir(join(fixture, '.claude/skills/binary'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/binary/SKILL.md'),
    Buffer.from([0x23, 0x00, 0x62, 0x69, 0x6e]),
  );
  // Frontmatter no YAML reading can resolve: the extraction fails whole while
  // the file stays readable.
  await mkdir(join(fixture, '.claude/skills/malformed'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/malformed/SKILL.md'),
    '---\nname: [unterminated\n---\n\nBody.\n',
    'utf8',
  );
  process.env['DETAIL_E2E_ENDPOINT'] = ENVIRONMENT_SENTINEL;
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  delete process.env['DETAIL_E2E_ENDPOINT'];
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('opens a readable detail directly, literal and unmasked, with nothing in front of it', async ({
  page,
}) => {
  await page.goto(
    new URL('/skills/detail/repository/.claude/skills/deploy/SKILL.md', host.origin).toString(),
  );
  const main = page.locator('main');
  // No acknowledgement, no notice, no confirmation: the session is
  // loopback-bound over the reader's own files, so a gate would guard nothing
  // while making every file take two interactions to read (FR-027).
  await expect(
    main.getByRole('button', { name: /acknowledge|continue|i understand|show/iu }),
  ).toHaveCount(0);
  // The complete authored text, both literals as written: nothing masked,
  // nothing shortened, and no process value in place of the reference
  // (FR-025, FR-026).
  await expect(main).toContainText(SECRET);
  await expect(main).toContainText(ENVIRONMENT_REFERENCE);
  await expect(main).toContainText('Run the deploy checklist.');
  expect(await main.innerText()).not.toContain(ENVIRONMENT_SENTINEL);
  // And no control that would uncover, run, or change anything.
  for (const pattern of [/mask/iu, /reveal/iu, /^run/iu, /execute/iu, /fix/iu, /validate/iu]) {
    await expect(page.getByRole('button', { name: pattern })).toHaveCount(0);
  }
});

test('shows replaced text whole, and a binary file as its diagnostic alone', async ({ page }) => {
  await page.goto(
    new URL('/skills/detail/repository/.claude/skills/replaced/SKILL.md', host.origin).toString(),
  );
  const main = page.locator('main');
  // A replacement character is content the decode produced, so the file is
  // readable and its text is complete through it.
  await expect(main).toContainText('Body after the replacement.');
  await expect(main).toContainText('Readable text (decoded with replacement characters)');

  // A binary `SKILL.md` is recognized by nothing — its extraction cannot even
  // be attempted — so it is listed under the files no kind lists, which is
  // where its own read outcome is stated. The list is a rail entry the reader
  // selects, because a `partial` generation must not put a reader's
  // unrecognized file on screen unasked.
  await page.goto(host.origin);
  const noKind = await openNoKindDisclosure(page);
  await expect(noKind).toContainText('.claude/skills/binary/SKILL.md');
  // NUL bytes make the file binary: the row states that and no text, because
  // none travelled (FR-025).
  await expect(noKind).toContainText('Binary — recorded without source text');
  await expect(noKind).toContainText('This file contains NUL bytes');
  await expect(noKind.locator('.aci-source-viewer')).toHaveCount(0);
});

test('states a failed extraction without inventing what the file declares', async ({ page }) => {
  await page.goto(
    new URL('/skills/detail/repository/.claude/skills/malformed/SKILL.md', host.origin).toString(),
  );
  const main = page.locator('main');
  // The declarations are unknown rather than absent (FR-028), and the file
  // itself is still readable — so the source is there and no declaration was
  // guessed from it.
  await expect(main).toContainText('could not be parsed');
  await expect(main).toContainText('unterminated');
});

test('reports a link this scan does not hold, and offers the way back', async ({ page }) => {
  await page.goto(
    new URL('/skills/detail/repository/.claude/skills/absent/SKILL.md', host.origin).toString(),
  );
  await expect(page.locator('.aci-subject-unavailable')).toContainText('current scan');
  await page
    .getByRole('link', { name: /Return to the inventory|Back to the inventory/u })
    .first()
    .click();
  await waitForInventory(page);
});
