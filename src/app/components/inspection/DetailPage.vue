<script setup lang="ts" generic="Subject">
// The frame every customization detail route draws inside: the route's own
// outermost element, and the heading focus that element bounds.
//
// The element, the header, and the focus belong together, which is why one
// component holds all three. "Inside this page" is the question the focus
// guard asks before it rescues focus to the heading (`detail-heading-focus.ts`
// § DetailHeadingFocus.requestFocusHeading), and it can only be asked of the
// element the route ends at; the heading it rescues to is the header's, and
// the component that draws that header is what can reach it in time — a
// heading handed down as a prop is the parent's render captured before the
// header exists, and the entry focus would find nothing to land on.
//
// What the address names stays the route's and arrives as props: which
// parameters carry an address and how they are spelled is the route's own
// shape, declared by the page's file name (`detail-address.ts`).
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import { useDetailHeadingFocus } from '../../composables/detail-heading-focus';
import { useSessionViewState } from '../../composables/session-view-state';
import type { DetailNeighbour, SourceSelector } from '../detail-route';
import DetailFailureNotice from './DetailFailureNotice.vue';
import DetailHeader from './DetailHeader.vue';
import DetailPathNotFound from './DetailPathNotFound.vue';
import LiveRegion from '../LiveRegion.vue';

const props = defineProps<{
  /** The kind's own caption, which the header spells everywhere it names the kind. */
  kindText: string;
  /** Where the list this page was opened from is, with the kind still selected. */
  listRoute: string;
  /** The rows either side of this one in that list's order. */
  neighbours: { readonly previous: DetailNeighbour | null; readonly next: DetailNeighbour | null };
  /**
   * The family of place the open file came from, leading the trail, or null
   * while the Source is not in the snapshot (`source-facts.ts`).
   */
  sourceFamilyCrumbText: string | null;
  /** The open path as the header draws it (`detail-address.ts` § PathPresentation). */
  pathText: string;
  /** Whether {@link pathText} is this product's spelling rather than the file's. */
  pathIsSpelledOut: boolean;
  /** What a screen reader announces the heading as (WCAG 2.4.6). */
  accessibleText: string;
  /**
   * The path the address names, whose change means the page is about a
   * different subject while staying mounted (`detail-heading-focus.ts`
   * § DetailHeadingFocusOptions.openPath).
   */
  openPath: string;
  /** The Source the address names, the other half of the identity (FR-030). */
  openSource: SourceSelector;
  /**
   * Whatever else the address selects inside that path, and null for a kind
   * whose path is the whole address (`detail-heading-focus.ts`
   * § DetailHeadingFocusOptions.selection).
   */
  selection: string | null;
  /**
   * Whether the address names a subject this page can show. What answers it
   * differs by kind, and is not whether a request may be made: a route
   * addressed by its own path asks the committed inventory, and so does the
   * MCP route for a declared name, whose inventory rows are those names. The
   * hook route asks the carrier it fetched instead, because the host holds the
   * whole answer there — a parsed carrier that declares no event sits on no
   * row and still resolves, so reading the rows would report a held carrier as
   * a path this scan does not have (`hooks/detail` § declarationMissing).
   */
  subjectResolved: boolean;
  /** What the route says when it does not — the kind's own wording. */
  missingText: string;
  /**
   * The failure the route words for a request that did not complete, or null
   * while nothing has failed (the same value its failure branch draws, so
   * hearing it and reading it are the same sentence).
   */
  failureText: string | null;
  /** What the route says while its own request is in flight. */
  loadingText: string;
  /**
   * What this page draws its content from, or null while it holds nothing.
   *
   * The frame's own failure branch turns on this rather than on
   * {@link failureText}, which the route withholds outside the state it words:
   * a page with nothing in hand would otherwise reach its own content and
   * read what it does not have, where an unworded notice is only a notice
   * missing its sentence. Handing the value back to the content slot is what
   * makes that guarantee reach the page — inside the slot it is the subject,
   * never null, so nothing there re-asks a question the frame has answered.
   */
  subject: Subject | null;
  /**
   * What the route says once its own request is ready but a further one it
   * made for something it draws has not arrived — a skill's selected companion
   * file, a plugin's selected file — and null once nothing further is pending.
   * Omitted by a kind that waits once, whose page is complete the moment its
   * own request is.
   */
  furtherLoadingText?: string | null;
}>();

defineEmits<{
  /** The reader asked, from the failure notice below, for the subject again. */
  retry: [];
}>();

defineSlots<{
  /**
   * Whatever this page is about, drawn as the trail's last step. Passed by a
   * kind whose subject is a name declared inside a carrier — a hook event, an
   * MCP server, a plugin — and only where that name has resolved; the trail
   * draws {@link pathText} wherever it is not passed, and ends
   * at the kind where neither is there (`DetailCrumbs.vue`).
   */
  'declared-name-in-trail'?(): unknown;
  /**
   * The same declared name, drawn as the heading. Separate from the trail's
   * because the two draw it differently: the trail's step is a crumb, and the
   * heading names the page (`DetailHeadingSubject.vue`).
   */
  'declared-name-in-heading'?(): unknown;
  /**
   * The comparison of the subject the heading names, which closes the
   * heading's own line (FR-011): the link where the subject has a pair to
   * stand opposite, and the sentence saying why there is none where it does
   * not.
   */
  'subject-comparison'?(): unknown;
  /**
   * What this page reports where the address names nothing the current scan
   * holds. Passed by a kind that has more to say than the one sentence every
   * path-addressed route says — a held carrier declaring no name by this one,
   * a skill's directory holding no file at this path — and left to the default
   * (`DetailPathNotFound.vue`) by the rest.
   */
  missing?(): unknown;
  /**
   * Everything this page shows under its heading, drawn from the subject the
   * frame has in hand, which is never null here. Bind it under the page's own
   * name for what it holds — `#default="{ subject: openDetail }"` — so the
   * content below names its subject the way the rest of the page does.
   */
  default(props: { subject: Subject }): unknown;
}>();

/** The session's detail request state, which the announcement below reads. */
const detailState = useSessionViewState().fileDetailState;

/**
 * What the live region announces as the route's request settles (WCAG 4.1.3):
 * a change that alters the page without moving keyboard focus has to reach a
 * reader who is not looking at it. The words are each route's and arrive as
 * props; which of them is said, and when, is one rule and lives here — the
 * component that draws the region.
 *
 * The order is what a reader needs first. An address that names nothing this
 * page can show is said before anything else — a request the host answered
 * with `stale-resource`, no current generation holding the file
 * (`view-state.ts` § FileDetailState), or a subject {@link subjectResolved}
 * answers no for — because nothing further is coming for it. A failure is said
 * next. Only then is a wait announced: the route's own first, and after it
 * settles the one it is still waiting on ({@link furtherLoadingText}), which a
 * kind that waits twice has and the rest do not.
 *
 * Arrival itself is silence, for three reasons that hold for the reader this
 * region exists for. Focus is already on this page's heading, placed there on
 * entry and again whenever the address names a different subject
 * (`detail-heading-focus.ts`), so the subject has been read out and the next
 * key lands in the body. The shell has already said the session is ready
 * (`App.vue` § statusAnnouncement), and a second "ready" adds nothing to the
 * first. And "ready" names a state rather than what arrived: it says something
 * changed without saying into what, which is the half the reader wants and the
 * half the heading has said. So a wait's end is not marked either — a reader
 * who heard the wait learns it is over by reading on.
 *
 * A sentence that did name what arrived would be a different decision from
 * this one, and it would belong to every kind rather than to one.
 */
const announcement = computed((): string => {
  if (detailState.value === 'stale' || !props.subjectResolved) {
    return props.missingText;
  }
  if (props.failureText !== null) {
    return props.failureText;
  }
  if (detailState.value === 'loading') {
    return props.loadingText;
  }
  if (detailState.value !== 'ready') {
    return '';
  }
  return props.furtherLoadingText ?? '';
});

/** The route's own outermost element, which bounds the focus guard's question. */
const pageRoot = useTemplateRef<HTMLElement>('pageRoot');

/** The header, whose heading every move lands on (`DetailHeader.vue`). */
const header = useTemplateRef<InstanceType<typeof DetailHeader>>('header');

/**
 * Where focus sits on this route (WCAG 2.4.3, 2.4.6): the entry focus, the
 * re-focus when the address names a different subject, and the rescue a page
 * asks for when the body under the heading is replaced.
 */
const headingFocus = useDetailHeadingFocus({
  pageRoot,
  heading: () => header.value,
  openPath: computed(() => props.openPath),
  openSource: computed(() => props.openSource),
  selection: () => props.selection,
});

// A committed generation replacing the snapshot drops a subject that was on
// screen — the tabs, the tree, the viewer — without the address moving, so
// focus inside that subtree would drop to the document body (WCAG 2.4.3).
//
// What is checked is the outcome rather than the cause: the element the reader
// was on is remembered while it is still in the document, and the rescue is
// made only if that element is gone and focus did fall to the body. Comparing
// the address instead would ask whether the reader navigated, and the two
// halves of that question — the subject and the address it was held for —
// reach this component as separate props, updated one after the other, so a
// history step to another subject is seen for one moment as a subject
// departing at an unchanged address and the heading of the page being left
// takes focus.
//
// So a history step needs no test here: the address watcher focuses the
// heading after the flush (`detail-heading-focus.ts`), and focus is then no
// longer on the body. A request that failed before anything was shown needs
// none either — it unmounts nothing the reader could be inside, so nothing was
// lost to give back.
//
// Waiting for the flush costs nothing once this watcher has captured the
// element: the reference remains available after the document changes.
//
// The element is still the reader's when this runs, whatever dropped the
// subject. Closing the open detail releases the authored text the components
// hold without detaching what drew it (`SourceViewer.vue` § dropContent), and
// what the reader was on goes with the render this watcher runs ahead of. So
// `document.activeElement` here is where the reader is rather than the
// document body.
watch(
  (): Subject | null => props.subject,
  (subject, departed) => {
    if (subject !== null || departed === null) {
      return;
    }
    const held = document.activeElement;
    if (held === null || pageRoot.value?.contains(held) !== true) {
      return;
    }
    void nextTick(() => {
      if (!held.isConnected && document.activeElement === document.body) {
        headingFocus.focusHeading();
      }
    });
  },
  { flush: 'sync' },
);

// An address that stops naming something this scan holds replaces the whole
// body below the heading with the notice above — the tabs, the tree, the
// viewer a reader may be inside all unmount — so focus would drop to the
// document body (WCAG 2.4.3). The frame draws that replacement, so the rescue
// is the frame's: it asks for the heading, and the ask is declined unless
// focus is inside this page and not already on it (`detail-heading-focus.ts`
// § DetailHeadingFocus.requestFocusHeading). Synchronous, because afterwards
// the focused element is already gone.
watch(
  [detailState, (): boolean => props.subjectResolved],
  ([state, resolved]) => {
    if (state === 'stale' || !resolved) {
      headingFocus.requestFocusHeading();
    }
  },
  { flush: 'sync' },
);

/**
 * Moves focus onto the heading. Called where a page's own control removes
 * itself and the heading is the landmark that survives (WCAG 2.4.3) — the
 * failed-load retry (`detail-request.ts` § DetailRequest.retryOpen), and a
 * page that decides its own move.
 */
function focusHeading(): void {
  headingFocus.focusHeading();
}

/**
 * Asks for focus on the heading for a departure the page detected, which the
 * guard declines unless focus is inside this page and not already on the
 * heading (`detail-heading-focus.ts` § DetailHeadingFocus.requestFocusHeading).
 */
function requestFocusHeading(): void {
  headingFocus.requestFocusHeading();
}

defineExpose({ focusHeading, requestFocusHeading });
</script>

<template>
  <div ref="pageRoot" class="aci-route">
    <DetailHeader
      ref="header"
      :kind-text="kindText"
      :list-route="listRoute"
      :neighbours="neighbours"
      :source-family-crumb-text="sourceFamilyCrumbText"
      :path-text="pathText"
      :path-is-spelled-out="pathIsSpelledOut"
      :accessible-text="accessibleText"
    >
      <!-- The header names its slots after the markup it draws them into,
           which it can because it draws both; here they are named after what
           the page supplies, which is all a page can see. -->
      <template #trail-subject><slot name="declared-name-in-trail" /></template>
      <template #heading-name><slot name="declared-name-in-heading" /></template>
      <template #title-end><slot name="subject-comparison" /></template>
    </DetailHeader>

    <!-- Under the header and above whatever the route shows, because the
         region has to be in the document from the first render for a change to
         be announced at all (WCAG 4.1.3). -->
    <LiveRegion :text="announcement" />

    <!-- The three states a reader meets before a page's own content, in the
         order {@link announcement} speaks them, so what is heard and what is
         drawn are one decision rather than two that can drift. Each kind's
         words arrive as props; what is drawn from them is the same everywhere,
         which is what makes the page below start at its own subject. -->
    <template v-if="detailState === 'loading'">
      <p class="aci-empty">{{ loadingText }}</p>
    </template>

    <template v-else-if="detailState === 'stale' || !subjectResolved">
      <slot name="missing"><DetailPathNotFound :list-route="listRoute" /></slot>
    </template>

    <!-- A failed request: this route reports it, because this route made it —
         the shell reports what happened to the session, so neither hides or
         repeats the other. -->
    <template v-else-if="subject === null">
      <DetailFailureNotice :message="failureText" @retry="$emit('retry')" />
    </template>

    <template v-else>
      <slot :subject="subject" />
    </template>
  </div>
</template>
