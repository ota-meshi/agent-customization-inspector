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
import {
  getCurrentInstance,
  onUnmounted,
  watchEffect,
  type ComponentInternalInstance,
  type ComputedRef,
} from 'vue';
import type { SessionViewState } from '../session/view-state';
import { useSessionViewState } from './session-view-state';
import type { PluginCarrierDetailParams, SourceSelector } from '../../shared/api-types';

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
  public async openFileDetail(
    entryPath: string,
    openPath: string,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    await this.#viewState.openFileDetail(entryPath, openPath, this.#owner, source);
  }

  /**
   * Opens one MCP carrier's declarations as this page's own request
   * ({@link SessionViewState.openCarrierDetail}).
   */
  public async openCarrierDetail(
    sourceRelativePath: string,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    await this.#viewState.openCarrierDetail(sourceRelativePath, this.#owner, source);
  }

  /**
   * Opens one hook carrier's declarations as this page's own request
   * ({@link SessionViewState.openHookCarrierDetail}).
   */
  public async openHookCarrierDetail(
    sourceRelativePath: string,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    await this.#viewState.openHookCarrierDetail(sourceRelativePath, this.#owner, source);
  }

  /**
   * Requests one plugin carrier's detail for one inventory row, with that
   * plugin's own manifest and the file the page has open, under this page's
   * ownership ({@link SessionViewState.openPluginDetail}).
   */
  public async openPluginDetail(
    params: PluginCarrierDetailParams,
    manifestPath: string | null,
    selectedFilePath: string | null,
  ): Promise<void> {
    await this.#viewState.openPluginDetail(params, manifestPath, selectedFilePath, this.#owner);
  }

  /**
   * Opens one declared permission policy as this page's own request
   * ({@link SessionViewState.openPolicyDetail}).
   */
  public async openPolicyDetail(
    sourceRelativePath: string,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    await this.#viewState.openPolicyDetail(sourceRelativePath, this.#owner, source);
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
 * The handle each component instance has already been given, so a second call
 * inside one setup answers with the first one's. Weak, so a handle is
 * collected with the instance that owns it.
 *
 * The cache is what makes the one-handle-per-instance rule a mechanism rather
 * than a convention. Two handles would each hold their own token, and the view
 * state skips every write whose token is not the one that opened the state
 * ({@link PageOwnership}): a close issued through the second handle would
 * return without dropping the detail the first one opened, silently, with
 * nothing on screen to show for it.
 *
 * A shipped caller depends on it: `useDetailRequest` closes the open detail
 * that the page's own `perform` opened, so the close and the open have to
 * present one token. Threading the handle through that composable's options
 * would preserve the identity, but would leave each detail page to forward
 * ownership plumbing solely for that close. The cache preserves the identity
 * at the composable boundary and costs one weak entry per page instance.
 */
const HANDLES = new WeakMap<ComponentInternalInstance, PageOwnership>();

/**
 * The composable a page calls in setup for its own ownership handle. Calling
 * it again inside the same setup — from a composable the page passes it to, or
 * one that asks for it itself — answers with the same handle rather than a
 * second one; see {@link HANDLES}.
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
  const instance = getCurrentInstance();
  if (instance === null) {
    // The same precondition `useSessionViewState` and `onUnmounted` below
    // already carry, stated here because the handle is kept per instance and
    // there is no instance to keep it under. Loud for the same reason the
    // session's own inject is: a handle outside setup owns nothing and would
    // write through a token the view state never adopts.
    throw new Error('the page ownership handle was requested outside a component setup');
  }
  const held = HANDLES.get(instance);
  if (held !== undefined) {
    return held;
  }
  const ownership = new PageOwnership(useSessionViewState());
  HANDLES.set(instance, ownership);
  onUnmounted(() => {
    ownership.close();
    ownership.releaseSubject();
  });
  return ownership;
}

/**
 * Keeps the session's document-title subject reported as this page instance's
 * own, for as long as the page is mounted (WCAG 2.4.2).
 *
 * What the subject says is each page's — it names the thing on screen, or the
 * state the page is in when there is nothing on screen to name — and reporting
 * it is not: a route navigation mounts the next page before the previous one is
 * torn down, so the report has to carry the instance's own token or the
 * outgoing page's cleanup would erase the title its replacement just set
 * (`SessionViewState.reportPageSubject`). That is the whole of what every
 * surface repeated, and it is why this is a composable rather than a line each
 * page writes.
 */
export function useReportedPageSubject(subject: ComputedRef<string | null>): void {
  const ownership = usePageOwnership();
  watchEffect(() => {
    ownership.reportSubject(subject.value);
  });
}
