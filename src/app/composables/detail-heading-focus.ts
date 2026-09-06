// Where keyboard focus sits on a path-addressed detail route (WCAG 2.4.3,
// 2.4.6). Following a link in a single-page application moves no focus by
// itself, so every detail page focuses its heading on entry and again when the
// address selects a different subject; and when the body below the heading is
// replaced — a generation replacement drops an open detail, a stale scan
// replaces the whole page under it — focus that was inside the departing
// subtree would drop to the document body, so the heading is the landmark it
// is rescued to.
//
// What counts as a departure differs by kind — one page watches its open
// detail leave, another watches the state that replaces its body — so each
// page detects its own and calls {@link
// DetailHeadingFocus.requestFocusHeading}, which asks the one question every
// such move shares: is focus inside this page, is it not already on the
// heading, and is the route not being left. The question is not published on
// its own, so a page cannot detect a departure and then move focus without
// asking it.
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';
import type { SourceSelector } from '../components/detail-route';

/** What one detail page hands its heading focus; see the module header. */
export interface DetailHeadingFocusOptions {
  /**
   * The page's own outermost element, which {@link
   * DetailHeadingFocus.requestFocusHeading} asks about, so the question covers
   * everything the page draws.
   */
  readonly pageRoot: Readonly<ShallowRef<HTMLElement | null>>;
  /** The page heading, focused on entry so a keyboard user starts at the top. */
  readonly heading: Readonly<ShallowRef<HTMLHeadingElement | null>>;
  /**
   * The path whose change means the page is about a different subject while
   * staying mounted — the address's own for a kind whose heading is that path
   * (`detail-address.ts` § useDetailAddress), and never the file a kind
   * selects inside its subject, since stepping through those leaves the reader
   * where they are.
   *
   * A kind headed by what the address resolves to passes that instead. Moving
   * focus announces the heading, so a step between two addresses that resolve
   * nothing must not move it: both are headed by the kind's own word, and the
   * reader would hear it a second time for a page that did not change.
   */
  readonly openPath: ComputedRef<string>;
  /** The Source the address names, the other half of the identity (FR-030). */
  readonly openSource: ComputedRef<SourceSelector>;
  /**
   * Whatever else the address selects inside that path — a declared event, a
   * server name — as one comparable value, and null for a kind whose path is
   * the whole address, which has no such coordinate to step between. The same
   * coordinate the request effect keys on (`detail-request.ts`
   * § DetailRequestOptions.selection).
   */
  readonly selection: MaybeRefOrGetter<string | null>;
}

/**
 * The heading focus of one detail page; see the module header.
 */
export class DetailHeadingFocus {
  /** The page's own outermost element, which a move asks about. */
  #pageRoot: Readonly<ShallowRef<HTMLElement | null>>;

  /** The heading every move lands on. */
  #heading: Readonly<ShallowRef<HTMLHeadingElement | null>>;

  /** Set as the route is left, so a move yields to the next route. */
  #leaving = false;

  /**
   * Wires the entry focus, the re-focus when the address names a different
   * subject, and the flag a move asks about; see {@link useDetailHeadingFocus}.
   */
  public constructor(options: DetailHeadingFocusOptions) {
    this.#pageRoot = options.pageRoot;
    this.#heading = options.heading;
    onMounted(() => {
      this.focusHeading();
    });
    // After the flush, because the heading the address now names is rendered by
    // the render this change schedules rather than by the one it interrupts.
    watch(
      [options.openSource, options.openPath, () => toValue(options.selection)],
      () => void nextTick(() => this.focusHeading()),
    );
    onBeforeUnmount(() => {
      this.#leaving = true;
      // The title subject and the open detail are both `usePageOwnership`'s to
      // drop, after unmount, where a move is naturally inert and a replacement
      // page's own report or open stands.
    });
  }

  /**
   * Moves focus to the heading whatever holds it: the entry focus, and the
   * failed-load retry, whose control is unmounted by the state the click
   * causes, so the move is made for that control rather than for whatever the
   * reader happens to be on (`detail-request.ts` § retryOpen).
   */
  public focusHeading(): void {
    this.#heading.value?.focus();
  }

  /**
   * Asks for focus on the heading for a departure this page detected. Declined
   * unless focus is inside this page, is not already on the heading, and the
   * route is not being left: a move on a route that is leaving would take
   * focus from the page arriving after it, and one made with focus outside the
   * page would move a reader who was never in the departing subtree.
   */
  public requestFocusHeading(): void {
    if (
      !this.#leaving &&
      this.#pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== this.#heading.value
    ) {
      this.focusHeading();
    }
  }
}

/**
 * Wires one detail page's heading focus: the entry focus, the re-focus when
 * the address names a different subject, and the guard rescues ask.
 *
 * The two elements are the page's own, bound by `useTemplateRef` where the
 * template names them: a composable that made them would leave the binding
 * resting on the page destructuring them under exactly the names its own
 * template writes, which nothing checks.
 */
export function useDetailHeadingFocus(options: DetailHeadingFocusOptions): DetailHeadingFocus {
  return new DetailHeadingFocus(options);
}
