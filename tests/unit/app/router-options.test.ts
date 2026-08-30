// @vitest-environment happy-dom
// T049/T1122: the navigation scroll rule in `src/app/router.options.ts` — what
// a page change scrolls to, what a same-page parameter change deliberately
// leaves alone, and what a return to the inventory restores. The claim the
// rule rests on is that the viewport and the focused element arrive together:
// a return focuses the row the reader followed and answers the router with
// that row and the offset it sat at, and anything it cannot restore falls back
// to the top of the page, where the shell has put focus on its heading.
//
// Where that target actually places the document is vue-router's own
// element-relative scroll (`ScrollPositionElement`), asserted end to end
// against the rendered page in `tests/e2e/inventory-return.spec.ts`.
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under the
// Node environment its contract and integration members need.
import { beforeEach, describe, expect, it } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';

import routerOptions, { recordInventoryReturnPoint } from '../../../src/app/router.options';

/**
 * A route double carrying only what the rule reads: the path its page is
 * matched at, and the full path a route with no match falls back to.
 */
function routeAt(matchedPath: string, fullPath = matchedPath): RouteLocationNormalized {
  return { matched: [{ path: matchedPath }], fullPath } as unknown as RouteLocationNormalized;
}

/** The inventory, the one page a return restores for. */
const inventory = routeAt('/');

/** One skill detail, the page a row leads to. */
const skillDetail = routeAt('/skills/detail/repository/:path(.*)*', '/skills/detail/repository/b');

/** Runs the rule for one navigation, the way the router calls it. */
function scrollFor(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  return routerOptions.scrollBehavior(to, from);
}

/**
 * Renders one inventory row link at a fixed distance below the top of the
 * viewport, standing in for the layout happy-dom does not perform. Rendered
 * inside a `data-aci-inventory-rows` container, because the module scopes
 * itself to the containers the inventory marks as holding row links — a link
 * outside one is chrome and records no return point.
 */
function renderLink(href: string, viewportTop: number): HTMLAnchorElement {
  let rows = document.querySelector('[data-aci-inventory-rows]');
  if (rows === null) {
    rows = document.createElement('div');
    rows.setAttribute('data-aci-inventory-rows', '');
    document.body.append(rows);
  }
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.textContent = href;
  link.getBoundingClientRect = () => new DOMRect(0, viewportTop, 320, 24);
  rows.append(link);
  return link;
}

/** Renders one chrome link outside every row container — the consent entry's shape. */
function renderChromeLink(href: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.textContent = href;
  document.body.append(link);
  return link;
}

beforeEach(() => {
  document.body.innerHTML = '';
  // Clears any point a previous case recorded: a departure matching no
  // rendered link is what the module treats as "nothing to return to", and
  // nothing is rendered here.
  recordInventoryReturnPoint('/nothing-rendered');
});

describe('the navigation scroll rule', () => {
  it('leaves a same-page parameter change where the reader put it', () => {
    const companion = routeAt(
      '/skills/detail/repository/:path(.*)*',
      '/skills/detail/repository/scripts/run.sh',
    );

    expect(scrollFor(companion, skillDetail)).toBe(false);
  });

  it('starts a page change at the top, where the shell has put focus', () => {
    expect(scrollFor(skillDetail, inventory)).toEqual({ left: 0, top: 0 });
  });

  it('focuses the followed row and answers it with the offset it was followed from', () => {
    renderLink('/skills/detail/repository/a', 40);
    renderLink('/skills/detail/repository/b', 260);

    recordInventoryReturnPoint('/skills/detail/repository/b');

    // Coming back to a freshly rendered list, where the row now sits somewhere
    // else: the answer names that row and the offset it sat at when it was
    // followed, never where it happens to be now.
    document.body.innerHTML = '';
    const returned = renderLink('/skills/detail/repository/b', 900);

    expect(scrollFor(inventory, skillDetail)).toEqual({ el: returned, top: 260 });
    expect(document.activeElement).toBe(returned);
  });

  it('matches a row whose path holds characters a selector would otherwise read', () => {
    const awkward = renderLink('/rules/detail/repository/.claude/rules/a%5Bb%5D.c%2Bd.md', 120);

    recordInventoryReturnPoint('/rules/detail/repository/.claude/rules/a%5Bb%5D.c%2Bd.md');

    expect(scrollFor(inventory, routeAt('/rules/detail/repository/:path(.*)*'))).toEqual({
      el: awkward,
      top: 120,
    });
  });

  it('starts at the top and moves no focus when the row is no longer listed', () => {
    renderLink('/skills/detail/repository/b', 260);
    recordInventoryReturnPoint('/skills/detail/repository/b');

    // A generation adopted while the reader was away publishes another row in
    // its place; the ordinary page-change rule then stands whole.
    document.body.innerHTML = '';
    const other = renderLink('/skills/detail/repository/c', 260);
    other.focus();

    expect(scrollFor(inventory, skillDetail)).toEqual({ left: 0, top: 0 });
    expect(document.activeElement).toBe(other);
  });

  it('records nothing when the departure matches no rendered link', () => {
    renderLink('/skills/detail/repository/b', 260);

    recordInventoryReturnPoint('/skills/detail/repository/never-rendered');

    expect(scrollFor(inventory, skillDetail)).toEqual({ left: 0, top: 0 });
  });

  it('records nothing for a chrome link and clears the previous row point', () => {
    // The consent entry is a link on the page but not a row: returning from
    // it lands at the ordinary top of the page, and a point recorded from an
    // earlier row departure must not survive the chrome departure either.
    const row = renderLink('/skills/detail/repository/a', 40);
    renderChromeLink('/global-consent');
    row.focus();
    recordInventoryReturnPoint('/skills/detail/repository/a');
    recordInventoryReturnPoint('/global-consent');
    expect(scrollFor(inventory, routeAt('/global-consent'))).toEqual({ left: 0, top: 0 });
  });

  it('keeps only the last departure, which is the one a return was made from', () => {
    const first = renderLink('/skills/detail/repository/a', 40);
    renderLink('/skills/detail/repository/b', 260);
    recordInventoryReturnPoint('/skills/detail/repository/b');
    recordInventoryReturnPoint('/skills/detail/repository/a');

    expect(scrollFor(inventory, skillDetail)).toEqual({ el: first, top: 40 });
  });
});
