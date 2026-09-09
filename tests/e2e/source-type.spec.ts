// T1062: every read-only source surface is laid out in one type.
//
// The single-file viewer and both sides of every comparison are the browser's
// own `pre`, laid out by the cascade from one declaration —
// `--aci-source-font-size` and `--aci-source-line-height` in `main.css` — and
// a surface added without it would fall back to the browser's own monospace
// type. That is the state this spec exists to fail on.
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import {
  buildAllCustomizationKindFixture,
  type AllCustomizationKindFixture,
} from '../fixtures/repositories/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: AllCustomizationKindFixture;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = buildAllCustomizationKindFixture('aci-source-type');
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/**
 * The declaration every source surface is supposed to be laid out in: the step
 * below the body, spelled out here and in `main.css` both, so a change to
 * either without the other fails (`main.css` § --aci-source-font-size).
 */
const EXPECTED = { fontSize: '12px', lineHeight: '17px' };

/**
 * One route per source surface this product renders: the single-file viewer,
 * and one comparison of every kind whose surface has a diff of its own.
 */
const SOURCE_ROUTES: readonly {
  readonly name: string;
  /**
   * The `pre` this route lays its text out in, named per route rather than
   * found: a page can hold two comparisons — the plugin comparison shows the
   * entries' diff above the manifests' — so "the first visible box" would
   * leave one of them unread while reporting nine passes.
   */
  readonly box: string;
  /** Which of the boxes the selector reaches is the route's, where it reaches several. */
  readonly nth?: number;
  readonly path: string;
  /** The tab a box sits behind, where the route does not open on it. */
  readonly tab?: RegExp;
}[] = [
  {
    name: 'skill detail',
    box: '.aci-source-viewer',
    path: '/skills/detail/repository/.agents/skills/changelog/SKILL.md',
  },
  {
    name: 'skill comparison',
    box: '.aci-skill-compare__source .aci-source-diff__side',
    path: '/skills/compare/repository?name=changelog&leftSource=repository&left=.agents%2Fskills%2Fchangelog%2FSKILL.md&rightSource=repository&right=.github%2Fskills%2Fchangelog%2FSKILL.md',
  },
  {
    name: 'instructions comparison',
    box: '.aci-source-diff__side',
    path: '/instructions/compare/repository?range=**&leftSource=repository&left=AGENTS.md&rightSource=repository&right=.github%2Fcopilot-instructions.md',
  },
  {
    name: 'prompt comparison',
    box: '.aci-source-diff__side',
    path: '/prompts-and-commands/compare/repository?leftSource=repository&left=.claude%2Fcommands%2Fdeploy.md&rightSource=repository&right=.github%2Fprompts%2Fdeploy.prompt.md',
  },
  {
    name: 'custom-agent comparison',
    box: '.aci-source-diff__side',
    path: '/agents/compare/repository?name=reviewer&leftSource=repository&left=.codex%2Fagents%2Freviewer.toml&rightSource=repository&right=.claude%2Fagents%2Freviewer.md',
  },
  {
    name: 'MCP declaration comparison',
    box: '.aci-mcp-compare .aci-source-diff__side',
    path: '/mcp/compare/repository?name=shared-everywhere&leftSource=repository&left=.github%2Fmcp.json&rightSource=repository&right=.mcp.json',
  },
  {
    name: 'hook declaration comparison',
    box: '.aci-hook-recognition-comparison .aci-source-diff__side',
    path: '/hooks/compare/repository?event=PreToolUse&leftSource=repository&left=.claude%2Fsettings.json&rightSource=repository&right=.codex%2Fhooks.json',
  },
  {
    // The manifest diff this route opens on, which follows the entries' diff
    // in the declaration panel: its first side is the panel's third box.
    name: 'plugin manifest comparison',
    box: '#aci-plugin-compare-panel-declaration .aci-source-diff__side',
    nth: 2,
    path: '/plugins/compare/repository?name=changelog-writer%40inspector-examples&leftSource=repository&left=.agents%2Fplugins%2Fmarketplace.json&rightSource=repository&right=marketplace.json',
  },
  {
    // The entries' diff, which leads the same panel.
    name: 'plugin declaration comparison',
    box: '#aci-plugin-compare-panel-declaration .aci-source-diff__side',
    path: '/plugins/compare/repository?name=absolute-helper%40inspector-examples&leftSource=repository&left=.agents%2Fplugins%2Fmarketplace.json&rightSource=repository&right=marketplace.json',
    tab: /^Declaration/u,
  },
];

for (const route of SOURCE_ROUTES) {
  test(`lays the ${route.name} out in the product's own source type`, async ({ page }) => {
    await page.goto(new URL(route.path, host.origin).href);
    if (route.tab !== undefined) {
      await page.getByRole('tab', { name: route.tab }).click();
    }
    // Inside this route's own box, and visible: a route with tabs keeps the
    // panels it is not showing mounted and hidden.
    const box = page.locator(route.box).nth(route.nth ?? 0);
    await expect(box, route.name).toBeVisible();
    const metrics = await box.evaluate((element) => {
      const style = getComputedStyle(element);
      return { fontSize: style.fontSize, lineHeight: style.lineHeight };
    });
    // The box is where the declaration lives and what lays the text out, so
    // one reading answers both; a box that lost the tokens fails it.
    expect(metrics, route.name).toEqual(EXPECTED);
  });
}
