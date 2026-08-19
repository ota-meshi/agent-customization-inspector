<script setup lang="ts">
// The instruction comparison route (T278; FR-011, FR-012): two instruction
// files of one applicability-range row compared whole — their complete
// literal sources as one diff and their recognition metadata as typed rows,
// with no verdict, no merge, and no fix anywhere.
//
// The route is the instruction kind's, not a shared one: comparison is
// kind-specific (spec.md § Clarifications Session 2026-08-14), and each
// family's comparison phase designs its own surface. What the kinds share is
// the row-owned pair the skill precedent establishes: a comparison is opened
// from an inventory row and stays inside what that row holds — for skills
// one name's copies, here one applicability range's files. An instruction
// file is complete in itself, so there is no copy directory and no
// corresponding-file coordinate: the row's files are compared whole, and the
// pickers move the two sides among that row's files alone.
//
// The URL carries the model's own coordinates —
// `/instructions/compare?left=<path>&right=<path>` — the two files named by
// their Source-relative Paths, the identity the inventory rows and the
// detail route already use (FR-030); the owning range is derived from them,
// because a file governs exactly one range. A pair the model cannot
// express — one file twice, a pair no single range row holds — is reported,
// never opened. The link survives rescans and server launches, resolving
// against whatever generation is current. Direct loads boot the shell
// first, so this page always opens against an adopted snapshot.
//
// Like the instruction detail, this is a surface that shows file contents
// exactly as authored — credentials included, with nothing masked and no
// control that would uncover a masked value — and it says none of that
// (FR-027).
//
// Three things drop the open comparison, and all three are the same cleanup
// the comparison state owns: leaving the route closes it, a client-data
// purge clears it, and a commit drops the previous generation's view while
// this page re-requests the same pair under the new snapshot (FR-030).
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
import RecognitionComparison from '../../components/instruction-comparison/RecognitionComparison.vue';
import SourceDiff from '../../components/instruction-comparison/SourceDiff.vue';
import { InstructionRecognitionComparison } from '../../components/instruction-comparison/recognition-comparison';
import { instructionComparisonRouteFor } from '../../composables/instruction-comparison';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import {
  escapeControlCharacters,
  FILE_ENCODING_TEXT,
  inlinePresentationLabel,
  isReadableFile,
} from '../../../shared/entities';
import { FILE_DETAIL_KIND_TEXT } from '../../../shared/api-text';
import type {
  FileDetailDto,
  InstructionInventoryEntryDto,
  InstructionRecognitionDto,
} from '../../../shared/api-types';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats rendering a comparison page with no
  // session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const comparison = sessionViewState.instructionComparison;
const snapshot = sessionViewState.snapshot;
const status = comparison.status;

const route = useRoute();
const router = useRouter();

/**
 * One query parameter as the single path it names. A repeated parameter
 * arrives as an array; this route's are not repeated, so the array form
 * folds to its first value rather than being a case.
 */
function queryPath(name: string): string {
  const parameter = route.query[name];
  if (typeof parameter === 'string') {
    return parameter;
  }
  return Array.isArray(parameter) && typeof parameter[0] === 'string' ? parameter[0] : '';
}

/** The first compared file's Source-relative Path (FR-030). */
const leftPath = computed(() => queryPath('left'));
/** The second compared file's Source-relative Path (FR-030). */
const rightPath = computed(() => queryPath('right'));

/** Whether the URL names a pair at all; without one there is nothing to open. */
const hasPair = computed(() => leftPath.value !== '' && rightPath.value !== '');

/**
 * The coordinates most recently requested by a picker and not yet reflected
 * by the route. `router.replace` commits asynchronously, so two rapid picks
 * can land inside one navigation: a second pick that composed with the route
 * alone would compose with the coordinates being replaced and silently undo
 * the first. Every picker reads and composes through this pending value
 * first; the watch below clears it the moment the route has caught up, so
 * the route stays the identity and this ref is only the gap-filler.
 */
const pendingPair = shallowRef<{ readonly left: string; readonly right: string } | null>(null);

// The route caught up (or the reader navigated): the query is the truth
// again, and a pending value kept past this point would shadow it.
watch([leftPath, rightPath], () => {
  pendingPair.value = null;
});

/** The pending-aware current coordinates; the route's, once it has caught up. */
const currentLeftPath = computed(() => pendingPair.value?.left ?? leftPath.value);
const currentRightPath = computed(() => pendingPair.value?.right ?? rightPath.value);

/**
 * Replaces the compared coordinates in place. `replace` rather than `push`:
 * stepping through pairs is this page's working motion, and a history entry
 * per pick would make the back button replay every pair the reader stepped
 * through on the way.
 */
function switchTo(left: string, right: string): void {
  pendingPair.value = { left, right };
  void router.replace(instructionComparisonRouteFor(left, right));
}

/** The committed readable paths — the comparison-eligible files (FR-025). */
const readablePaths = computed(
  () =>
    new Set(
      (snapshot.value?.files ?? []).filter(isReadableFile).map((file) => file.sourceRelativePath),
    ),
);

/**
 * The one inventory row owning the pair: both identities are files of one
 * applicability-range row — the population this model can express, exactly
 * as a skill pair is owned by one name's row. A file governs exactly one
 * range, so at most one row can hold both. Null when no row holds both,
 * which the template reports instead of comparing: a pair spanning two
 * ranges, one file twice, or an identity the current scan does not hold is
 * not a comparison this model expresses (FR-011).
 */
const owningRow = computed<InstructionInventoryEntryDto | null>(() => {
  if (!hasPair.value || currentLeftPath.value === currentRightPath.value) {
    return null;
  }
  return (
    (snapshot.value?.instructions ?? []).find((entry) => {
      const paths = new Set(entry.files.map((file) => file.sourceRelativePath));
      return paths.has(currentLeftPath.value) && paths.has(currentRightPath.value);
    }) ?? null
  );
});

/**
 * The paths the pickers offer: the owning row's files with readable source,
 * in the row's published order. A diagnostic-only candidate is not
 * comparison-selectable (US3 scenario 4), and a file of another range row is
 * outside the pair the row owns — stepping to another range goes through its
 * own row's entry link, exactly as a skill pair never leaves its name's row.
 */
const comparablePaths = computed<readonly string[]>(() =>
  (owningRow.value?.files ?? [])
    .map((file) => file.sourceRelativePath)
    .filter((path) => readablePaths.value.has(path)),
);

/**
 * Whether the pickers render: only a row with more than two comparable files
 * has a file to move a side to — with exactly two, both already stand on the
 * two sides and each selector would offer nothing but its own value — dead
 * controls, exactly the skill surface's copy-switcher rule (T200).
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
 * What is wrong with the link's coordinates, before any request — the
 * model's own validation, reported instead of a comparison. Null when the
 * pair is the model's: two distinct Source-relative Paths one
 * applicability-range row of the current generation holds.
 */
const pairFault = computed<string | null>(() => {
  if (!hasPair.value) {
    return 'This link names no pair of instruction files. Open a comparison from an instruction row in the inventory, or from an instruction file’s detail page.';
  }
  if (currentLeftPath.value === currentRightPath.value) {
    return 'A comparison needs two distinct instruction files, and this link names the same file twice.';
  }
  if (owningRow.value === null) {
    // One statement for every way no row holds both — a pair spanning two
    // ranges, a path that is not an instruction file's, or an identity the
    // current scan does not hold — exactly as the skill route reports a pair
    // no name's row owns.
    return 'No applicability range in the current scan holds both of this link’s files. The inventory may have changed since the link was made; open a comparison from an instruction row.';
  }
  return null;
});

// One effect owns "which pair should be open", so entering the route, a URL
// edit, a pick, and a committed generation all take the same path. The
// committed generations are part of the key for the same reason the skill
// compare route's watch documents: adopting a newer one drops the open
// comparison while the coordinates stay identical, so their change is what
// re-requests the same pair under the new snapshot. Declared after the model
// computeds because its immediate run consults them.
watch(
  [
    leftPath,
    rightPath,
    (): number => snapshot.value?.repositoryGeneration ?? 0,
    (): number | null => snapshot.value?.globalGeneration ?? null,
  ],
  () => {
    if (pairFault.value !== null) {
      // The coordinates are outside the model; the template reports the
      // fault ({@link pairFault}) instead of a comparison.
      comparison.close();
      return;
    }
    void comparison.open(currentLeftPath.value, currentRightPath.value);
  },
  { immediate: true },
);

/**
 * What one compared file is, beside its path: its Source family, its
 * recognized kind, and its read outcome (US3 scenario 1). Every Source of
 * this release is the repository's, so the family is stated directly rather
 * than resolved through a lookup whose miss branch could name no producer;
 * the global phases that add other Sources add the label's derivation with
 * them (spec.md § User Story 4).
 */
function fileFacts(detail: FileDetailDto): string {
  const facts = [
    'Repository',
    FILE_DETAIL_KIND_TEXT[detail.kind],
    FILE_ENCODING_TEXT[detail.file.encoding],
  ];
  if (detail.file.encoding !== 'unknown') {
    facts.push(`${detail.file.sizeBytes} bytes`);
  }
  return facts.join(' · ');
}

/**
 * The whole ready view as one derivation, null outside 'ready': the two
 * identity sides, the diff input (the complete texts, guarded by the same
 * readable-variant check the comparison state enforces so `sourceText` is
 * never reached on a variant that lacks it), and the recognition comparison.
 *
 * One computed rather than one per projection, because its release is its
 * next read: a dirty computed retains its previous value until then, and a
 * per-projection computed that only the ready branch reads would keep the
 * last pair's authored content cached behind an error statement for as long
 * as the page shows one (FR-027). Bundled here and read by the template's
 * first branch condition on every render, the view re-derives to null on
 * the first render after leaving 'ready' — the same flush that takes the
 * rendered content out of the DOM.
 */
const readyView = computed(() => {
  if (status.value !== 'ready') {
    return null;
  }
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (left === null || right === null) {
    // A torn frame between a snapshot replacement and the re-request it
    // triggers: without both sides there is no pair to show, whatever the
    // status still says.
    return null;
  }
  if (!isReadableFile(left.file) || !isReadableFile(right.file)) {
    return null;
  }
  // The inventory's recognitions of one compared file, resolved from the
  // owning row the pair already stands on: the row is where the facts live
  // (FR-030), so no second per-path lookup is built beside it.
  const recognitionsOf = (path: string): readonly InstructionRecognitionDto[] =>
    owningRow.value?.files.find((file) => file.sourceRelativePath === path)?.recognitions ?? [];
  return {
    sides: [
      { caption: 'First file', path: currentLeftPath.value, detail: left },
      { caption: 'Second file', path: currentRightPath.value, detail: right },
    ] as const,
    diff: {
      originalText: left.file.sourceText,
      originalPath: currentLeftPath.value,
      modifiedText: right.file.sourceText,
      modifiedPath: currentRightPath.value,
    },
    recognition: new InstructionRecognitionComparison(
      { detail: left, recognitions: recognitionsOf(currentLeftPath.value) },
      { detail: right, recognitions: recognitionsOf(currentRightPath.value) },
    ),
  };
});

/**
 * What this page says for the state it is in — one value read by both the
 * visible copy and the live region, so what a reader hears is the sentence
 * on the screen (WCAG 4.1.3). A link fault outranks the request status;
 * empty for 'ready', whose content is read as focus moves through it, and
 * for 'loading', which has its own phrase.
 */
const stateStatement = computed<string | null>(() => {
  const fault = pairFault.value;
  if (fault !== null) {
    return fault;
  }
  switch (status.value) {
    case 'same-path':
      // Unreachable from this page — the same fault is decided before any
      // request — but the state is the composable's contract, and an arm
      // must say something.
      return 'A comparison needs two distinct instruction files, and this link names the same file twice.';
    case 'stale':
      return 'Nothing in the current scan sits at one of this link’s paths. The inventory may have changed since the link was made; a rescan that brings the file back will make it resolve again.';
    case 'not-readable':
      // Through the pickers' own spelling ({@link inlinePresentationLabel}),
      // because this paragraph collapses whitespace: a path with
      // consecutive, leading, or trailing spaces would otherwise be
      // announced under a different spelling than the file it names
      // (FR-025).
      return `This file has no readable source text to compare: ${inlinePresentationLabel(
        comparison.unreadablePath.value ?? '',
      )}`;
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
 * What the polite live region announces; see {@link stateStatement}. Unlike
 * the statement, 'loading' and 'ready' announce themselves: a reader
 * stepping the pickers holds focus on a select, so without a completion
 * phrase nothing would say the comparison behind it changed (WCAG 4.1.3).
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
 * 'idle' both re-request the same pair, while a link fault, 'stale', and
 * 'not-readable' describe the link itself, which no retry changes.
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
// inside it — in the diff editor above all — and the unmount would silently
// drop focus to the document body (WCAG 2.4.3). Synchronous, because after
// the patch the focused element is already gone. Scoped to the regions
// rather than the page, so a pick — which also leaves 'ready' for a
// moment — never yanks focus off the picker the reader is operating. The
// statement region is guarded the same way: a stale statement's automatic
// session refresh can adopt a newer generation while focus sits on the
// region's inventory link, and the return to 'loading' unmounts that link
// too.
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

// The same rescue for the pickers themselves: a committed generation can
// take the population away — the pair's files left the inventory, so the
// fault statement replaces the pickers — and unmount the very select the
// reader is operating (WCAG 2.4.3). Synchronous for the same reason.
watch(
  pickersAvailable,
  (available) => {
    if (!available && !leaving && pickersRegion.value?.contains(document.activeElement) === true) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The retry button is its own case: a committed generation can take the
// pair's validity away while the reader is focused on it — 'failed' settles
// to 'idle' through the close, so the status guards above see no unmounting
// transition, and only pairFault's flip removes the button (WCAG 2.4.3).
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
 * Re-requests the pair the URL names; the failed state's retry. Focus moves
 * to the heading first, because the button this click came from unmounts
 * with the failed branch the moment the state returns to loading, and focus
 * would drop to the document body (WCAG 2.4.3).
 */
function retryOpen(): void {
  heading.value?.focus();
  void comparison.open(currentLeftPath.value, currentRightPath.value);
}

onMounted(() => {
  // Arriving from the inventory: the shell is already mounted, so nothing
  // else places focus, and this page's own mount is the moment its heading
  // exists (WCAG 2.4.3).
  heading.value?.focus();
});

/**
 * What the document title says this page is showing (WCAG 2.4.2): the
 * comparison, or the state that replaced it — a reader returning to a tab
 * must not find a title claiming a comparison the page no longer shows.
 */
const titleSubject = computed<string>(() => {
  if (pairFault.value !== null) {
    return hasPair.value ? 'Link names no comparable pair' : 'Link names no comparison';
  }
  switch (status.value) {
    case 'ready':
    case 'loading':
      return 'Comparing instruction files';
    case 'stale':
      return 'Link not in this scan';
    case 'same-path':
      return 'Comparison needs two distinct files';
    case 'not-readable':
      return 'Comparison needs readable files';
    case 'failed':
    case 'idle':
      return 'Comparison could not be loaded';
  }
  return 'Comparing instruction files';
});
watchEffect(() => {
  sessionViewState.pageSubject.value = titleSubject.value;
});

onBeforeUnmount(() => {
  // Before the close, whose status change would otherwise trip the focus
  // guard while the next route owns focus.
  leaving = true;
  // Leaving the route drops the authored sources this page requested, and
  // the title subject with it.
  sessionViewState.pageSubject.value = null;
  comparison.close();
});
</script>

<template>
  <div class="aci-instruction-compare">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the
         instructions list rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=instructions">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">Compare instruction files</h2>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read
         (WCAG 4.1.3). -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>

    <!-- The pickers: a comparison stays inside the one range row that owns
         the pair, so what a reader chooses is which of that row's files
         stands on each side — the same per-side motion as the skill
         surface's copy switchers, and shown under the same rule: only a row
         with more than two comparable files offers a move, and stepping the
         sides through it is how three or more files are reviewed pair by
         pair. Present whenever the coordinates are the model's — the
         not-readable state included, which is exactly the state a pick
         recovers from — while a link fault ({@link pairFault}) renders the
         report alone. Native selects, each labelled through `for`/`id`
         rather than a wrapping label (WCAG 2.4.6). -->
    <div v-if="pickersAvailable" ref="pickersRegion" class="aci-instruction-compare__pickers">
      <div class="aci-instruction-compare__picker">
        <label for="aci-instruction-compare-first">First instruction file</label>
        <select id="aci-instruction-compare-first" v-model="leftSelection">
          <!-- The other side's file is unselectable — the two sides would
               hold one file (FR-011). -->
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
      <div class="aci-instruction-compare__picker">
        <label for="aci-instruction-compare-second">Second instruction file</label>
        <select id="aci-instruction-compare-second" v-model="rightSelection">
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

    <!-- The ready view leads the branch chain so its one bundled projection
         is evaluated on every render — that read is what re-derives it to
         null after leaving 'ready' (see readyView). One wrapper, so the
         focus guard can ask whether focus is inside the region a generation
         replacement unmounts. -->
    <div v-if="readyView !== null" ref="readyRegion">
      <!-- Each side stated with its own identity — path, Source, file type,
           read outcome — so neither file loses it to the diff
           (US3 scenario 1). The order is the link's: first named, first
           shown. -->
      <div class="aci-instruction-compare__files">
        <section v-for="side in readyView.sides" :key="side.caption">
          <h3>{{ side.caption }}</h3>
          <p class="aci-instruction-compare__file-path aci-path aci-authored-text">
            {{ escapeControlCharacters(side.path) }}
          </p>
          <p class="aci-instruction-compare__file-facts aci-note">
            {{ fileFacts(side.detail) }}
          </p>
        </section>
      </div>

      <h3>Source comparison</h3>
      <SourceDiff v-bind="readyView.diff" />

      <!-- The component owns its two section headings — tool recognition and
           declared metadata are two facts with two homes (research.md § 7). -->
      <RecognitionComparison :comparison="readyView.recognition" />
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
        <NuxtLink to="/?kind=instructions"
          >Return to the inventory and open a comparison from an instruction row.</NuxtLink
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.aci-instruction-compare {
  display: flex;
  flex-direction: column;
}

.aci-instruction-compare > p:first-child {
  margin: 0;
}

.aci-instruction-compare h2 {
  margin: 0.25rem 0 0.5rem;
}

.aci-instruction-compare h3 {
  font-size: 1rem;
  margin: 0.75rem 0 0.25rem;
}

/* The two pickers side by side, stacking on a narrow viewport. Each label is
   a column so the select sits under its name, and the selects shrink inside
   their columns rather than widening the page (WCAG 1.4.10). */
.aci-instruction-compare__pickers {
  display: grid;
  gap: 0.5rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  margin-block: 0.25rem;
}

@media (min-width: 52rem) {
  .aci-instruction-compare__pickers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-instruction-compare__picker {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.aci-instruction-compare__pickers select {
  max-inline-size: 100%;
}

/* The two identities side by side above the diff, stacking on a narrow
   viewport (WCAG 1.4.10). */
.aci-instruction-compare__files {
  display: grid;
  gap: 0.25rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-instruction-compare__files {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-instruction-compare__files h3 {
  margin: 0.5rem 0 0.1rem;
}

.aci-instruction-compare__files p {
  margin: 0.1rem 0;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-instruction-compare__file-path {
  overflow-wrap: anywhere;
}
</style>
