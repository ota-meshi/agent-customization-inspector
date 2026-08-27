<script setup lang="ts">
// The hook comparison route (T911/T912; FR-011, FR-012): one declared
// lifecycle event's declarations compared across the carriers that declare it
// — each side serialized to canonical JSON and diffed in Monaco
// (research.md § 7) — with no verdict, no merge, and no fix anywhere. There is
// no source half: a hook carrier shows its source on no surface (FR-007), so
// the serialized declarations are the whole comparison.
//
// The route is the hook kind's, not a shared one: comparison is kind-specific
// (spec.md § Clarifications Session 2026-08-14), and each family's comparison
// unit is its inventory's own row unit — for skills one name's copies, for
// instructions one range's files, here one declared event
// (data-model.md § Inventory unit). The comparison is opened from that event's
// inventory row or from one of its declarations' detail pages, and stays
// inside what the row holds: its pickers move the two sides among the row's
// own carriers.
//
// A contained declaration is compared through the file that carries it: a
// settings document is what the row lists and what a detail request resolves,
// and the hook block inside it is what that document holds (FR-030). Nothing
// a client decides at runtime is selectable, because no row holds such a
// value (FR-009).
//
// The URL carries the model's own coordinates —
// `/hooks/compare?event=<declared event>&left=<path>&right=<path>` — the row's
// event in the carriers' own spelling (FR-007) and the two carriers by their
// Source-relative Paths, the identities the inventory rows and the detail
// route already use (FR-030). A selection the model cannot express — an event
// no current row is, one carrier twice, or a carrier the named row does not
// hold, which covers a path that is no current hook carrier at all — is
// reported, never opened. The link survives rescans and server launches,
// resolving against whatever generation is current. Direct loads boot the
// shell first, so this page always opens against an adopted snapshot.
//
// Like the hook detail, this surface shows declared values exactly as authored
// — credentials included, with nothing masked and no control that would
// uncover a masked value — and it says none of that (FR-027).
//
// Three things drop the open comparison, and all three are the same cleanup
// the comparison state owns: leaving the route closes it, a client-data purge
// clears it, and a commit drops the previous generation's view while this page
// re-requests the same selection under the new snapshot (FR-030).
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NuxtLink } from '#components';
import RecognitionComparison from '../../components/hook-comparison/RecognitionComparison.vue';
import { fromJsonStringBody } from '../../components/detail-route';
import { hookComparisonRouteFor } from '../../composables/hook-comparison';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { usePageOwnership } from '../../composables/page-ownership';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import {
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../shared/entities';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats rendering a comparison page with no
  // session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const comparison = sessionViewState.hookComparison;
const snapshot = sessionViewState.snapshot;
const status = comparison.status;

const route = useRoute();

const pageOwnership = usePageOwnership();
const router = useRouter();

/**
 * One query parameter as the single value it names, or null when the URL does
 * not carry it. A repeated parameter arrives as an array; this route's are not
 * repeated, so the array form folds to its first value rather than being a
 * case. Present-but-empty stays the empty string, because strict JSON accepts
 * the empty string as a declared event name (FR-025).
 */
function queryParameter(name: string): string | null {
  const parameter = route.query[name];
  if (typeof parameter === 'string') {
    return parameter;
  }
  return Array.isArray(parameter) && typeof parameter[0] === 'string' ? parameter[0] : null;
}

/**
 * The declared event whose row owns this comparison (FR-007). The query
 * spelling is `toJsonStringBody`'s, the same layer the declaration detail's
 * `?event=` rides: decoding here is what lets an event the URL cannot carry
 * raw — a lone surrogate strict JSON resolves from an authored escape — own
 * its comparison too (`hookComparisonRouteFor`).
 */
const subjectEvent = computed(() => {
  const parameter = queryParameter('event');
  return parameter === null ? null : fromJsonStringBody(parameter);
});
/**
 * The first compared carrier's Source-relative Path (FR-030), decoded through
 * the spelling its link was built with: a carrier path rides the query the
 * same way the event above does, because a raw entry name can hold a character
 * the URL cannot carry raw (`detail-route.ts`).
 */
const leftPath = computed(() => {
  const parameter = queryParameter('left');
  return parameter === null ? '' : fromJsonStringBody(parameter);
});
/** The second compared carrier's Source-relative Path (FR-030). */
const rightPath = computed(() => {
  const parameter = queryParameter('right');
  return parameter === null ? '' : fromJsonStringBody(parameter);
});

/**
 * Whether the URL names a selection at all; without an event and two paths
 * there is nothing to open. A path is never the empty string
 * (data-model.md § SourceRelativePath), so the empty string folds into
 * absence; the empty declared event stays an event.
 */
const hasSelection = computed(
  () => subjectEvent.value !== null && leftPath.value !== '' && rightPath.value !== '',
);

/**
 * The coordinates most recently requested by a picker and not yet reflected by
 * the route; see the sibling compare routes' pending pair for the race this
 * fills. The watch below clears it the moment the route has caught up, so the
 * route stays the identity and this ref is only the gap-filler.
 */
const pendingPair = shallowRef<{ readonly left: string; readonly right: string } | null>(null);

// The route caught up (or the reader navigated): the query is the truth again,
// and a pending value kept past this point would shadow it.
watch([leftPath, rightPath], () => {
  pendingPair.value = null;
});

/** The pending-aware current coordinates; the route's, once it has caught up. */
const currentLeftPath = computed(() => pendingPair.value?.left ?? leftPath.value);
const currentRightPath = computed(() => pendingPair.value?.right ?? rightPath.value);

/**
 * Replaces the compared coordinates in place, inside the same event row.
 * `replace` rather than `push`: stepping through pairs is this page's working
 * motion, and a history entry per pick would make the back button replay every
 * pair the reader stepped through on the way.
 */
function switchTo(left: string, right: string): void {
  pendingPair.value = { left, right };
  void router.replace(hookComparisonRouteFor(subjectEvent.value ?? '', left, right));
}

/**
 * The one inventory row owning the comparison: the row whose declared event
 * the URL carries. The comparison never leaves it — its sides are that event's
 * declarations, exactly as an MCP pair is owned by one server name's row
 * (data-model.md § Inventory unit). Null when no current row is the named one,
 * which the template reports instead of comparing (FR-011). The closing row is
 * never it: its carriers publish no declaration a comparison would serialize.
 */
const owningRow = computed(() => {
  if (subjectEvent.value === null) {
    return null;
  }
  return (snapshot.value?.hooks ?? []).find((entry) => entry.event === subjectEvent.value) ?? null;
});

/**
 * The paths the pickers offer: the owning row's carriers, one entry per
 * physical carrier in the row's published order. Every one of them is
 * comparable by the row's own invariant: a named row's declarations are parsed
 * — a carrier whose reading failed publishes no event, and a binary carrier is
 * diagnostic-only — so a parsed carrier's declarations were read
 * (`api-types.ts` § HookDeclarationDto.parseStatus). A carrier of another
 * event's row is outside what this row owns; stepping to another event goes
 * through its own row's entry link.
 */
const comparablePaths = computed<readonly string[]>(() => [
  ...new Set(
    (owningRow.value?.declarations ?? []).map((declaration) => declaration.sourceRelativePath),
  ),
]);

/**
 * What is wrong with the link's coordinates, before any request — the model's
 * own validation, reported instead of a comparison. Null when the selection is
 * the model's: one declared event's row holding both carriers.
 */
const pairFault = computed<string | null>(() => {
  if (!hasSelection.value) {
    return 'This link names no hook comparison. Open a comparison from a hook row in the inventory, or from a hook declaration’s detail page.';
  }
  if (currentLeftPath.value === currentRightPath.value) {
    return 'A comparison needs the declaration from two distinct files, and this link names the same file twice.';
  }
  if (owningRow.value === null) {
    // One statement for every way the event resolves no row — an event no
    // current carrier declares, or an identity the current scan does not hold.
    // A carrier whose reading failed publishes no event, so a link into one
    // lands here rather than on a page about declarations the scan could not
    // read.
    return 'No declared hook event in the current scan matches this link’s. The inventory may have changed since the link was made; open a comparison from a hook row.';
  }
  const held = new Set(
    owningRow.value.declarations.map((declaration) => declaration.sourceRelativePath),
  );
  if (!held.has(currentLeftPath.value) || !held.has(currentRightPath.value)) {
    // Covers a path that is no current hook carrier at all: such a path is on
    // no row, this one included.
    return 'A file this link names does not declare this event in the current scan. The inventory may have changed since the link was made; open a comparison from a hook row.';
  }
  return null;
});

// One effect owns "which selection should be open", so entering the route, a
// URL edit, a pick, and a committed generation all take the same path. The
// committed generations are part of the key: adopting a newer one drops the
// open comparison while the coordinates stay identical, so their change is
// what re-requests the same selection under the new snapshot.
watch(
  [
    subjectEvent,
    leftPath,
    rightPath,
    (): number => snapshot.value?.repositoryGeneration ?? 0,
    (): number | null => snapshot.value?.globalGeneration ?? null,
  ],
  () => {
    if (pairFault.value !== null) {
      // The coordinates are outside the model; the template reports the fault
      // ({@link pairFault}) instead of a comparison.
      comparison.close();
      return;
    }
    void comparison.open(currentLeftPath.value, currentRightPath.value);
  },
  { immediate: true },
);

/**
 * Whether the pickers render: only a row with more than two comparable
 * carriers has a file to move a side to — with exactly two, both already stand
 * on the two sides and each selector would offer nothing but its own value —
 * dead controls, exactly the sibling surfaces' rule.
 */
const pickersAvailable = computed(
  () => pairFault.value === null && comparablePaths.value.length > 2,
);

/** The first side's picker binding; a pick moves the `left` coordinate. */
const leftSelection = computed({
  get: () => currentLeftPath.value,
  set: (path: string) => {
    switchTo(path, currentRightPath.value);
  },
});

/** The second side's picker binding; a pick moves the `right` coordinate. */
const rightSelection = computed({
  get: () => currentRightPath.value,
  set: (path: string) => {
    switchTo(currentLeftPath.value, path);
  },
});

/**
 * The subject line's text: the declared event through the shared label rule,
 * with the empty event noted the way the inventory row heads it — strict JSON
 * accepts the empty string as an event name (FR-025). Null while the URL
 * carries no event, where the fault statement is the page.
 */
const subjectEventText = computed(() =>
  subjectEvent.value === null
    ? null
    : subjectEvent.value === ''
      ? '(empty name)'
      : pathPresentationLabel(subjectEvent.value),
);

/**
 * Whether {@link subjectEventText} is the authored spelling rather than this
 * product's note, which decides the authored-text styling.
 */
const subjectEventIsAuthored = computed(
  () => subjectEvent.value !== null && subjectEvent.value !== '',
);

/**
 * One side's recognition attribution: each product whose recognition the row
 * lists for that carrier, with the surfaces its admission rests on — the
 * inventory row's own statements, repeated per side so neither declaration
 * loses which product reads it (FR-009: naming a surface never claims it ran
 * the hook).
 */
function attributionText(path: string): string {
  return (owningRow.value?.declarations ?? [])
    .filter((declaration) => declaration.sourceRelativePath === path)
    .map(
      (declaration) =>
        `${SUPPORTED_TOOL_TEXT[declaration.tool]} (${declaration.surfaces
          .map((surface) => VENDOR_SURFACE_TEXT[surface])
          .join(', ')})`,
    )
    .join(' · ');
}

/**
 * The whole ready view as one derivation, null outside 'ready': the compared
 * event and the two adopted details, which the comparison component serializes
 * into its two canonical documents. One computed rather than one per
 * projection, for the same release-on-next-read reason the sibling compare
 * routes document (FR-027).
 *
 * Every rendered coordinate is the adopted detail's own path, never the
 * pending-aware picker coordinate: a pick updates the coordinates one render
 * before the re-request drops this view, and labelling the old details with
 * the new paths would put one carrier's declared values — credentials included
 * — under another carrier's name for that frame (FR-025, FR-030).
 */
const readyView = computed(() => {
  if (status.value !== 'ready' || subjectEvent.value === null) {
    return null;
  }
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (left === null || right === null) {
    return null;
  }
  return {
    event: subjectEvent.value,
    left,
    right,
    leftAttribution: attributionText(left.file.sourceRelativePath),
    rightAttribution: attributionText(right.file.sourceRelativePath),
  };
});

/**
 * What this page says for the state it is in — one value read by both the
 * visible copy and the live region, so what a reader hears is the sentence on
 * the screen (WCAG 4.1.3). A link fault outranks the request status.
 */
const stateStatement = computed<string | null>(() => {
  const fault = pairFault.value;
  if (fault !== null) {
    return fault;
  }
  switch (status.value) {
    case 'stale':
      return 'No hook carrier in the current scan sits at one of this link’s paths. The inventory may have changed since the link was made; a rescan that brings the file back will make it resolve again.';
    case 'failed':
      return comparison.errorMessage.value === null
        ? 'This comparison could not be loaded.'
        : `This comparison could not be loaded. ${comparison.errorMessage.value}`;
    case 'idle':
      return 'This comparison could not be loaded.';
    case 'loading':
    case 'ready':
      return null;
  }
  return null;
});

/**
 * What the polite live region announces; see {@link stateStatement}. 'loading'
 * and 'ready' announce themselves: a reader stepping the pickers holds focus
 * on a select, so without a completion phrase nothing would say the comparison
 * behind it changed (WCAG 4.1.3).
 */
const announcement = computed(() => {
  if (status.value === 'loading') {
    return 'Loading this comparison…';
  }
  if (status.value === 'ready') {
    return 'Comparison ready.';
  }
  return stateStatement.value ?? '';
});

/**
 * Whether the failed statement gets a retry: 'failed' and the recoverable
 * 'idle' both re-request the same selection, while a link fault and 'stale'
 * describe the link itself, which no retry changes.
 */
const retryable = computed(
  () => pairFault.value === null && (status.value === 'failed' || status.value === 'idle'),
);

/** The page heading, focused on entry so a keyboard user starts at the top. */
const heading = ref<HTMLHeadingElement | null>(null);

/** The ready view's own region; what the focus guard below watches. */
const readyRegion = ref<HTMLElement | null>(null);

/** The error/state statement's region; watched by the same focus guard. */
const stateRegion = ref<HTMLElement | null>(null);

/** The pickers' region; what the pickers focus guard below watches. */
const pickersRegion = ref<HTMLElement | null>(null);

/** The failed statement's retry button; what the retry focus guard watches. */
const retryButton = ref<HTMLButtonElement | null>(null);

/** Set as the route is left, so the focus guard yields to the next route. */
let leaving = false;

// A generation replacement drops the ready view while keyboard focus may be
// inside it, and the unmount would silently drop focus to the document body
// (WCAG 2.4.3). Synchronous, because after the patch the focused element is
// already gone; scoped to the regions rather than the page, so a pick never
// yanks focus off the picker the reader is operating.
watch(
  status,
  (next) => {
    if (leaving) {
      return;
    }
    const leavesReadyRegion =
      next !== 'ready' && readyRegion.value?.contains(document.activeElement) === true;
    const leavesStateRegion =
      (next === 'loading' || next === 'ready') &&
      stateRegion.value?.contains(document.activeElement) === true;
    if (leavesReadyRegion || leavesStateRegion) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The same rescue for the pickers themselves: a committed generation can take
// the population away and unmount the very select the reader is operating
// (WCAG 2.4.3).
watch(
  pickersAvailable,
  (available) => {
    if (!available && !leaving && pickersRegion.value?.contains(document.activeElement) === true) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The retry button is its own case: only pairFault's flip removes it, which
// the status guards above cannot see (WCAG 2.4.3).
watch(
  retryable,
  (can) => {
    if (!can && !leaving && retryButton.value === document.activeElement) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

/**
 * Re-requests the selection the URL names; the failed state's retry. Focus
 * moves to the heading first, because the button this click came from unmounts
 * with the failed branch the moment the state returns to loading (WCAG 2.4.3).
 */
function retryOpen(): void {
  heading.value?.focus();
  void comparison.open(currentLeftPath.value, currentRightPath.value);
}

onMounted(() => {
  // Arriving from the inventory: the shell is already mounted, so nothing else
  // places focus, and this page's own mount is the moment its heading exists
  // (WCAG 2.4.3).
  heading.value?.focus();
});

/**
 * What the document title says this page is showing (WCAG 2.4.2): the
 * comparison, or the state that replaced it.
 */
const titleSubject = computed<string>(() => {
  if (pairFault.value !== null) {
    return hasSelection.value
      ? 'Link names no comparable declarations'
      : 'Link names no comparison';
  }
  switch (status.value) {
    case 'ready':
    case 'loading':
      return 'Comparing hook declarations';
    case 'stale':
      return 'Link not in this scan';
    case 'failed':
    case 'idle':
      return 'Comparison could not be loaded';
  }
  return 'Comparing hook declarations';
});
watchEffect(() => {
  // Reported as this page instance's own, so an outgoing page's unmount cannot
  // erase what this page just titled the tab with
  // (`SessionViewState.reportPageSubject`).
  pageOwnership.reportSubject(titleSubject.value);
});

onBeforeUnmount(() => {
  // Before the close, whose status change would otherwise trip the focus guard
  // while the next route owns focus.
  leaving = true;
  // Leaving the route drops the declarations this page requested; the title
  // subject is `usePageOwnership`'s to release, after unmount, where a
  // replacement page's own report stands.
  comparison.close();
});
</script>

<template>
  <div class="aci-hook-compare">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the hook list
         rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=hook">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">Compare hook declarations</h2>

    <!-- The comparison's subject: the declared event whose row owns it, in the
         carriers' own spelling (FR-007) — the same heading rule its inventory
         row uses. -->
    <p
      v-if="subjectEventText !== null && pairFault === null"
      class="aci-hook-compare__event"
      :class="subjectEventIsAuthored ? 'aci-authored-text' : 'aci-muted'"
    >
      {{ subjectEventText }}
    </p>

    <!-- Stable rather than inserted with the state it reports, because a region
         that appears together with its message is not reliably read
         (WCAG 4.1.3). -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>

    <!-- The pickers: a comparison stays inside the one event row that owns it,
         so what a reader chooses is which of that row's carriers stands on each
         side — the same per-side motion as the sibling surfaces, under the same
         rule: only a row with more than two comparable carriers offers a move.
         Native selects, each labelled through `for`/`id` (WCAG 2.4.6). -->
    <div v-if="pickersAvailable" ref="pickersRegion" class="aci-hook-compare__pickers">
      <div class="aci-hook-compare__picker">
        <label for="aci-hook-compare-first">First hook file</label>
        <select id="aci-hook-compare-first" v-model="leftSelection">
          <!-- The other side's file is unselectable — the two sides would hold
               one file (FR-011). -->
          <option
            v-for="path in comparablePaths"
            :key="path"
            :value="path"
            :disabled="path !== currentLeftPath && path === currentRightPath"
          >
            {{ inlinePresentationLabel(path) }}
          </option>
        </select>
      </div>
      <div class="aci-hook-compare__picker">
        <label for="aci-hook-compare-second">Second hook file</label>
        <select id="aci-hook-compare-second" v-model="rightSelection">
          <option
            v-for="path in comparablePaths"
            :key="path"
            :value="path"
            :disabled="path !== currentRightPath && path === currentLeftPath"
          >
            {{ inlinePresentationLabel(path) }}
          </option>
        </select>
      </div>
    </div>

    <!-- The ready view leads the branch chain so its one bundled projection is
         evaluated on every render (see readyView). One wrapper, so the focus
         guard can ask whether focus is inside the region a generation
         replacement unmounts. -->
    <div v-if="readyView !== null" ref="readyRegion">
      <RecognitionComparison
        :event="readyView.event"
        :left-detail="readyView.left"
        :right-detail="readyView.right"
        :left-attribution="readyView.leftAttribution"
        :right-attribution="readyView.rightAttribution"
      />
    </div>

    <template v-else-if="status === 'loading'">
      <p class="aci-empty">Loading this comparison…</p>
    </template>

    <!-- One wrapper for the statement view too, so the focus guard can ask
         whether focus sits on a control an automatic refresh is about to
         unmount (WCAG 2.4.3). -->
    <div v-else-if="stateStatement !== null" ref="stateRegion">
      <p :class="retryable ? 'aci-error' : 'aci-note'">{{ stateStatement }}</p>
      <p v-if="retryable">
        <button ref="retryButton" type="button" @click="retryOpen">Try again</button>
      </p>
      <p>
        <NuxtLink to="/?kind=hook"
          >Return to the inventory and open a comparison from a hook row.</NuxtLink
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.aci-hook-compare {
  display: flex;
  flex-direction: column;
}

.aci-hook-compare > p:first-child {
  margin: 0;
}

.aci-hook-compare h2 {
  margin: 0.25rem 0 0.5rem;
}

/* The subject line reads as the row heading it repeats: the declared event,
   emphasized over the state copy around it. */
.aci-hook-compare__event {
  font-weight: 600;
  margin: 0 0 0.25rem;
}

/* The two pickers side by side, stacking on a narrow viewport; the selects
   shrink inside their columns rather than widening the page (WCAG 1.4.10). */
.aci-hook-compare__pickers {
  display: grid;
  gap: 0.5rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  margin-block: 0.25rem;
}

@media (min-width: 52rem) {
  .aci-hook-compare__pickers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-hook-compare__picker {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.aci-hook-compare__pickers select {
  max-inline-size: 100%;
}
</style>
