// T1062: every read-only source surface is laid out in one type.
//
// The single-file viewer and the seven comparison diffs each mount Monaco into
// a container of their own, and `monaco.ts` reads that container's computed
// font size and line height rather than keeping a copy (§ typeMetricsOf). One
// declaration reaches all of them — `--aci-source-font-size` and
// `--aci-source-line-height` in `main.css` — and a host added without it would
// fall back to Monaco's platform default, which is 12px on macOS and 14px
// everywhere else. That is the state this spec exists to fail on: the
// placeholder a viewer draws before its editor mounts is laid out from the
// same declaration, so a host outside it jumps at mount by the difference.
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
 * One route per Monaco host this product mounts: the single-file viewer, and
 * one comparison of every kind whose surface has a diff of its own.
 */
const SOURCE_ROUTES: readonly {
  readonly name: string;
  /**
   * The element this product owns and mounts the editor into, named per route
   * rather than found: a page can hold two of them — the plugin comparison
   * shows the entries' diff above the manifests' — so "the first visible
   * editor" would leave one of them unread while reporting nine passes.
   */
  readonly host: string;
  readonly path: string;
  /** The tab a host sits behind, where the route does not open on it. */
  readonly tab?: RegExp;
}[] = [
  {
    name: 'skill detail',
    host: '.aci-source-viewer',
    path: '/skills/detail/repository/.agents/skills/changelog/SKILL.md',
  },
  {
    name: 'skill comparison',
    host: '.aci-source-diff',
    path: '/skills/compare/repository?name=changelog&leftSource=repository&left=.agents%2Fskills%2Fchangelog%2FSKILL.md&rightSource=repository&right=.github%2Fskills%2Fchangelog%2FSKILL.md',
  },
  {
    name: 'instructions comparison',
    host: '.aci-source-diff',
    path: '/instructions/compare/repository?range=**&leftSource=repository&left=AGENTS.md&rightSource=repository&right=.github%2Fcopilot-instructions.md',
  },
  {
    name: 'prompt comparison',
    host: '.aci-source-diff',
    path: '/prompts-and-commands/compare/repository?leftSource=repository&left=.claude%2Fcommands%2Fdeploy.md&rightSource=repository&right=.github%2Fprompts%2Fdeploy.prompt.md',
  },
  {
    name: 'custom-agent comparison',
    host: '.aci-source-diff',
    path: '/agents/compare/repository?name=reviewer&leftSource=repository&left=.codex%2Fagents%2Freviewer.toml&rightSource=repository&right=.claude%2Fagents%2Freviewer.md',
  },
  {
    name: 'MCP declaration comparison',
    host: '.aci-declaration-diff',
    path: '/mcp/compare/repository?name=shared-everywhere&leftSource=repository&left=.github%2Fmcp.json&rightSource=repository&right=.mcp.json',
  },
  {
    name: 'hook declaration comparison',
    host: '.aci-hook-recognition-comparison__diff',
    path: '/hooks/compare/repository?event=PreToolUse&leftSource=repository&left=.claude%2Fsettings.json&rightSource=repository&right=.codex%2Fhooks.json',
  },
  {
    // The manifest diff this route opens on, which is the plugin comparison's
    // own source host.
    name: 'plugin manifest comparison',
    host: '.aci-source-diff',
    path: '/plugins/compare/repository?name=changelog-writer%40inspector-examples&leftSource=repository&left=.agents%2Fplugins%2Fmarketplace.json&rightSource=repository&right=marketplace.json',
  },
  {
    // The other plugin host, behind the tab that compares what the two
    // marketplace entries declare.
    name: 'plugin declaration comparison',
    host: '.aci-plugin-declaration-diff',
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
    // Inside this route's own host, and visible: a route with tabs keeps the
    // panels it is not showing mounted and hidden, and a diff mounts one
    // `.view-lines` per side.
    const lines = page.locator(`${route.host} .monaco-editor .view-lines:visible`).first();
    await expect(lines, route.name).toBeVisible();
    const metrics = await lines.evaluate((element) => {
      // The outermost Monaco root, whose parent is the element this product
      // owns. A diff mounts one `.monaco-editor` per side inside a
      // `.monaco-diff-editor`, so the nearest match is Monaco's own and its
      // parent is Monaco's too — reading that would report the product's
      // cascade back to itself whatever the editor was given.
      let monacoRoot: Element | null = null;
      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        if (node.matches('.monaco-diff-editor, .monaco-editor')) {
          monacoRoot = node;
        }
      }
      const host = monacoRoot?.parentElement ?? null;
      const read = (node: Element | null) => {
        if (node === null) {
          return null;
        }
        const style = getComputedStyle(node);
        return { fontSize: style.fontSize, lineHeight: style.lineHeight };
      };
      return { host: read(host), text: read(element), matched: host?.className ?? null };
    });

    // Two facts, because either can be true without the other. The host is
    // where the declaration lives and where `monaco.ts` reads it from
    // (§ typeMetricsOf); the text is what Monaco actually laid out, which
    // comes from the options it was constructed with rather than from the
    // cascade. A host that lost the tokens fails the first, and an editor
    // never given them fails the second.
    // The element the metrics were read from is the one this route names, so
    // a page that reorders its editors fails here rather than passing on a
    // sibling's.
    expect(metrics.matched, `${route.name} host element`).toContain(route.host.slice(1));
    expect(metrics.host, `${route.name} host`).toEqual(EXPECTED);
    expect(metrics.text, `${route.name} text`).toEqual(EXPECTED);
  });
}
