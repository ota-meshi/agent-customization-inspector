// T171: browser acceptance for the Copilot SKILL detail (Phase 11 "Copilot
// Skill Detail"). Launches the packaged CLI against a three-vendor fixture and
// verifies the complete inert Copilot detail while the Codex and Claude
// details beside it keep their own behavior.
//
// The claims here can only be made against a rendered page: that the complete
// source — a literal credential and an environment reference included — is
// shown exactly as authored with no masking or reveal control and no
// process-environment substitution even while the referenced variable is set
// in the host's environment, that a shared physical file opens as each
// product's own definition with that product's own documented invocation
// name, that the Copilot detail states nothing about VS Code, CLI, or Cloud
// selection (what a vendor documents about its runtime stays in its
// maintained contract, FR-009), and that a malformed shared skill keeps its
// readable source while the one shared parse failure is stated once.
//
// The visible checkpoint of this milestone: Copilot SKILL detail exposes the
// addressed definition — never a merged product-neutral one — through the
// same inert detail surface the other vendors use.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, shown exactly as written. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOT0000000000000000000000000000';
/** An environment reference the product must never resolve. */
const FIXTURE_ENV_REFERENCE = '$ACI_E2E_TOKEN';
/**
 * The value `ACI_E2E_TOKEN` actually has in the host's process environment
 * while these tests run. It must never appear anywhere in a rendered page:
 * the authored reference text is what the product shows (FR-026).
 */
const ENV_SENTINEL = 'aci-e2e-resolved-sentinel-value';

let fixture: string;
let host: LaunchedHost;

/** Writes one authored fixture file, creating parents. */
async function author(relative: string, content: string): Promise<void> {
  await mkdir(join(fixture, relative, '..'), { recursive: true });
  await writeFile(join(fixture, relative), content, 'utf8');
}

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-detail-'));
  // The Copilot-only skill: `.github` is no other product's spelling. Its
  // frontmatter carries the literal credential and the environment reference
  // the display claims are made against.
  await author(
    '.github/skills/ship/SKILL.md',
    [
      '---',
      'name: github-ship',
      `description: "deploy with ${FIXTURE_SECRET} and ${FIXTURE_ENV_REFERENCE}"`,
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# Ship',
      '',
      'Launch checklist.',
      '',
    ].join('\n'),
  );
  await author('.github/skills/ship/reference.md', 'ship reference notes\n');
  // The shared spellings: one physical file per directory, admitted by
  // Copilot and by the sharing product. The authored names differ from the
  // skill directories so the per-tool invocation names are tellable apart.
  await author(
    '.agents/skills/orbit/SKILL.md',
    '---\nname: orbit-skill\ndescription: shared with Codex\n---\n\n# Orbit\n',
  );
  await author(
    '.claude/skills/lander/SKILL.md',
    '---\nname: lander-skill\ndescription: shared with Claude\n---\n\n# Lander\n',
  );
  // A shared skill whose frontmatter cannot be parsed. Extraction is
  // all-or-nothing and runs once per physical file, so both products' details
  // state the one failure while the complete source stays readable (FR-028).
  await author('.claude/skills/broken/SKILL.md', '---\nname: [unterminated\n---\n\n# Broken\n');
  // A Copilot-vs-Copilot collision: two root files declaring one name, so the
  // committed inventory row states the surface-dependent rule — which the
  // detail must not restate.
  await author('.github/skills/echo/SKILL.md', '---\nname: voyage\n---\n\n# Echo\n');
  await author('.claude/skills/probe/SKILL.md', '---\nname: voyage\n---\n\n# Probe\n');
  // The environment variable the fixture references, set for the host's own
  // process: the strongest form of the non-resolution claim is made with the
  // value actually present to leak.
  process.env['ACI_E2E_TOKEN'] = ENV_SENTINEL;
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  delete process.env['ACI_E2E_TOKEN'];
  await rm(fixture, { recursive: true, force: true });
});

/** Opens one definition's detail route directly by its stable identity. */
async function openDefinition(
  page: import('@playwright/test').Page,
  tool: string,
  path: string,
): Promise<void> {
  await page.goto(new URL(`/skills/${tool}/${path}`, host.origin).href);
}

test('shows the literal credential and environment reference with no mask, reveal, or substitution', async ({
  page,
}) => {
  await openDefinition(page, 'copilot', '.github/skills/ship/SKILL.md');
  // The Skill tab's declarations carry the credential too, and a hidden
  // panel's controls are outside the accessibility tree the role query
  // reads — so the no-reveal claim is asserted on each tab in turn, while
  // that tab is the visible one (FR-026, FR-027). That this tab *is* the
  // visible one is asserted first: `toContainText` alone passes against a
  // hidden panel, and a regressed default tab would silently turn both
  // checks into Files-tab checks.
  await expect(page.getByRole('tab', { name: /^skill/iu })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const declarations = page.locator('.aci-skill-detail__declarations');
  await expect(declarations).toBeVisible();
  await expect(declarations).toContainText(FIXTURE_SECRET);
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  await page.getByRole('tab', { name: /^files/iu }).click();
  // The complete authored source, credential and environment reference
  // included, with nothing standing in front of it.
  const viewer = page.locator('.aci-skill-detail__main .aci-source-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText('# Ship');
  // The end of the file as well as its head: a truncated read would keep
  // every assertion above passing while dropping the tail (FR-025).
  await expect(viewer).toContainText('Launch checklist.');
  await expect(viewer).toContainText(FIXTURE_SECRET);
  await expect(viewer).toContainText(FIXTURE_ENV_REFERENCE);
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  const text = await page.locator('main').innerText();
  expect(text).toContain(FIXTURE_SECRET);
  expect(text).not.toContain('••••');
  expect(text).not.toContain('ghp_****');
  // The variable is set in the host's environment, and its value still
  // reaches no response: the authored `$ACI_E2E_TOKEN` is the display.
  expect(text).not.toContain(ENV_SENTINEL);
});

test('leads with the addressed Copilot definition and its authored invocation name', async ({
  page,
}) => {
  await openDefinition(page, 'copilot', '.github/skills/ship/SKILL.md');
  // The heading is the row's own name; the invocation name beside it is
  // Copilot's — the authored identity, because Copilot invokes the authored
  // `name` rather than a path-derived command (FR-007).
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('github-ship');
  await expect(page.locator('.aci-skill-detail__invocation-name')).toHaveText(
    'Invocation name: github-ship',
  );
  await expect(page.locator('.aci-skill-detail__definition')).toHaveText(
    'GitHub Copilot (VS Code, CLI, Cloud agent) · Skill',
  );
  // Every key the file declares, as one YAML document in the read-only
  // viewer, credential-shaped keys included — nothing captioned,
  // classified, or withheld (FR-007).
  const declarations = page.locator('.aci-skill-detail__declarations');
  await expect(declarations).toContainText('name: github-ship');
  await expect(declarations).toContainText(`deploy with ${FIXTURE_SECRET}`);
  await expect(declarations).toContainText(`api_key: ${FIXTURE_SECRET}`);
});

test('opens a shared .claude file as each product’s own definition', async ({ page }) => {
  // One physical file, two recognitions, two routes. The Copilot definition
  // invokes the authored name; the Claude definition invokes the
  // directory-derived command. Neither route shows a merged product-neutral
  // record, which is what keeps incompatible naming facts apart (FR-007).
  await openDefinition(page, 'copilot', '.claude/skills/lander/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('lander-skill');
  await expect(page.locator('.aci-skill-detail__definition')).toHaveText(
    'GitHub Copilot (VS Code, CLI, Cloud agent) · Skill',
  );
  await expect(page.locator('.aci-skill-detail__invocation-name')).toHaveText(
    'Invocation name: lander-skill',
  );

  await openDefinition(page, 'claude', '.claude/skills/lander/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('lander-skill');
  await expect(page.locator('.aci-skill-detail__definition')).toHaveText(
    'Claude Code (CLI and IDE clients) · Skill',
  );
  await expect(page.locator('.aci-skill-detail__invocation-name')).toHaveText(
    'Invocation name: lander',
  );
});

test('retains the Codex detail of a shared .agents file beside the Copilot one', async ({
  page,
}) => {
  await openDefinition(page, 'codex', '.agents/skills/orbit/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('orbit-skill');
  await expect(page.locator('.aci-skill-detail__definition')).toHaveText(
    'OpenAI Codex (Local clients) · Skill',
  );

  await openDefinition(page, 'copilot', '.agents/skills/orbit/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('orbit-skill');
  await expect(page.locator('.aci-skill-detail__definition')).toHaveText(
    'GitHub Copilot (VS Code, CLI, Cloud agent) · Skill',
  );
});

test('states nothing about Copilot’s selection, even for a collision', async ({ page }) => {
  // `.github/skills/echo` and `.claude/skills/probe` both declare `voyage`,
  // so the committed inventory row states Copilot's surface-dependent rule —
  // the case a regression would leak into the detail. This page addresses one
  // definition and restates none of it: whether a surface would select this
  // skill depends on a runtime the Inspector never observes, and what each
  // surface documents stays in Copilot's maintained contract (FR-009).
  //
  // The surfaces themselves are not the claim being watched for: the
  // definition line names the ones its admissions rest on, which says where
  // Copilot documents reading the file and nothing about which of them won.
  // The text is read from the whole detail, hidden panel included.
  await openDefinition(page, 'copilot', '.github/skills/echo/SKILL.md');
  await expect(page.locator('.aci-skill-detail h2')).toHaveText('voyage');
  await expect(page.locator('.aci-skill-detail__definition')).toHaveCount(1);
  await expect(page.locator('.aci-skill-detail__definition')).toHaveText(
    'GitHub Copilot (VS Code, CLI, Cloud agent) · Skill',
  );
  const detail = (await page.locator('.aci-skill-detail').textContent()) ?? '';
  for (const claim of [
    'depends on the surface',
    'uses the first in its documented source order',
    'keeps all of them',
    'progressively',
  ]) {
    expect(detail).not.toContain(claim);
  }
});

test('keeps a malformed shared skill readable while the one parse failure is stated once', async ({
  page,
}) => {
  // Extraction ran once for the shared physical file, so each product's route
  // shows the same single failure record with the open file — never one per
  // recognizing product — while the complete source stays displayed (FR-028).
  for (const [tool, invocation] of [
    ['copilot', null],
    ['claude', 'Invocation name: broken'],
  ] as const) {
    await openDefinition(page, tool, '.claude/skills/broken/SKILL.md');
    // A failed extraction leaves the Skill panel nothing to show, so the page
    // itself selects the Files tab; the source and the failure must be where
    // the reader actually is, which is why each is asserted visible rather
    // than merely attached behind a hidden panel.
    await expect(page.getByRole('tab', { name: /^files/iu })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const viewer = page.locator('.aci-skill-detail__main .aci-source-viewer');
    await expect(viewer).toBeVisible();
    await expect(viewer).toContainText('# Broken');
    const failure = page.locator('.aci-skill-detail__main li', {
      hasText: 'This file could not be parsed',
    });
    await expect(failure).toHaveCount(1);
    await expect(failure).toBeVisible();
    // The invocation names stay each tool's own on the failed path: a failed
    // parse leaves Copilot's authored invocation unknown, so its route shows
    // no invocation line, while Claude Code's path-derived command stands
    // (FR-007, FR-028; `skill-naming.ts`).
    if (invocation === null) {
      await expect(page.locator('.aci-skill-detail__invocation-name')).toHaveCount(0);
    } else {
      await expect(page.locator('.aci-skill-detail__invocation-name')).toHaveText(invocation);
    }
  }
});
