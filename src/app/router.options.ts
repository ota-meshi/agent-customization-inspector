// The navigation rules the shell and the router share: what counts as a page
// change, where a page change puts the viewport, and where a return to the
// inventory puts the reader back (App.vue owns the matching focus rule; WCAG
// 2.4.3). Scroll and focus move under one shared decision — did the page
// change — so the viewport and the focused element can never part ways: a page
// change starts at the top, where the shell has placed focus on its heading,
// and a same-page parameter change moves neither.
//
// The saved back/forward position is deliberately not restored as a bare
// offset: the shell has already moved focus to the arriving page's heading,
// and putting the viewport somewhere below it would leave the focused element
// off screen above the fold — the divergence this file exists to prevent.
// Leaving the restoring to the browser is not an option either: vue-router
// sets `history.scrollRestoration` to `manual` whenever a `scrollBehavior` is
// given, and setting it back does not reproduce the automatic behavior — what
// the browser then restores is clamped to the height of the page being left,
// and a heading focus scrolls over it in any case, because `focus()` brings
// its element into view.
//
// A return to the inventory is therefore the one page change that restores
// anything, and what it restores is the row rather than the offset: the row
// the reader followed out of the list is focused and put back where it sat.
// The two agree while the list is unchanged — putting the row back where it
// sat puts the document back where it was — and they differ exactly when it is
// not: a returning reader can meet a list narrowed differently, or a
// generation a detail route adopted while they were away. Restoring the offset
// would then leave the focused row off screen; restoring the row keeps it
// where the reader last saw it.
//
// Which list a return renders stays the URL's own business — the inventory
// publishes its kind tab and its filters as query parameters — so nothing here
// carries the reader's narrowing.
import type { RouterConfig } from 'nuxt/schema';
import type { RouteLocationNormalized } from 'vue-router';

/**
 * The identity a page keeps across parameter changes: its matched route
 * path, with the parameters left in place rather than interpolated. A route
 * with no match falls back to its full path, which keys nothing together —
 * the same outcome as having no key at all. Exported for the shell
 * (App.vue), whose navigation focus rule must agree with the scroll rule
 * here: the two decide "did the page change" once.
 */
export const pageKey = (target: RouteLocationNormalized): string =>
  target.matched[0]?.path ?? target.fullPath;

/**
 * The inventory's own {@link pageKey}. It is the one page a return restores
 * for, because it is the one page a reader leaves and comes back to: every
 * other page is reached from it.
 */
const INVENTORY_PAGE_KEY = '/';

/**
 * Where the reader was when they left the inventory: the `href` of the row
 * link the departing navigation followed, and how far below the top of the
 * viewport that row sat. It is module state because the inventory page is
 * unmounted while the reader is away, and it is what makes an in-page "Back to
 * the inventory" link restore like the browser's Back — that link pushes a
 * fresh history entry, which carries no saved position at all.
 *
 * It is replaced on every departure rather than consumed on arrival, because
 * a departure is what makes it true: reaching the inventory always means
 * leaving it first, so the point a return finds is the one that return was
 * recorded for.
 */
let returnPoint: {
  readonly followedHref: string;
  readonly followedAccessibleName: string | null;
  readonly followedIndex: number;
  readonly viewportTop: number;
} | null = null;

/**
 * Every rendered link whose `href` attribute is exactly `followedHref`, in
 * document order. The attribute is matched rather than the `href` property,
 * because the property is the absolute URL the document resolves to while the
 * recorded value is the route path the navigation carried, and `CSS.escape` is
 * what lets an authored path — which can hold any character a file name can —
 * be named in a selector at all.
 *
 * A list rather than the first match: one detail route can be linked from
 * several rows of one inventory — an instruction file two products recognize
 * renders one link per product, and every one of them addresses the same
 * path — so which of them the reader followed is a position among these, not
 * the href alone.
 */
function renderedLinks(followedHref: string): readonly HTMLAnchorElement[] {
  // Scoped to the containers the inventory marks as holding row links
  // (`pages/index.vue` § data-aci-inventory-rows): a return point is the row
  // the reader was on, so chrome links — the Personal setup consent entry —
  // and any link a later page change adds outside the row containers record
  // nothing, and leaving through one clears the point (the no-match branch of
  // {@link recordInventoryReturnPoint}).
  return [
    ...document.querySelectorAll<HTMLAnchorElement>(
      `[data-aci-inventory-rows] a[href=${CSS.escape(followedHref)}]`,
    ),
  ];
}

/**
 * The links of one route whose accessible name is the followed one's, which is
 * the population a recorded index counts within.
 *
 * The name rather than the href alone, because one file can sit on two rows of
 * one kind: a skill file declaring another skill's directory name as its own
 * `name` is invoked by that name by one product and by its directory name by
 * another, so both rows link its one detail route (T200). Each row's link
 * names its own row, because links of several rows must not announce
 * identically (WCAG 2.4.6), and that name is a row fact no filter changes — so
 * it is what identifies the row a reader followed across a narrowing they left
 * behind. `aria-label` is read directly: a link that carries none has its path
 * as its name, and for those kinds the row is the file, so the href already
 * says which row it is (`null` then matches `null`).
 *
 * Falls back to every link of the route when none carries the recorded name,
 * which is a row whose name changed while the reader was away: a row that is
 * there beats none.
 */
function sameNameLinks(
  links: readonly HTMLAnchorElement[],
  followedAccessibleName: string | null,
): readonly HTMLAnchorElement[] {
  const named = links.filter(
    (candidate) => candidate.getAttribute('aria-label') === followedAccessibleName,
  );
  return named.length > 0 ? named : links;
}

/**
 * The anchor a click last passed through, or null when none has since the
 * last purge. Captured rather than read from focus, because a pointer press
 * does not focus a link in every browser, and the reader's own press is what
 * says which of several same-href links they followed.
 *
 * A capture-phase listener, so it runs before the router's own navigation
 * handling on the same event. It is registered once for the document's life
 * and holds one element reference, which the purge below drops.
 */
let lastPressedLink: HTMLAnchorElement | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (event) => {
      const anchor = (event.target as Element | null)?.closest('a');
      lastPressedLink = anchor instanceof HTMLAnchorElement ? anchor : null;
    },
    { capture: true },
  );
}

/**
 * Records where the inventory is being left, called from the page's own leave
 * guard (`pages/index.vue`): the guard runs before anything moves, so the row
 * the reader followed is still rendered and the document is still scrolled
 * where they left it.
 *
 * `followedHref` is the full path of the route being navigated to, which is
 * the `href` the row link rendered — both are one `router.resolve` of one
 * authored route string — so the route is identified by what the navigation
 * carries rather than by watching what was clicked, which a browser that does
 * not focus a link on click would not answer. Which row of that route the
 * reader followed is the accessible name beside it ({@link sameNameLinks}).
 *
 * A departure matching no rendered row link clears the point instead of
 * recording one: the consent entry and any other chrome link are not rows, so
 * returning from them lands at the ordinary top of the page rather than at a
 * position among rows the reader was not reading.
 */
export function recordInventoryReturnPoint(followedHref: string): void {
  const links = renderedLinks(followedHref);
  // Which of the same-href links was followed. One inventory can render
  // several links to one detail route — an instruction file two products
  // recognize renders one per product — so the href alone names a set.
  //
  // The pressed link answers first: a `click` fires for pointer and keyboard
  // activation alike, and the capture listener above sees it before the
  // navigation this guard runs for. The focused element answers next, which
  // covers a navigation no click produced. The first link is the fallback,
  // which is where this landed before the position was recorded at all.
  const pressedIndex = lastPressedLink === null ? -1 : links.indexOf(lastPressedLink);
  const focusedIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
  const link = links[pressedIndex !== -1 ? pressedIndex : focusedIndex === -1 ? 0 : focusedIndex];
  if (link === undefined) {
    returnPoint = null;
    return;
  }
  // The position is counted among the links of the followed row rather than
  // among every link of the route, so the two sides of a return count within
  // one population ({@link sameNameLinks}).
  const followedAccessibleName = link.getAttribute('aria-label');
  returnPoint = {
    followedHref,
    followedAccessibleName,
    followedIndex: Math.max(sameNameLinks(links, followedAccessibleName).indexOf(link), 0),
    viewportTop: link.getBoundingClientRect().top,
  };
}

/**
 * Drops the recorded point, registered with the client-data purge
 * (`session/client-data.ts`): the href and viewport offset are derived from
 * the Source the purged session inspected, so a fresh session that happens to
 * render the same path must not restore the previous session's position and
 * focus.
 */
export function clearInventoryReturnPoint(): void {
  returnPoint = null;
  // The element belongs to the purged session's own render, and holding it
  // would keep that render's node alive as well.
  lastPressedLink = null;
}

export default {
  scrollBehavior(to, from) {
    // A parameter change within one page is not a navigation for scroll any
    // more than it is for focus: the reader is operating a control — a
    // skill tree's file link, a comparison switcher — and scrolling the
    // document to the top would move that control out of view while focus
    // stays on it.
    if (pageKey(to) === pageKey(from)) {
      return false;
    }
    // Coming back to the inventory, by the browser's Back or by a detail
    // page's own link — one rule for both, because the reader made the same
    // move either way. vue-router calls this after the DOM update, so the
    // inventory is rendered by now and the followed row can be found in it.
    if (pageKey(to) === INVENTORY_PAGE_KEY && returnPoint !== null) {
      const { followedHref, followedAccessibleName, followedIndex, viewportTop } = returnPoint;
      const candidates = sameNameLinks(renderedLinks(followedHref), followedAccessibleName);
      // The same position among the followed row's links, or the first when
      // this render has fewer of them — a filter the reader changed while away
      // can drop one — because a row that is there is a better answer than
      // none.
      const link = candidates[followedIndex] ?? candidates[0];
      if (link !== undefined) {
        // The answered target is what places the viewport, so focus must not
        // place it as well: `focus()` scrolls its element into view by
        // default, and that scroll is what pulls a restored page back to the
        // top of the document.
        link.focus({ preventScroll: true });
        // An element and an offset from the top of the viewport is what
        // vue-router means by an element scroll target, so the document
        // arithmetic stays in the router that already performs it. Only the
        // vertical offset is given: the shell has one vertical scroller and
        // its document never scrolls sideways (WCAG 1.4.10), so the
        // horizontal component the router computes has nowhere to go.
        return { el: link, top: viewportTop };
      }
    }
    return { left: 0, top: 0 };
  },
} satisfies RouterConfig;
