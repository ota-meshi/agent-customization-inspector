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
import {
  computed,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';
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

/** What one route says while its request settles; see {@link DetailRequest.announcementOf}. */
export interface DetailAnnouncementOptions {
  /**
   * Whether the address names a subject this page can show. What answers it
   * differs by kind, and is not {@link DetailRequestOptions.ready}: a route
   * addressed by its own path asks the committed inventory, and so does the
   * MCP route for a declared name, whose inventory rows are those names. The
   * hook route asks the carrier it fetched instead, because the host holds the
   * whole answer there — a parsed carrier that declares no event sits on no
   * row and still resolves, so reading the rows would report a held carrier as
   * a path this scan does not have (`hooks/detail` § declarationMissing).
   * What the reader is told is the same either way: there is nothing here, and
   * no further wait produces it.
   */
  readonly resolved: MaybeRefOrGetter<boolean>;
  /** What the route says when it does not — the kind's own wording. */
  readonly missingText: string;
  /**
   * The failure the route words for a request that did not complete, or null
   * while nothing has failed (the same value its failure branch draws).
   */
  readonly failure: MaybeRefOrGetter<string | null>;
  /**
   * What the route says while the request is in flight. Read only in that
   * state, so a kind whose sentence depends on what the address selects can
   * pass a getter and have it asked at the moment it answers.
   */
  readonly loadingText: MaybeRefOrGetter<string>;
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

  /**
   * What a route reports and announces when its own request did not complete:
   * its own statement, with the request's message after it. Null while nothing
   * has failed.
   *
   * The statement is the route's, because what could not be loaded differs by
   * kind and by what the address selects inside it. Joining is not. A route is
   * in its recoverable failure state however it was reached, and the two ways
   * of reaching it carry different amounts: a request that failed puts its
   * message in {@link detailError}, while a newer-generation refresh that
   * could not adopt leaves the message to the shell
   * (`view-state.ts` § SessionViewState.openFileDetail). So the statement
   * stands alone rather than trailing an empty clause.
   */
  public failureOf(statement: MaybeRefOrGetter<string | null>): ComputedRef<string | null> {
    return computed(() => {
      const said = toValue(statement);
      if (said === null) {
        return null;
      }
      const error = this.detailError.value;
      return error === null ? said : `${said} ${error}`;
    });
  }

  /**
   * What the live region announces as the request settles (WCAG 4.1.3): a
   * change that alters the page without moving keyboard focus has to reach a
   * reader who is not looking at it.
   *
   * The order is what a reader needs first. An address that names nothing this
   * page can show is said before anything else — a request the host answered
   * with `stale-resource`, no current generation holding the file
   * (`view-state.ts` § FileDetailState), or a subject {@link
   * DetailAnnouncementOptions.resolved} answers no for — because nothing
   * further is coming for it. A failure is said next, in the words the failure
   * branch draws, so hearing it and reading it are the same sentence. Only then is the wait announced. Everything else is silence:
   * the arrival is the page itself, and a region that also said "ready" would
   * make the reader hear what they can already see.
   */
  public announcementOf(options: DetailAnnouncementOptions): ComputedRef<string> {
    return computed(() => {
      if (this.detailState.value === 'stale' || !toValue(options.resolved)) {
        return options.missingText;
      }
      const failure = toValue(options.failure);
      if (failure !== null) {
        return failure;
      }
      return this.detailState.value === 'loading' ? toValue(options.loadingText) : '';
    });
  }
}

/** Wires the effect that keeps the open subject the one the URL names. */
export function useDetailRequest(options: DetailRequestOptions): DetailRequest {
  return new DetailRequest(options);
}
