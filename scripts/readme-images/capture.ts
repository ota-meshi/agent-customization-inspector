// Regenerates the readme's two screenshots, `docs/images/inventory.png` and
// `docs/images/comparison.png`, from the showcase repository beside this
// script: `pnpm run docs:images` builds the product, writes the tree under the
// git-ignored `.tmp/`, serves it with the packaged CLI exactly as a user
// would, and photographs the two pages in Chromium.
//
// Both readmes' alt text describes what each image shows — the inventory on
// its Skill tab, and the `changelog` skill's two copies compared — so a change
// to what is captured here is a change to that text as well, in both
// languages.
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from 'playwright';

import { launchHost, stopHost } from '../../tests/e2e/launch-host.ts';
import { buildShowcaseRepository } from './showcase-repository.ts';

/** The repository root, two directories above this script. */
const repositoryRoot = join(import.meta.dirname, '..', '..');

/** Where the readme images live, at the paths both readmes reference. */
const imageDirectory = join(repositoryRoot, 'docs', 'images');

/**
 * The showcase tree, rebuilt from scratch on every run. `.tmp/` is
 * git-ignored and excluded from every gate, so the tree stays on disk after
 * the run for `pnpm run start:fixture showcase` and inspection.
 */
const showcaseRoot = join(repositoryRoot, '.tmp', 'fixtures', 'showcase');

/**
 * The comparison the second screenshot shows: the `changelog` skill's two
 * copies, the `.claude/skills/` one first and the `.agents/skills/` one
 * second — the order the readme's prose names them in, and the order that
 * reads as the stale copy against the current one.
 */
const comparisonQuery = new URLSearchParams({
  name: 'changelog',
  leftSource: 'repository',
  left: '.claude/skills/changelog/SKILL.md',
  rightSource: 'repository',
  right: '.agents/skills/changelog/SKILL.md',
});

rmSync(showcaseRoot, { recursive: true, force: true });
mkdirSync(showcaseRoot, { recursive: true });
buildShowcaseRepository(showcaseRoot);

const host = await launchHost(showcaseRoot);
const browser = await chromium.launch();
try {
  // A 1280×900 page at a device pixel ratio of 2, so the readme renders the
  // images at their layout size and the text stays sharp on a high-density
  // display. The height is what fits the comparison's three diff blocks with
  // the first lines of the last one showing, which is what its alt text
  // promises. The light scheme is forced because the page otherwise follows
  // the machine's, and a screenshot taken on a dark desktop would not match
  // its sibling.
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });

  // The inventory on its Skill tab, where a row with two files offers its
  // comparison and a shared name shows how each product resolves it.
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await page
    .locator('.aci-item')
    .filter({ hasText: '.agents/skills/changelog/SKILL.md' })
    .getByRole('link', { name: "Compare this skill's files" })
    .waitFor();
  await settle(page);
  await page.screenshot({ path: join(imageDirectory, 'inventory.png') });

  // The comparison, once all three diff blocks have rendered their text: the
  // diff editor lays its lines out asynchronously, so the page being loaded
  // is not the diff being visible.
  await page.goto(new URL(`/skills/compare/repository?${comparisonQuery}`, host.origin).href);
  await page.locator('.aci-source-diff').nth(2).getByText('gh pr list').first().waitFor();
  // The heading takes focus on entry so a keyboard user starts at the top of
  // the comparison, and a page reached by URL shows that focus as a ring. The
  // ring is a highlight the image would then seem to be about, so the heading
  // is blurred before the capture; nothing else on the page depends on it.
  await page.getByRole('heading', { name: 'Compare skill files' }).blur();
  await settle(page);
  await page.screenshot({ path: join(imageDirectory, 'comparison.png') });
} finally {
  await browser.close();
  await stopHost(host);
}

console.log(`wrote ${join(imageDirectory, 'inventory.png')}`);
console.log(`wrote ${join(imageDirectory, 'comparison.png')}`);

/**
 * Waits for what a locator cannot: the web fonts, whose late arrival reflows
 * every line, and the frame after them, so the capture is of the settled page.
 */
async function settle(page: import('playwright').Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}
