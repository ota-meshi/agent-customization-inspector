// T1157 and T1148: browser acceptance for a customization whose file wrote its
// name empty — the row shape it draws, and the search that finds it (FR-025,
// FR-006, WCAG 1.4.1, WCAG 2.4.4).
//
// Its own file rather than a case in each of theirs, because one behaviour
// crosses both: the row draws a badge, and the search matches the word that
// badge holds. Splitting it would leave neither suite holding the whole of it.
//
// The fixture is the case that makes the two rows collide: one `.mcp.json`
// declaring both `""` and a server actually named for this product's words.
// Before the badge those rows drew the same characters, announced the same
// characters, and differed only in colour — so what this suite holds is that
// the difference now reaches the screen as a shape, and that the search finds
// each row by what that row displays.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The badge a surface draws in place of a name (`AuthoredNameText.vue`). */
const BADGE = '.aci-carrier-kind';

test.describe('a declaration whose file wrote its name empty', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-empty-name-'));
    await writeFile(
      join(fixture, '.mcp.json'),
      `${JSON.stringify(
        {
          mcpServers: {
            '': { command: 'node', args: ['a.mjs'] },
            'Empty name': { command: 'node', args: ['b.mjs'] },
            search: { command: 'node', args: ['c.mjs'] },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('draws the absence as a shape, and a name spelling it as the name', async ({ page }) => {
    await page.goto(new URL('/?kind=mcp', host.origin).href);
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    await expect(rows).toHaveCount(3);

    // Exactly one row draws the badge: the one whose file wrote it empty.
    // The row named for the same words is a name, and names are text.
    await expect(rows.locator(BADGE)).toHaveCount(1);
    await expect(rows.first().locator(BADGE)).toHaveText('Empty name');
    await expect(rows.nth(1).locator(BADGE)).toHaveCount(0);
    await expect(rows.nth(1)).toContainText('Empty name');

    // And the two links no longer announce identically while opening
    // different declarations (WCAG 2.4.4).
    const links = page.getByRole('tabpanel').locator('a');
    await expect(links.nth(0)).toHaveAttribute('aria-label', 'empty name in .mcp.json');
    await expect(links.nth(1)).toHaveAttribute('aria-label', 'Empty name in .mcp.json');
  });

  test('carries the same shape onto the detail, and words where none fits', async ({ page }) => {
    await page.goto(new URL('/mcp/detail/repository/.mcp.json?server=', host.origin).href);
    // The crumb and the heading both name the subject, so both carry it: a
    // reader who met the badge on the row must not meet a bare name here.
    await expect(page.locator(`.aci-detail-crumbs ${BADGE}`)).toHaveText('Empty name');
    await expect(page.locator(`.aci-detail-title ${BADGE}`)).toHaveText('Empty name');
    // A tab holds no shape, so it holds the words instead.
    await expect(page).toHaveTitle(/empty name — \.mcp\.json — Repository/u);

    await page.goto(
      new URL('/mcp/detail/repository/.mcp.json?server=Empty%20name', host.origin).href,
    );
    await expect(page.locator(`.aci-detail-title ${BADGE}`)).toHaveCount(0);
    await expect(page).toHaveTitle(/Empty name — \.mcp\.json — Repository/u);
  });

  test('finds each row by what that row displays', async ({ page }) => {
    await page.goto(new URL('/?kind=mcp', host.origin).href);
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    const search = page.getByRole('searchbox');

    // The undeclared row displays this product's words, so those words find
    // it — and find only it, because the row named for them is its own row
    // and keeps its own identity (FR-006).
    await search.fill('Empty name');
    await expect(rows).toHaveCount(2);
    await expect(rows.first().locator(BADGE)).toHaveText('Empty name');

    // A name the file wrote finds the row that wrote it, whatever this
    // product would say in its place.
    await search.fill('search');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('search');
  });
});
