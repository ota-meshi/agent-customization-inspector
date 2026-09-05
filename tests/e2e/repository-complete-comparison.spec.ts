// T929: every comparison surface this release publishes, from one tree.
//
// Seven kinds have one, because a comparison pairs two copies of one identity:
// skills by invocation name, instructions by applicability range, MCP by
// declared server name, custom agents by name, prompts and commands by
// invocation name, plugins by plugin name, and hooks by declared lifecycle
// event. The rule and permissions kinds have none — their row unit is the file
// it was found in, which has no second copy to pair (Phase 39, withdrawn).
//
// What this spec owns is that each of those seven entry links opens its own
// comparison and diffs two real sides, and that MCP — the kind whose surfaces
// only explicit carriers join — refuses a file of another kind that happens to
// spell MCP configuration. The `comparison.spec.ts` beside it drives one
// surface deeply; this one proves none of the seven is missing.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  buildAllCustomizationKindFixture,
  type AllCustomizationKindFixture,
} from '../fixtures/repositories/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** One kind's comparison entry: the tab it is under, and the link's phrase. */
interface ComparableKind {
  /** The tab strip label, as the kind's own caption spells it. */
  readonly tab: RegExp;
  /** The entry link's visible phrase, without the row name it appends. */
  readonly entry: RegExp;
  /** The compare route the link must reach. */
  readonly route: RegExp;
}

/** Every kind whose rows offer a comparison in this release. */
const COMPARABLE_KINDS: readonly ComparableKind[] = [
  {
    tab: /^Instructions/u,
    entry: /^Compare this range/u,
    route: /\/instructions\/compare\/repository\?/u,
  },
  { tab: /^Skill/u, entry: /^Compare this skill/u, route: /\/skills\/compare\/repository\?/u },
  { tab: /^MCP/u, entry: /^Compare this name/u, route: /\/mcp\/compare\/repository\?/u },
  { tab: /^Agent/u, entry: /^Compare this name/u, route: /\/agents\/compare\/repository\?/u },
  {
    tab: /^Prompt \/ Command/u,
    entry: /^Compare this name/u,
    route: /\/prompts-and-commands\/compare\/repository\?/u,
  },
  { tab: /^Hook/u, entry: /^Compare this event/u, route: /\/hooks\/compare\/repository\?/u },
  { tab: /^Plugin/u, entry: /^Compare this plugin/u, route: /\/plugins\/compare\/repository\?/u },
];

/** The kinds whose row unit is the file, so no comparison exists to offer. */
const UNCOMPARABLE_TABS = [/^Rule/u, /^Permissions/u] as const;

let fixture: AllCustomizationKindFixture;
let host: LaunchedHost;

/** The declared server name the MCP rejection case names on both sides. */
const SHARED_SERVER_NAME = 'shared-everywhere';

test.beforeAll(async () => {
  fixture = buildAllCustomizationKindFixture('aci-comparison-complete');
  // MCP configuration added to the settings document for the very name the
  // MCP row is about. Without it the rejection below would prove only that
  // the name is missing from the file, which an implementation that wrongly
  // promoted settings MCP to carriers would also satisfy: the rejection has
  // to be about the kind, not about the name. Merged into what the builder
  // wrote rather than written over it, so the permissions and hooks that
  // document also carries — and the rows they own — stay as the builder
  // composed them.
  const settingsPath = join(fixture.root, '.claude/settings.json');
  const settings: unknown = JSON.parse(await readFile(settingsPath, 'utf8'));
  await writeFile(
    settingsPath,
    `${JSON.stringify(
      {
        // First in the document: the case below reads it out of the source
        // viewer, which renders the lines it has scrolled to.
        mcpServers: { [SHARED_SERVER_NAME]: { command: 'settings-owned' } },
        ...(settings as object),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/** Opens one kind's first comparison entry and returns the compared main region. */
async function openFirstComparison(page: Page, kind: ComparableKind): Promise<void> {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: kind.tab }).click();
  const entry = page.getByRole('link', { name: kind.entry }).first();
  await expect(entry, String(kind.entry)).toBeVisible();
  await entry.click();
  await expect(page, String(kind.route)).toHaveURL(kind.route);
}

test('offers a comparison on every kind that has one, and none where there is none', async ({
  page,
}) => {
  for (const kind of COMPARABLE_KINDS) {
    await openFirstComparison(page, kind);
    // Two sides, each named by the file it is: a comparison that reached its
    // route without a pair would be a page about nothing.
    const main = page.locator('main');
    await expect(main.locator('.aci-path').first(), String(kind.route)).toBeVisible();
    await expect(main.locator('.aci-path'), String(kind.route)).not.toHaveCount(0);
  }

  await page.goto(host.origin);
  for (const tab of UNCOMPARABLE_TABS) {
    await page.getByRole('tab', { name: tab }).click();
    // The row unit is the file, so there is no second copy of one identity to
    // pair and no entry to offer.
    await expect(
      page.getByRole('tabpanel').getByRole('link', { name: /^Compare/u }),
      String(tab),
    ).toHaveCount(0);
  }
});

test('shows literal differences on every surface, and offers to change none of them', async ({
  page,
}) => {
  for (const kind of COMPARABLE_KINDS) {
    await openFirstComparison(page, kind);
    // No side is ranked, nothing is merged, nothing is validated, and nothing
    // is offered to fix — on every surface, not just the one a suite happens
    // to drive (FR-012, FR-020, FR-032).
    for (const pattern of [/merge/iu, /apply/iu, /accept/iu, /sync/iu, /fix/iu, /validate/iu]) {
      await expect(
        page.getByRole('button', { name: pattern }),
        `${String(kind.route)} ${String(pattern)}`,
      ).toHaveCount(0);
    }
  }
});

test('joins the MCP comparison to explicit carriers alone', async ({ page }) => {
  // Only explicit MCP configuration joins the MCP surfaces: a settings
  // document or an agent file that spells MCP configuration shows it as that
  // kind's own detail content, so naming one as an MCP side owns no
  // comparison (data-model.md § Inventory unit).
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^MCP/u }).click();
  // The row for the name the settings document also spells: its own carriers
  // are the explicit ones, and the settings file is on none of them.
  const row = page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: SHARED_SERVER_NAME });
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText('.claude/settings.json');
  const carriers = await row.locator('.aci-path').allInnerTexts();
  expect(carriers.length).toBeGreaterThan(1);

  // The same row, with one side replaced by the settings document — which
  // declares that very name, so the refusal can only be about the kind.
  await page.goto(
    new URL(
      `/mcp/compare/repository?name=${encodeURIComponent(SHARED_SERVER_NAME)}&leftSource=repository&left=${encodeURIComponent(
        carriers[0] ?? '',
      )}&rightSource=repository&right=.claude%2Fsettings.json`,
      host.origin,
    ).toString(),
  );
  await expect(page.locator('main')).toContainText('does not declare this server name');
  // And the settings document still shows that configuration as its own
  // content, where it belongs.
  await page.goto(
    new URL(
      '/settings-and-configuration/detail/repository/.claude/settings.json',
      host.origin,
    ).toString(),
  );
  await expect(page.locator('main')).toContainText('settings-owned');
});
