// Which subject a path-addressed detail route has open, and the one effect
// that keeps it the subject the URL names. Entering the route, a history step
// between two subjects, and a committed generation replacing the snapshot all
// reach the same effect, so a page never has two answers to "what should be
// open" (data-model.md § BrowserState).
//
// The committed generations are part of what "open" means: adopting a newer
// one closes the open detail while the address stays identical, so their
// change is what re-requests the same subject under the new snapshot.
//
// What the request itself is stays with the page. The kinds do not open the
// same thing — a file, a carrier, a policy, a plugin — and `usePageOwnership`
// already publishes one method per kind (`page-ownership.ts`), so the choice
// among them is a fact about the kind rather than about requesting.
import { toValue, watch, type ComputedRef, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { familyGenerationOf, type SourceSelector } from '../components/detail-route';
import { usePageOwnership } from './page-ownership';
import type { DetailHeadingFocus } from './detail-heading-focus';
import { useSessionViewState } from './session-view-state';
import type { FileDetailState, SessionViewState } from '../session/view-state';

/** What one detail page's request needs of the page; see the module header. */
export interface DetailRequestOptions {
  /** The path the address names (`detail-address.ts` § useDetailAddress). */
  readonly openPath: ComputedRef<string>;
  /** The Source the address names, the other half of the identity (FR-030). */
  readonly openSource: ComputedRef<SourceSelector>;
  /**
   * Whatever else the address selects inside that path — a declared event, a
   * server name, a companion file — as one comparable value, and null for a
   * kind whose path is the whole address. A step that changes only this leaves
   * the path identical and the subject different, so it is a key of the effect
   * rather than something the request reads on its own.
   */
  readonly selection: MaybeRefOrGetter<string | null>;
  /**
   * Whether the committed inventory holds what the address names. A request
   * for a subject the snapshot does not list is the dead link the host would
   * answer anyway, reportable without issuing it.
   */
  readonly ready: MaybeRefOrGetter<boolean>;
  /**
   * Issues this page's own request through `usePageOwnership`. Called only
   * with {@link ready} true, so it may read the row it resolved.
   */
  readonly perform: () => void;
  /**
   * This page's heading focus, whose move {@link DetailRequest.retryOpen} makes
   * before re-requesting (`detail-heading-focus.ts`).
   */
  readonly headingFocus: DetailHeadingFocus;
}

/**
 * One detail page's open subject and the controls over it.
 */
export class DetailRequest {
  /** The session view state that owns the request state this page reads. */
  #sessionViewState: SessionViewState;

  /** This page's own request, for the retry and the effect below. */
  #options: DetailRequestOptions;

  /** The session's detail request state, which the page's branches read. */
  public get detailState(): ShallowRef<FileDetailState> {
    return this.#sessionViewState.fileDetailState;
  }

  /** This route's own failed request, which the page reports and announces. */
  public get detailError(): ComputedRef<string | null> {
    return this.#sessionViewState.detailErrorMessage;
  }

  /**
   * Wires the effect that keeps the open subject the one the URL names; see
   * {@link useDetailRequest}.
   */
  public constructor(options: DetailRequestOptions) {
    this.#options = options;
    const sessionViewState = useSessionViewState();
    this.#sessionViewState = sessionViewState;
    // The page's own handle: `usePageOwnership` answers with the one this
    // component already holds, so the close below drops the detail the page's
    // own request opened rather than writing through a token the view state
    // never adopted (`page-ownership.ts` § HANDLES).
    const pageOwnership = usePageOwnership();
    const snapshot = sessionViewState.snapshot;
    watch(
      [
        options.openPath,
        () => toValue(options.selection),
        () => toValue(options.ready),
        (): number => familyGenerationOf(snapshot.value ?? null, options.openSource.value),
        options.openSource,
      ],
      ([path, , ready]) => {
        if (path === '' || !ready) {
          // The URL names nothing this generation holds. Dropping what is open
          // is the point: the page shows the recoverable state below, and
          // holding authored content the reader navigated away from would keep
          // it in memory for nothing.
          pageOwnership.close();
          return;
        }
        this.#requestOpen();
      },
      { immediate: true },
    );
  }

  /** Requests the subject the address names, if the inventory holds it. */
  #requestOpen(): void {
    if (!toValue(this.#options.ready)) {
      return;
    }
    this.#options.perform();
  }

  /**
   * The failed-load retry. Separate from the effect because the button this
   * click comes from vanishes with the failed branch the moment the state
   * returns to loading, and focus would drop to the document body
   * (WCAG 2.4.3); the heading is the landmark that survives the transition.
   */
  public retryOpen(): void {
    this.#options.headingFocus.focusHeading();
    this.#requestOpen();
  }
}

/** Wires the effect that keeps the open subject the one the URL names. */
export function useDetailRequest(options: DetailRequestOptions): DetailRequest {
  return new DetailRequest(options);
}
