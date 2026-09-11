// specs/003-antigravity-cli-support T038: browser acceptance for the
// Antigravity CLI workspace rules. Each direct child of `.agents/rules/` — and
// of the superseded `.agent/rules/` the vendor still supports — is one row,
// and the activation its frontmatter declares reaches the page as the file's
// own text: no glob is matched, no mode is evaluated, and no control offers to
// apply one (spec.md § FR-016, FR-020, FR-025).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-antigravity-rules-'));
  await mkdir(join(fixture, '.agents/rules'), { recursive: true });
  await mkdir(join(fixture, '.agent/rules'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/rules/typescript.md'),
    '---\nactivation: glob\nglob: "src/**/*.ts"\n---\n\nNo `any`. Narrow with a discriminant.\n',
    'utf8',
  );
  await writeFile(
    join(fixture, '.agents/rules/house-style.md'),
    '---\nactivation: always\n---\n\nPrefer the longer name that is always understandable.\n',
    'utf8',
  );
  await writeFile(
    join(fixture, '.agent/rules/legacy-imports.md'),
    '---\nactivation: manual\n---\n\nImport from the package root.\n',
    'utf8',
  );
  // Near misses: a non-Markdown sibling, and a second level the page shows no
  // depth for.
  await mkdir(join(fixture, '.agents/rules/frontend'), { recursive: true });
  await writeFile(join(fixture, '.agents/rules/README.txt'), 'not markdown\n', 'utf8');
  await writeFile(
    join(fixture, '.agents/rules/frontend/components.md'),
    '---\nactivation: always\n---\n',
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('lists one row per direct child, both spellings included', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Rule/u }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('.agents/rules/typescript.md');
  await expect(panel).toContainText('.agents/rules/house-style.md');
  await expect(panel).toContainText('.agent/rules/legacy-imports.md');
  await expect(panel).toContainText('Antigravity CLI');
  // The near misses reach no row: a second level and a non-Markdown sibling.
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('components.md');
  expect(text).not.toContain('README.txt');
});

test('shows the declared activation as the file wrote it, evaluating nothing', async ({ page }) => {
  await page.goto(
    new URL('/rules/detail/repository/.agents%2Frules%2Ftypescript.md', host.origin).toString(),
  );
  const main = page.locator('main');
  await expect(page.locator('.aci-detail-attributes')).toContainText('Antigravity CLI');
  // The whole document its author wrote, frontmatter block included: the
  // activation is text on the page, never a decision this product makes.
  await expect(main).toContainText('activation: glob');
  await expect(main).toContainText('src/**/*.ts');
  await expect(main).toContainText('No `any`.');
  await expect(page.getByRole('button', { name: /apply|activate|enable|match|run/iu })).toHaveCount(
    0,
  );
});
