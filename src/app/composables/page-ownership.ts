// The pages' ownership seam over the view state each route instance writes:
// the open detail and the document-title subject. A route navigation mounts
// the next page before the previous one is torn down (the page renders under
// Suspense), so the outgoing page's unmount cleanup runs after its
// replacement has already opened its own detail and reported its own
// subject; a bare `closeFileDetail()` or subject clear there would discard
// the replacement's in-flight request or erase its title. Each page instance
// therefore writes through its own ownership handle, and the view state
// skips a write whose caller no longer owns the state. It lives here rather
// than beside the session classes because pages reach it through the
// `usePageOwnership` composable, per Vue idiom, the way `useInventoryFilters`
// wraps `InventoryFilterView`.
import { inject, onUnmounted } from 'vue';
import { SESSION_VIEW_STATE, type SessionViewState } from '../session/view-state';

/**
 * One page instance's handle on the route-owned view state — the open detail
 * and the title subject: every write goes through the instance's own token,
 * so an outgoing page's cleanup cannot discard the request its replacement
 * has already issued or the subject it just reported
 * (`SessionViewState.closeFileDetail`, `releasePageSubject`). The token never
 * leaves this class — a page cannot pass the wrong one, because it never
 * holds one.
 */
export class PageOwnership {
  /** The view state whose one open detail this handle opens and closes. */
  #viewState: SessionViewState;

  /**
   * This page instance's identity to the view state's ownership check: fresh
   * per construction, so two instances — an outgoing page and its
   * replacement — can never present the same token.
   */
  #owner: symbol;

  /** Binds one page instance's handle to the shell-provided view state. */
  public constructor(viewState: SessionViewState) {
    this.#viewState = viewState;
    this.#owner = Symbol('detail-page');
  }

  /**
   * Opens one customization's file detail as this page's own request
   * ({@link SessionViewState.openFileDetail}).
   */
  public async openFileDetail(entryPath: string, openPath: string): Promise<void> {
    await this.#viewState.openFileDetail(entryPath, openPath, this.#owner);
  }

  /**
   * Opens one MCP carrier's declarations as this page's own request
   * ({@link SessionViewState.openCarrierDetail}).
   */
  public async openCarrierDetail(sourceRelativePath: string): Promise<void> {
    await this.#viewState.openCarrierDetail(sourceRelativePath, this.#owner);
  }

  /**
   * Drops the open detail if this page instance still owns it, and does
   * nothing once a replacement page has opened its own — the unmount-order
   * case this class exists for.
   */
  public close(): void {
    this.#viewState.closeFileDetail(this.#owner);
  }

  /**
   * Reports the route's title subject as this page instance's own
   * ({@link SessionViewState.reportPageSubject}).
   */
  public reportSubject(value: string | null): void {
    this.#viewState.reportPageSubject(value, this.#owner);
  }

  /**
   * Clears the title subject if this page instance still owns it — a no-op
   * once a replacement page has reported its own.
   */
  public releaseSubject(): void {
    this.#viewState.releasePageSubject(this.#owner);
  }
}

/**
 * The composable a page calls once in setup for its own ownership handle.
 * Injects the shell-provided view state itself, and owns the leave-the-route
 * cleanup — the detail close and the subject release — so a page needs no
 * token or unmount plumbing of its own. A page that never opens a detail — a
 * comparison route reporting only its subject — uses the same handle: its
 * close is the ownership no-op by construction.
 *
 * The cleanup registers on `onUnmounted`, not `onBeforeUnmount`, for two
 * reasons. Ordering: a hook registered here runs before the page's own
 * before-unmount hook sets its `leaving` flag, and the pages' synchronous
 * focus watchers would treat the close's state change as an in-page
 * transition and move focus into the page being torn down (WCAG 2.4.3);
 * after unmount the page root no longer contains the active element, so
 * those guards are inert without the flag. Timing: when a replacement page
 * exists it has already opened its own request and reported its own subject
 * by then, so the cleanup is the ownership no-op either way, and on a leave
 * to a non-detail route the dropped state was unreachable from the moment
 * the DOM left.
 */
export function usePageOwnership(): PageOwnership {
  const sessionViewState = inject(SESSION_VIEW_STATE);
  if (sessionViewState === undefined) {
    // The shell always provides it before rendering a route; its absence is a
    // wiring bug, and failing loudly beats a page with no session behind it.
    throw new Error('the session view state was not provided by the shell');
  }
  const ownership = new PageOwnership(sessionViewState);
  onUnmounted(() => {
    ownership.close();
    ownership.releaseSubject();
  });
  return ownership;
}
