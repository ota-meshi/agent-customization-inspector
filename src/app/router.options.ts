// Router scroll behavior for the SPA's one document scroller (App.vue owns
// the matching focus rule; WCAG 2.4.3). Scroll and focus move under one
// shared decision — did the page change — so the viewport and the focused
// element can never part ways: a page change starts at the top, where the
// shell has placed focus on its heading, and a same-page parameter change
// moves neither.
//
// The saved back/forward position is deliberately not restored on a page
// change: the shell has already moved focus to the new page's heading, and
// restoring a lower scroll position after that would leave the viewport at
// the bottom with the focused element off screen above it — the divergence
// this file exists to prevent.
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
    return { left: 0, top: 0 };
  },
} satisfies RouterConfig;
