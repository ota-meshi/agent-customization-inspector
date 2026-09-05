// T1143 browser acceptance for the shell palette: the boundaries that identify
// a component or its state measure 3:1 against the surfaces on either side of
// them, the reader's chosen scheme moves the whole palette, and forced colours
// hand every token back to the platform.
//
// Measured in a real engine rather than computed from the stylesheet, because
// what the criterion is about is the colour that reaches the screen: the tokens
// are `light-dark()` values resolved against the root's `color-scheme`, and
// whether a given revision resolves them — and what its forced-colors mode
// substitutes — is a fact about that revision rather than about this code
// (AGENTS.md § Platform baseline policy).
//
// The ratios are recomputed here rather than asserted against the numbers in
// `main.css`: a check that read its expectation from the source it is checking
// would pass whatever that source said (AGENTS.md § Implementation simplicity
// policy, on a freeze that cannot fail). What is written out here is the
// threshold WCAG 1.4.11 sets, which is not this repository's to change.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-palette-'));
  // The palette belongs to the shell, so what the inventory holds is
  // irrelevant: a file no shipped rule admits keeps the page to the shell.
  await writeFile(join(fixture, 'NOTES.md'), '# fixture notes\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** WCAG 1.4.11: a boundary that identifies a component or its state. */
const NON_TEXT_CONTRAST = 3;

/** WCAG 1.4.3 at this type size: body text and the muted notes beside it. */
const TEXT_CONTRAST = 4.5;

/** The tokens every measurement below is taken between. */
const TOKENS = [
  '--aci-surface',
  '--aci-surface-raised',
  '--aci-surface-sunken',
  '--aci-text',
  '--aci-muted',
  '--aci-line',
  '--aci-hairline',
  '--aci-accent',
  '--aci-accent-soft',
  '--aci-on-accent',
  '--aci-warn',
  '--aci-brand-copilot',
  '--aci-brand-claude',
  '--aci-brand-codex',
] as const;

/** One reading of the palette: each token as the engine actually resolved it. */
type Palette = Readonly<Record<(typeof TOKENS)[number], string>>;

/**
 * Reads every token as a resolved colour. `getComputedStyle` returns a custom
 * property's substitution value verbatim — `light-dark(...)` as written — so
 * each one is resolved through a real declaration on a probe element instead,
 * which is what makes this a measurement of the paint rather than of the text.
 */
async function readPalette(page: Page): Promise<Palette> {
  return page.evaluate((tokens) => {
    const probe = document.createElement('span');
    probe.style.display = 'none';
    document.documentElement.append(probe);
    const read = (token: string): string => {
      probe.style.color = `var(${token})`;
      return globalThis.getComputedStyle(probe).color;
    };
    const palette = Object.fromEntries(tokens.map((token) => [token, read(token)]));
    probe.remove();
    return palette as Record<string, string>;
  }, TOKENS) as Promise<Palette>;
}

/** The sRGB channels of a resolved `rgb(...)` / `color(...)` string. */
function channels(color: string): readonly [number, number, number] {
  const numbers = color.match(/[\d.]+/gu);
  expect(numbers, `unreadable colour: ${color}`).not.toBeNull();
  const [red, green, blue] = numbers!.map(Number);
  return [red!, green!, blue!];
}

/** WCAG relative luminance of a resolved colour. */
function luminance(color: string): number {
  const linear = (channel: number): number => {
    const scaled = channel / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = channels(color);
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** WCAG contrast ratio between two resolved colours. */
function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].toSorted((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/**
 * Every pair the criteria reach, checked in one scheme. The identifying line is
 * measured against all three surfaces because a boundary is drawn on each of
 * them; the hairline deliberately is not, being a line inside a box that line
 * has already identified (`main.css` § tokens).
 */
function expectCriteriaMet(palette: Palette, scheme: string): void {
  for (const surface of [
    '--aci-surface',
    '--aci-surface-raised',
    '--aci-surface-sunken',
  ] as const) {
    expect(
      contrast(palette['--aci-line'], palette[surface]),
      `${scheme}: --aci-line against ${surface}`,
    ).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST);
    expect(
      contrast(palette['--aci-accent'], palette[surface]),
      `${scheme}: --aci-accent against ${surface}`,
    ).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST);
    expect(
      contrast(palette['--aci-text'], palette[surface]),
      `${scheme}: --aci-text against ${surface}`,
    ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(
      contrast(palette['--aci-muted'], palette[surface]),
      `${scheme}: --aci-muted against ${surface}`,
    ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  }
  // The accent fill carries the product's own text, and a partial status is a
  // word as well as a border.
  expect(
    contrast(palette['--aci-on-accent'], palette['--aci-accent']),
    `${scheme}: --aci-on-accent against --aci-accent`,
  ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  expect(
    contrast(palette['--aci-warn'], palette['--aci-surface-sunken']),
    `${scheme}: --aci-warn against --aci-surface-sunken`,
  ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
}

test('meets the contrast criteria in both schemes, and the scheme moves the whole palette', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(host.origin);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const light = await readPalette(page);
  expectCriteriaMet(light, 'light');

  await page.emulateMedia({ colorScheme: 'dark' });
  // The reader has chosen nothing, so the system preference decides — and the
  // client expresses it as a class on the root (`composables/color-scheme.ts`),
  // which the tokens are resolved against. Waiting for the class rather than
  // reading straight after the emulation is what keeps this a measurement of
  // the settled page instead of a race with one render.
  await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/u);
  const dark = await readPalette(page);
  expectCriteriaMet(dark, 'dark');

  // Every token moves, which is what a one-property switch has to prove: a
  // token left behind in a scheme change is a value someone wrote outside
  // `light-dark()` and nobody noticed, and it would be unreadable in one of
  // the two schemes rather than merely off-palette.
  for (const token of TOKENS) {
    expect(dark[token], `${token} did not move with the scheme`).not.toBe(light[token]);
  }

  await page.emulateMedia({ colorScheme: null });
});

test('hands the whole palette back to the platform under forced colours', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const chosen = await readPalette(page);

  await page.emulateMedia({ forcedColors: 'active' });
  // Emulation that the engine does not apply would leave this test asserting
  // the ordinary palette against itself, which is the one outcome it must not
  // report as a pass.
  const active = await page.evaluate(
    () => globalThis.matchMedia('(forced-colors: active)').matches,
  );
  test.skip(!active, 'this revision does not apply the forced-colors emulation');

  const forced = await readPalette(page);
  // Not "every token changed": a platform palette may land on a value this
  // repository also chose. What the block owes is that no token is still the
  // product's own choice by construction — each names a system colour — so the
  // observable claim is that the surfaces and the text separated into the
  // platform's two, and that the marks stopped being three colours.
  expect(forced['--aci-surface'], 'the page surface is the platform Canvas').toBe(
    forced['--aci-surface-raised'],
  );
  expect(forced['--aci-surface-sunken']).toBe(forced['--aci-surface-raised']);
  expect(forced['--aci-line'], 'a boundary is the platform CanvasText').toBe(forced['--aci-text']);
  expect(forced['--aci-hairline']).toBe(forced['--aci-text']);
  expect(
    new Set([
      forced['--aci-brand-copilot'],
      forced['--aci-brand-claude'],
      forced['--aci-brand-codex'],
    ]).size,
    'the vendor marks return to one platform colour',
  ).toBe(1);
  expect(
    contrast(forced['--aci-text'], forced['--aci-surface']),
    'the platform palette still separates text from its surface',
  ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  // The block actually applied. Not "a token changed value": the emulation
  // turns the media feature on without installing a high-contrast theme, so
  // the platform's `Canvas` is still the ordinary white this palette also
  // chose, and a value comparison would report a substitution that had not
  // happened. What cannot coincide is the collapse — the selected fill and the
  // page surface are two different colours in the palette above and one
  // system colour here.
  expect(chosen['--aci-accent-soft']).not.toBe(chosen['--aci-surface']);
  expect(forced['--aci-accent-soft'], 'the selected fill returned to Canvas').toBe(
    forced['--aci-surface'],
  );

  await page.emulateMedia({ forcedColors: null });
});
