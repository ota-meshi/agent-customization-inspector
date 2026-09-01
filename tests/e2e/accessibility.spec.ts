// T1045: the cross-story WCAG 2.2 Level A/AA automated layer. Every test here
// is titled with the exact stable `AUTO-*` ID the acceptance matrix names, and
// the matrix requires each of them to run in all three Playwright projects
// against the packaged release candidate
// (contracts/accessibility-acceptance.md § Stable check IDs and execution
// locations; SC-008).
//
// Two rules from that contract shape this file:
//
//   - No severity escape. axe findings are asserted empty; nothing filters by
//     `impact`, and no rule is disabled to make a run pass. A rule that does
//     not apply to a surface is excluded by scoping the scan to the surface,
//     never by silencing the rule.
//   - Automated evidence never replaces a required `MANUAL-*` check. The rows
//     that name both require both, so what a test here proves is the automated
//     half of its row and nothing more.
//
// The fixture is the all-kind repository the dev launcher serves, so one launch
// exercises every inventory this release publishes; a criterion that needs a
// second surface opens it from this one.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { buildAllCustomizationKindFixture } from '../fixtures/repositories/build-fixtures';
import { tabUntilFocused } from './keyboard';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The four primary workflows SC-008 requires to be keyboard-operable. */
const PRIMARY_WORKFLOWS = ['discovery', 'inspection', 'comparison', 'global-consent'] as const;

let fixture: { readonly root: string };
let host: LaunchedHost;

// Not serial: `playwright.config.ts` already runs one worker with
// `fullyParallel: false`, so the shared launch is safe, and serial mode would
// stop the file at the first failure — hiding every other criterion's result
// from a record the matrix requires to be complete.

test.beforeAll(async () => {
  fixture = buildAllCustomizationKindFixture('aci-accessibility');
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
});

/** Opens the committed inventory and waits for it to be operable. */
async function openInventory(page: Page): Promise<void> {
  await page.goto(host.origin);
  // The all-kind fixture carries deterministic file-confined outcomes, so its
  // generation commits `Partial` rather than complete; what this waits for is
  // that a generation committed at all and its controls are operable.
  await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation');
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rescan repository' })).toBeEnabled();
}

/**
 * Runs axe over the current page for the given WCAG tags and returns its
 * violations. Nothing is filtered: the caller asserts the list is empty.
 */
async function axeViolations(
  page: Page,
  tags: readonly string[],
): Promise<readonly { readonly id: string; readonly help: string }[]> {
  const results = await new AxeBuilder({ page }).withTags([...tags]).analyze();
  return results.violations.map((violation) => ({ id: violation.id, help: violation.help }));
}

/** Fails with the offending rule IDs rather than with a bare count. */
function expectNoViolations(
  violations: readonly { readonly id: string; readonly help: string }[],
  checkId: string,
): void {
  expect(
    violations.map((violation) => `${violation.id}: ${violation.help}`),
    checkId,
  ).toEqual([]);
}

test('AUTO-1.1.1 every non-text control carries an equivalent accessible name', async ({
  page,
}) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag111']), 'AUTO-1.1.1');
  // The scheme switch is the page's one icon-only control, so its name has to
  // come from somewhere other than its visible text.
  const accessibleName = await page
    .locator('.aci-color-scheme-switch')
    .first()
    .evaluate((element) => element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '');
  expect(accessibleName.length).toBeGreaterThan(0);
});

test('AUTO-1.3.1 structure is programmatically represented', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag131']), 'AUTO-1.3.1');
  // The kind rail is a tablist over tabpanels, not a row of styled buttons.
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
});

test('AUTO-1.3.2 DOM order carries the intended reading order', async ({ page }) => {
  await openInventory(page);
  // Source facts precede the inventory they describe, and the inventory
  // precedes the diagnostics collected while producing it.
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('h2')].map((heading) => heading.textContent?.trim() ?? ''),
  );
  expect(order).toEqual(['Repository', 'Customization files', 'Diagnostics']);
});

test('AUTO-1.3.4 the inventory operates in portrait and landscape', async ({ page }) => {
  for (const viewport of [
    { width: 900, height: 1400 },
    { width: 1400, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await openInventory(page);
    await expect(page.getByRole('tablist')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rescan repository' })).toBeEnabled();
  }
});

test('AUTO-1.4.1 meaning never rests on colour alone', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag141']), 'AUTO-1.4.1');
  // A row names its recognizing product in text; the badge colour is not the
  // only carrier of which tool reads the file.
  await expect(page.locator('.aci-item').first()).not.toBeEmpty();
  const firstRowText = await page.locator('.aci-item').first().innerText();
  expect(firstRowText.trim().length).toBeGreaterThan(0);
});

test('AUTO-1.4.3 text contrast passes in light and dark presentations', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await openInventory(page);
    expectNoViolations(await axeViolations(page, ['wcag143']), `AUTO-1.4.3 (${colorScheme})`);
  }
  await page.emulateMedia({ colorScheme: null });
});

test('AUTO-1.4.3 text contrast passes in the forced-colors presentation', async ({ page }) => {
  // The third presentation the row names. In forced colors the platform
  // replaces the palette, so what this proves is that the page keeps every
  // control and its text present and operable under that substitution rather
  // than relying on a colour the system has taken away.
  await page.emulateMedia({ forcedColors: 'active' });
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag143']), 'AUTO-1.4.3 (forced-colors)');
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rescan repository' })).toBeEnabled();
  await page.emulateMedia({ forcedColors: null });
});

test('reduced motion is honoured, which is what REVIEW-2.2.2 rests on', async ({ page }) => {
  // Deliberately not an `AUTO-*` ID: the acceptance matrix defines a stable ID
  // per Level A/AA criterion, and 2.3.3 Animation from Interactions is AAA and
  // has no row. Naming one here would invent an ID the contract does not
  // define, which the matrix rejects outright. What this covers is the fact
  // 2.2.2's Not-applicable rationale rests on — nothing moves or auto-updates —
  // so the rationale fails here if the page starts animating.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openInventory(page);
  const animated = await page.evaluate(
    () =>
      [...document.querySelectorAll('*')].filter((element) => {
        const style = getComputedStyle(element);
        return (
          (style.animationName !== 'none' && style.animationDuration !== '0s') ||
          (style.transitionDuration !== '0s' && style.transitionProperty !== 'none')
        );
      }).length,
  );
  expect(animated, 'elements still animate under prefers-reduced-motion').toBe(0);
  await page.emulateMedia({ reducedMotion: null });
});

test('AUTO-1.4.4 text stays readable and operable at 200% zoom', async ({ page }) => {
  // Two ways a reader reaches 200%, because the criterion covers both and they
  // stress different things. Browser zoom halves the CSS viewport while leaving
  // every CSS length alone, which is what the halved viewport reproduces
  // exactly; text enlargement leaves the viewport alone and doubles the text,
  // which the root font size reproduces. Only the second can clip a control
  // against a fixed height, so a test that did the first alone would report the
  // easier half.
  for (const presentation of ['browser-zoom', 'text-enlargement'] as const) {
    await page.setViewportSize(
      presentation === 'browser-zoom' ? { width: 640, height: 360 } : { width: 1280, height: 720 },
    );
    await openInventory(page);
    if (presentation === 'text-enlargement') {
      await page.addStyleTag({ content: ':root { font-size: 200% !important; }' });
    }

    await expect(page.getByRole('tablist'), presentation).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Rescan repository' }),
      presentation,
    ).toBeEnabled();
    await expect(page.locator('.aci-inventory-filters'), presentation).toBeVisible();

    // No loss of content: nothing is cut off horizontally, and no element hides
    // text inside a box it cannot scroll.
    const clipped = await page.evaluate(() => {
      const offenders: string[] = [];
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
        offenders.push('the page scrolls horizontally');
      }
      for (const element of document.querySelectorAll('button, a, h1, h2, h3, label, p')) {
        const style = getComputedStyle(element);
        if (style.overflow !== 'hidden' && style.overflowY !== 'hidden') continue;
        // The visually-hidden idiom is a 1x1 clipped box that exists for
        // assistive technology alone — the live regions are the page's two.
        // Its text overflowing is the point of it, not a loss of content.
        const rect = element.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) continue;
        if (element.scrollHeight > element.clientHeight + 1) {
          offenders.push(`${element.tagName.toLowerCase()} clips its own text`);
        }
      }
      return offenders;
    });
    expect(clipped, presentation).toEqual([]);
  }
});

test('AUTO-1.4.10 primary content reflows without two-dimensional scrolling', async ({ page }) => {
  // The WCAG reference width, at which the page must not scroll horizontally.
  await page.setViewportSize({ width: 320, height: 900 });
  await openInventory(page);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows, 'the page body scrolls horizontally at 320 CSS pixels').toBe(false);
});

test('AUTO-1.4.11 non-text contrast passes for controls and indicators', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag1411']), 'AUTO-1.4.11');
});

test('AUTO-1.4.12 required text-spacing overrides clip nothing', async ({ page }) => {
  await openInventory(page);
  await page.addStyleTag({
    content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`,
  });
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows, 'text-spacing overrides push content off the page').toBe(false);
  await expect(page.getByRole('button', { name: 'Rescan repository' })).toBeEnabled();
});

test('AUTO-1.4.13 no hover or focus content requiring dismissal exists', async ({ page }) => {
  await openInventory(page);
  // The release's position is that it ships none: a `title` attribute is the
  // one form the platform would produce, and none is authored.
  const titled = await page.evaluate(() => document.querySelectorAll('[title]').length);
  expect(titled).toBe(0);
  const popovers = await page.evaluate(() => document.querySelectorAll('[popover]').length);
  expect(popovers).toBe(0);
});

test('AUTO-2.1.1 every primary workflow is operable from the keyboard', async ({ page }) => {
  await openInventory(page);
  const reached: string[] = [];

  // discovery: the rescan control the inventory offers.
  await page.locator('h1').focus();
  if (await tabUntilFocused(page, page.getByRole('button', { name: 'Rescan repository' }))) {
    reached.push('discovery');
  }

  // inspection: the first file link in the committed inventory.
  await page.locator('h1').focus();
  if (await tabUntilFocused(page, page.locator('.aci-item a').first(), 80)) {
    reached.push('inspection');
  }

  // comparison: the range's own compare link.
  await page.locator('h1').focus();
  if (await tabUntilFocused(page, page.getByRole('link', { name: /Compare/u }).first(), 120)) {
    reached.push('comparison');
  }

  // global consent: the entry the inventory offers to the personal setup.
  await page.locator('h1').focus();
  if (await tabUntilFocused(page, page.getByRole('link', { name: /personal setup/u }), 40)) {
    reached.push('global-consent');
  }

  expect(reached.toSorted()).toEqual([...PRIMARY_WORKFLOWS].toSorted());
});

test('AUTO-2.1.2 focus enters and leaves every state the row names', async ({ page }) => {
  /** Walks Tab and Shift+Tab from the current position and reports what it reached. */
  const walk = async (presses: number): Promise<ReadonlySet<string>> => {
    const visited = new Set<string>();
    for (let press = 0; press < presses; press += 1) {
      await page.keyboard.press('Tab');
      visited.add(
        await page.evaluate(() => {
          const active = document.activeElement;
          return active === null ? '' : `${active.tagName}#${active.className}`;
        }),
      );
    }
    for (let press = 0; press < presses; press += 1) await page.keyboard.press('Shift+Tab');
    return visited;
  };

  // The inventory: many controls, and the walk must keep moving through them.
  await openInventory(page);
  await page.locator('h1').focus();
  const inventory = await walk(60);
  expect(inventory.size, 'the inventory walk stopped moving').toBeGreaterThan(5);

  // The editor state. Monaco is the one surface here that installs its own key
  // handling, so it is where a trap would actually be: focus must reach the
  // editor and then leave it again by ordinary Tab.
  await page.locator('.aci-item a').first().click();
  await expect(page).not.toHaveURL(`${host.origin}/`);
  await page.locator('h1').focus();
  const detail = await walk(50);
  expect(detail.size, 'the detail walk stopped moving').toBeGreaterThan(3);
  const stuckInEditor = await page.evaluate(
    () => document.activeElement?.closest('.monaco-editor') !== null,
  );
  expect(stuckInEditor, 'focus did not leave the editor').toBe(false);

  // The consent state, which is the one state reached through a decision rather
  // than through a route the inventory already renders.
  await page.goto(new URL('/global-consent', host.origin).href);
  await expect(page.getByRole('heading', { name: /personal setup/iu })).toBeVisible();
  await page.locator('h1').focus();
  const consent = await walk(30);
  expect(consent.size, 'the consent walk stopped moving').toBeGreaterThan(1);
});

test('AUTO-2.4.1 repeated navigation can be bypassed', async ({ page }) => {
  await openInventory(page);
  // The shell repeats no navigation block before the main content: the routed
  // content is the first thing after the masthead, so there is nothing to skip
  // past. The check is that no navigation landmark precedes the content.
  const precedingNavigation = await page.evaluate(() => document.querySelectorAll('nav').length);
  expect(precedingNavigation).toBe(0);
  await expect(page.locator('main')).toBeVisible();
});

test('AUTO-2.4.2 every route exposes a descriptive document title', async ({ page }) => {
  await openInventory(page);
  const inventoryTitle = await page.title();
  expect(inventoryTitle.trim().length).toBeGreaterThan(0);
  await page.locator('.aci-item a').first().click();
  await expect(page).not.toHaveURL(`${host.origin}/`);
  expect((await page.title()).trim().length).toBeGreaterThan(0);
});

test('AUTO-2.4.3 focus order stays logical across a route change', async ({ page }) => {
  await openInventory(page);
  await page.locator('.aci-item a').first().click();
  await expect(page).not.toHaveURL(`${host.origin}/`);
  // The detail route starts the reader at the top of the page rather than
  // wherever the previous route's focus happened to sit.
  await page.keyboard.press('Tab');
  const focusedIsInDocument = await page.evaluate(
    () => document.activeElement !== null && document.activeElement !== document.body,
  );
  expect(focusedIsInDocument).toBe(true);
});

test('AUTO-2.4.4 every link exposes its purpose', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag244']), 'AUTO-2.4.4');
  const empty = await page.evaluate(
    () =>
      [...document.querySelectorAll('a')].filter(
        (anchor) =>
          (anchor.textContent ?? '').trim() === '' && anchor.getAttribute('aria-label') === null,
      ).length,
  );
  expect(empty).toBe(0);
});

test('AUTO-2.4.6 headings and labels describe topic or purpose', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag246']), 'AUTO-2.4.6');
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scan status' })).toBeVisible();
});

test('AUTO-2.4.7 keyboard focus is visible', async ({ page }) => {
  await openInventory(page);
  const rescan = page.getByRole('button', { name: 'Rescan repository' });
  await rescan.focus();
  const outline = await rescan.evaluate((element) => {
    const style = getComputedStyle(element);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  });
  expect(outline, 'the focused control renders no outline').not.toBe('none 0px');
});

test('AUTO-2.4.11 the focused component is never entirely obscured', async ({ page }) => {
  await openInventory(page);
  const rescan = page.getByRole('button', { name: 'Rescan repository' });
  await rescan.focus();
  const box = await rescan.boundingBox();
  expect(box).not.toBeNull();
  const covered = await rescan.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return top === null || !(element === top || element.contains(top));
  });
  expect(covered, 'another element covers the focused control').toBe(false);
});

test('AUTO-2.5.2 pointer actions do not complete on the down event', async ({ page }) => {
  await openInventory(page);
  const rescan = page.getByRole('button', { name: 'Rescan repository' });
  const box = await rescan.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  // Moving off the control before releasing cancels the activation: the page
  // uses ordinary click semantics rather than a down-event handler.
  await page.mouse.move(box!.x + box!.width / 2, box!.y - 200);
  await page.mouse.up();
  await expect(rescan).toBeEnabled();
});

test('AUTO-2.5.3 a visible label is contained in the accessible name', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag253']), 'AUTO-2.5.3');
});

test('AUTO-2.5.8 pointer targets meet the minimum size or a recorded exception', async ({
  page,
}) => {
  await openInventory(page);
  // The criterion itself, not a simplification of it: a target passes at
  // 24x24, or under the inline exception, or under the spacing exception —
  // 24 CSS pixel circles centred on each undersized target's bounding box that
  // intersect nothing. Anything left is a real failure
  // (contracts/accessibility-acceptance.md § 2.5.8).
  const offenders = await page.evaluate(() => {
    const targets = [...document.querySelectorAll('a, button, select, input, [role="tab"]')]
      .map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
        display: getComputedStyle(element).display,
      }))
      .filter(({ rect }) => rect.width > 0 || rect.height > 0);

    const centre = (rect: DOMRect): { x: number; y: number } => ({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    const failures: string[] = [];
    for (const target of targets) {
      if (target.rect.width >= 24 && target.rect.height >= 24) continue;
      // Inline exception: the target sits in a line of text, so its size is
      // constrained by that text rather than chosen for it.
      if (target.display.startsWith('inline')) continue;
      const own = centre(target.rect);
      const spacingClear = targets.every((other) => {
        if (other.element === target.element) return true;
        const theirs = centre(other.rect);
        const distance = Math.hypot(own.x - theirs.x, own.y - theirs.y);
        // Two 24-pixel circles clear each other at 24 pixels between centres;
        // against a full-size target the circle only has to clear its box.
        const clearance =
          other.rect.width >= 24 && other.rect.height >= 24
            ? 12 + Math.min(other.rect.width, other.rect.height) / 2
            : 24;
        return distance >= clearance;
      });
      if (spacingClear) continue;
      failures.push(
        `${target.element.tagName.toLowerCase()} "${(target.element.textContent ?? '')
          .trim()
          .slice(0, 30)}" ${Math.round(target.rect.width)}x${Math.round(target.rect.height)}`,
      );
    }
    return failures;
  });
  expect(offenders).toEqual([]);
});

test('AUTO-3.1.1 the shell declares the one language it ships', async ({ page }) => {
  await openInventory(page);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
});

test('AUTO-3.2.1 receiving focus alone never changes context', async ({ page }) => {
  await openInventory(page);
  const before = page.url();
  await page.locator('.aci-item a').first().focus();
  await page.getByRole('button', { name: 'Rescan repository' }).focus();
  expect(page.url()).toBe(before);
});

test('AUTO-3.2.2 input changes have predictable effects', async ({ page }) => {
  await openInventory(page);
  const before = new URL(page.url()).pathname;
  // Typing into the path filter narrows the list in place. The filter writes
  // itself to the query so a reload or a pasted link renders the same list
  // (T187), which is not a change of context: the route, the heading, and the
  // controls are the ones the reader was already using.
  await page.locator('.aci-inventory-filters input').first().fill('CLAUDE');
  await expect(page).toHaveURL(/[?&]path=CLAUDE/u);
  expect(new URL(page.url()).pathname).toBe(before);
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
  await expect(page.getByRole('tabpanel')).toBeVisible();
});

test('AUTO-3.2.3 repeated navigation keeps its relative order', async ({ page }) => {
  await openInventory(page);
  const first = await page.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim() ?? ''),
  );
  await page.reload();
  await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation');
  const second = await page.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim() ?? ''),
  );
  expect(second).toEqual(first);
});

test('AUTO-3.2.4 components with the same function are identified consistently', async ({
  page,
}) => {
  await openInventory(page);
  // Every kind rail entry is a tab, named by its kind and its count; none of
  // them is a link or a plain button while the others are tabs.
  const roles = await page.evaluate(() =>
    [...document.querySelectorAll('.aci-inventory-kind-tabs__tab')].map((tab) =>
      tab.getAttribute('role'),
    ),
  );
  expect(roles.length).toBeGreaterThan(0);
  expect(new Set(roles)).toEqual(new Set(['tab']));
});

test('AUTO-3.3.1 an error is identified in text', async ({ page }) => {
  await openInventory(page);
  // The shell's assertive region is where a workflow error is identified, and
  // it exists before one occurs so the announcement is not a new node.
  await expect(page.locator('.aci-live-region[role="alert"]')).toHaveCount(1);
});

test('AUTO-3.3.2 controls carry labels before input', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag332']), 'AUTO-3.3.2');
  const unlabelled = await page.evaluate(
    () =>
      [...document.querySelectorAll('input, select')].filter((field) => {
        const id = field.getAttribute('id');
        const labelled =
          field.getAttribute('aria-label') !== null ||
          field.getAttribute('aria-labelledby') !== null ||
          (id !== null && document.querySelector(`label[for="${id}"]`) !== null) ||
          field.closest('label') !== null;
        return !labelled;
      }).length,
  );
  expect(unlabelled).toBe(0);
});

test('AUTO-3.3.3 a diagnostic offers a practical next step', async ({ page }) => {
  await openInventory(page);
  // The all-kind fixture commits partial: its deterministic file-confined
  // outcomes publish diagnostics. A file-scoped record is stated on its own
  // row, so the scan status is where the reader is told where to look — the
  // practical next step this criterion asks for.
  await expect(page.locator('.aci-scan-progress')).toContainText('Partial');
  await expect(page.locator('.aci-scan-progress')).toContainText('kept a diagnostic of their own');
  // The source-level list states its own state rather than leaving the section
  // blank, so a reader is never left guessing whether it failed to render.
  await expect(page.getByText('No source-level diagnostics.')).toBeVisible();
});

test('AUTO-3.3.8 opening the printed session URL requires no authentication', async ({ page }) => {
  const response = await page.goto(host.origin);
  expect(response?.status()).toBe(200);
  // No credential field, no puzzle, no transcription step stands between the
  // printed URL and the inventory.
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
});

test('AUTO-4.1.2 custom controls expose name, role, and value', async ({ page }) => {
  await openInventory(page);
  expectNoViolations(await axeViolations(page, ['wcag412']), 'AUTO-4.1.2');
  // The rail's selected state is a property, not a class name.
  const selected = await page.evaluate(
    () => document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
  );
  expect(selected).toBe(1);
});

test('AUTO-4.1.3 status changes are announced without forcing focus', async ({ page }) => {
  await openInventory(page);
  // The shell's polite region plus the inventory's own: a status change is
  // announced through a live region rather than by moving focus to it. The
  // assertive region is where an error is announced, and both exist before
  // anything happens, so an announcement is a text change rather than a new
  // node the reader's cursor has to find.
  expect(await page.locator('[role="status"][aria-live="polite"]').count()).toBeGreaterThan(0);
  await expect(page.locator('[role="alert"][aria-live="assertive"]')).toHaveCount(1);

  /** Runs one status change and reports whether the page moved focus. */
  const withoutMovingFocus = async (
    anchor: string,
    change: () => Promise<void>,
  ): Promise<boolean> => {
    const held = page.locator(anchor).first();
    await held.focus();
    await change();
    return held.evaluate((element) => element === document.activeElement);
  };

  // Scan and rescan. Activated from the keyboard: macOS does not focus a button
  // on a mouse click, so a click would test the platform rather than the page.
  const rescan = page.getByRole('button', { name: 'Rescan repository' });
  expect(
    await withoutMovingFocus('button:has-text("Rescan repository")', async () => {
      await page.keyboard.press('Enter');
      await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation');
    }),
    'the rescan announcement moved focus',
  ).toBe(true);
  await expect(rescan).toBeEnabled();

  // The stale state, reached the way a reader reaches it: a link made against a
  // generation whose path the current scan does not hold. The announcement is
  // the state itself, in a polite region.
  await page.goto(
    new URL('/skills/detail/repository/.agents/skills/gone/SKILL.md', host.origin).href,
  );
  await expect(
    page.locator('[role="status"]').filter({ hasText: /Nothing in the current scan/u }),
  ).toHaveCount(1);

  // The comparison state, which announces its own readiness rather than
  // leaving the reader to infer it from the rendered diff.
  await openInventory(page);
  await page
    .getByRole('link', { name: /Compare/u })
    .first()
    .click();
  await expect(page).not.toHaveURL(`${host.origin}/`);
  await expect(
    page.locator('[role="status"]').filter({ hasText: 'Comparison ready.' }),
  ).toHaveCount(1);

  // The Global control state, announced on the consent route the inventory
  // offers.
  await page.goto(new URL('/global-consent', host.origin).href);
  await expect(page.getByRole('heading', { name: /personal setup/iu })).toBeVisible();
  expect(await page.locator('[role="status"][aria-live="polite"]').count()).toBeGreaterThan(0);
});
