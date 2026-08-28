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
// `/instructions/compare/<family>?leftSource=…&left=…&rightSource=…&right=…` —
// the two files named by their whole identity, each its own Source and
// Source-relative Path (FR-030), inside the family they are both of. The owning
// range is derived from them, because a file governs exactly one range within
// its Source.
//
// The family is the boundary, not one Source: a family can hold two consented
// homes, and comparing what each of them says is the point of grouping them
// together. What no block holds is a pair spanning two families — the
// repository and a home are different kinds of place — and a pair the model
// cannot express, including one file twice or a Source this session does not
// carry, is reported rather than opened. The link survives rescans and server launches, resolving
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
import { sourceIdOf, type ComparisonSide, querySideOf } from '../../../components/detail-route';
import {
  comparisonSideOptions,
  pickedSideOf,
  sideValueOf,
} from '../../../components/comparison-side-picker';
import { sourceFactsOf } from '../../../components/source-name';
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
import RecognitionComparison from '../../../components/instruction-comparison/RecognitionComparison.vue';
import SourceDiff from '../../../components/instruction-comparison/SourceDiff.vue';
import { InstructionRecognitionComparison } from '../../../components/instruction-comparison/recognition-comparison';
import { instructionComparisonRouteFor } from '../../../composables/instruction-comparison';
import { SESSION_VIEW_STATE } from '../../../session/view-state';
import { usePageOwnership } from '../../../composables/page-ownership';
import { useSessionSources } from '../../../composables/session-sources';
import {
  escapeControlCharacters,
  FILE_ENCODING_TEXT,
  inlinePresentationLabel,
  isReadableFile,
} from '../../../../shared/entities';
import { FILE_DETAIL_KIND_TEXT } from '../../../../shared/api-text';
import type {
  FileDetailDto,
  InstructionInventoryEntryDto,
  FileRecognitionDto,
  SourceKind,
} from '../../../../shared/api-types';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats rendering a comparison page with no
  // session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const comparison = sessionViewState.instructionComparison;
const snapshot = sessionViewState.snapshot;

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/** The published Sources; what every identity below resolves against. */
const sources = sessionSources.sources;
const status = comparison.status;

const route = useRoute();

const pageOwnership = usePageOwnership();
const router = useRouter();

/**
 * The Source family the address names, or null for a segment outside the two
 * this product issues. The family leads the address rather than a Source,
 * because a pair stays inside one family and can hold two of its Sources
 * (`instruction-comparison.ts` § instructionComparisonRouteFor); a null
 * resolves nothing, and the template reports the link instead of comparing.
 */
const family = computed<SourceKind | null>(() => {
  for (const candidate of ['repository', 'global'] as const) {
    if (candidate === route.params['family']) {
      return candidate;
    }
  }
  return null;
});

/** The first compared file's whole identity (FR-030). */
const leftSide = computed(() => querySideOf(route.query, 'leftSource', 'left'));
/** The second compared file's whole identity (FR-030). */
const rightSide = computed(() => querySideOf(route.query, 'rightSource', 'right'));

/** Whether the URL names a pair at all; without one there is nothing to open. */
const hasPair = computed(() => leftSide.value !== null && rightSide.value !== null);

/**
 * The coordinates most recently requested by a picker and not yet reflected
 * by the route. `router.replace` commits asynchronously, so two rapid picks
 * can land inside one navigation: a second pick that composed with the route
 * alone would compose with the coordinates being replaced and silently undo
 * the first. Every picker reads and composes through this pending value
 * first; the watch below clears it the moment the route has caught up, so
 * the route stays the identity and this ref is only the gap-filler.
 */
const pendingPair = shallowRef<{
  readonly left: ComparisonSide;
  readonly right: ComparisonSide;
} | null>(null);

// The route caught up (or the reader navigated): the query is the truth
// again, and a pending value kept past this point would shadow it.
watch([leftSide, rightSide], () => {
  pendingPair.value = null;
});

/** The pending-aware current coordinates; the route's, once it has caught up. */
const currentLeft = computed(() => pendingPair.value?.left ?? leftSide.value);
const currentRight = computed(() => pendingPair.value?.right ?? rightSide.value);

/**
 * Replaces the compared coordinates in place. `replace` rather than `push`:
 * stepping through pairs is this page's working motion, and a history entry
 * per pick would make the back button replay every pair the reader stepped
 * through on the way.
 */
function switchTo(left: ComparisonSide, right: ComparisonSide): void {
  if (family.value === null) {
    // Unreachable: the pickers render only behind a null `pairFault`, which an
    // unreadable family segment is one of. The guard is what lets this build the
    // address without a fallback family that would move the reader to another
    // block's comparison.
    return;
  }
  pendingPair.value = { left, right };
  void router.replace(instructionComparisonRouteFor(family.value, left, right));
}

/**
 * The committed readable files of each Source, by path — the
 * comparison-eligible population (FR-025) the sides resolve against, keyed by
 * Source first because two Sources can hold one spelling (FR-030).
 */
const readableIdentities = computed(() => {
  const bySource = new Map<string, Set<string>>();
  for (const file of snapshot.value?.files ?? []) {
    if (!isReadableFile(file)) {
      continue;
    }
    let paths = bySource.get(file.sourceId);
    if (paths === undefined) {
      paths = new Set();
      bySource.set(file.sourceId, paths);
    }
    paths.add(file.sourceRelativePath);
  }
  return bySource;
});

/**
 * Which family each published Source belongs to, so a row's own `sourceId`
 * resolves to the family the address is stated in (FR-030).
 */
const familyBySourceId = computed(() => {
  const byId = new Map<string, SourceKind>();
  for (const source of sources.value) {
    byId.set(source.sourceId, source.kind);
  }
  return byId;
});

/** Whether the addressed family holds that file, readable, in this generation. */
function isComparable(side: ComparisonSide | null): boolean {
  if (side === null) {
    return false;
  }
  const sourceId = sourceIdOf(snapshot.value?.sources ?? [], side.source);
  return (
    sourceId !== null &&
    readableIdentities.value.get(sourceId)?.has(side.sourceRelativePath) === true
  );
}

/**
 * The rows the pair's block is made of: every row of the addressed family
 * governing one range, which both sides' files belong to. Empty when no block
 * holds both, which the template reports instead of comparing: a pair spanning
 * two ranges or two families, one file twice, or an identity the current scan
 * does not hold is not a comparison this model expresses (FR-011).
 *
 * A file governs exactly one range within its Source, so at most one range can
 * hold both sides — and the family narrows it to the one block a reader clicked
 * from.
 */
const owningBlock = computed<readonly InstructionInventoryEntryDto[]>(() => {
  const left = currentLeft.value;
  const right = currentRight.value;
  if (
    family.value === null ||
    left === null ||
    right === null ||
    (left.source === right.source && left.sourceRelativePath === right.sourceRelativePath)
  ) {
    return [];
  }
  const holds = (entry: InstructionInventoryEntryDto, side: ComparisonSide): boolean =>
    sourceIdOf(snapshot.value?.sources ?? [], side.source) === entry.sourceId &&
    entry.files.some((file) => file.sourceRelativePath === side.sourceRelativePath);
  for (const entry of snapshot.value?.instructions ?? []) {
    if (familyBySourceId.value.get(entry.sourceId) !== family.value) {
      // Another family's row. Its files may carry these very paths, and
      // comparing them under this address would show one family's files under
      // the other's (FR-030).
      continue;
    }
    if (!holds(entry, left) && !holds(entry, right)) {
      continue;
    }
    // The block is every row of this family at that range, because the pair may
    // span two of its Sources.
    const block = (snapshot.value?.instructions ?? []).filter(
      (candidate) =>
        candidate.applicabilityRange === entry.applicabilityRange &&
        familyBySourceId.value.get(candidate.sourceId) === family.value,
    );
    return block.some((candidate) => holds(candidate, left)) &&
      block.some((candidate) => holds(candidate, right))
      ? block
      : [];
  }
  return [];
});

/**
 * The identities the pickers offer: the block's files with readable source, in
 * the published Source order and then each row's own order. A diagnostic-only
 * candidate is not comparison-selectable (US3 scenario 4), and a file of another
 * range or another family is outside the pair the block owns — stepping there
 * goes through its own block's entry link, exactly as a skill pair never leaves
 * its name's row.
 */
const comparableSides = computed<readonly ComparisonSide[]>(() =>
  owningBlock.value.flatMap((entry) => {
    const selector = sessionSources.selectorOf(entry.sourceId);
    return entry.files.flatMap((file) => {
      const side = { source: selector, sourceRelativePath: file.sourceRelativePath };
      return isComparable(side) ? [side] : [];
    });
  }),
);

/**
 * The pickers' options over the offered identities, and the two lookups the
 * bindings go through — one shared implementation for every comparison page
 * (`comparison-side-picker.ts`).
 */
const pickerOptions = computed(() => comparisonSideOptions(sources.value, comparableSides.value));

/** The offered identity one picker value names ({@link pickedSideOf}). */
const pickedSide = (value: string): ComparisonSide | null =>
  pickedSideOf(pickerOptions.value, value);

/** The picker value one side stands on ({@link sideValueOf}). */
const valueOf = (side: ComparisonSide | null): string => sideValueOf(pickerOptions.value, side);

/** The first side's picker binding; a pick moves the `left` coordinate. */
const leftSelection = computed({
  get: () => valueOf(currentLeft.value),
  set: (value: string) => {
    const picked = pickedSide(value);
    const right = currentRight.value;
    if (picked !== null && right !== null) {
      switchTo(picked, right);
    }
  },
});

/** The second side's picker binding; a pick moves the `right` coordinate. */
const rightSelection = computed({
  get: () => valueOf(currentRight.value),
  set: (value: string) => {
    const picked = pickedSide(value);
    const left = currentLeft.value;
    if (picked !== null && left !== null) {
      switchTo(left, picked);
    }
  },
});

/**
 * Whether the pickers render: only a block with more than two comparable files
 * has a file to move a side to — with exactly two, both already stand on the
 * two sides and each selector would offer nothing but its own value — dead
 * controls, exactly the skill surface's copy-switcher rule (T200).
 */
const pickersAvailable = computed(
  () => pairFault.value === null && comparableSides.value.length > 2,
);

/**
 * What is wrong with the link's coordinates, before any request — the
 * model's own validation, reported instead of a comparison. Null when the
 * pair is the model's: two distinct Source-relative Paths one
 * applicability-range row of the current generation holds.
 */
const pairFault = computed<string | null>(() => {
  if (family.value === null) {
    return 'This link does not say where its files came from. Open a comparison from an instruction row in the inventory, or from an instruction file’s detail page.';
  }
  if (!hasPair.value) {
    return 'This link names no pair of instruction files. Open a comparison from an instruction row in the inventory, or from an instruction file’s detail page.';
  }
  const left = currentLeft.value;
  const right = currentRight.value;
  if (
    left !== null &&
    right !== null &&
    left.source === right.source &&
    left.sourceRelativePath === right.sourceRelativePath
  ) {
    return 'A comparison needs two distinct instruction files, and this link names the same file twice.';
  }
  if (owningBlock.value.length === 0) {
    // One statement for every way no block holds both — a pair spanning two
    // ranges or two families, a path that is not an instruction file's, or an
    // identity the current scan does not hold, including a Source it no longer
    // carries — exactly as the skill route reports a pair no name's row owns.
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
    family,
    leftSide,
    rightSide,
    // Only the addressed family's own sequence: a commit invalidates only its
    // own sequence's views (FR-030, spec.md § Clarifications Session
    // 2026-07-22), so a Global commit must not re-request — and re-mount — a
    // repository comparison whose generation did not move.
    (): number | null =>
      family.value === 'global'
        ? (snapshot.value?.globalGeneration ?? null)
        : (snapshot.value?.repositoryGeneration ?? 0),
  ],
  () => {
    const left = currentLeft.value;
    const right = currentRight.value;
    if (pairFault.value !== null || left === null || right === null) {
      // The coordinates are outside the model; the template reports the fault
      // ({@link pairFault}) instead of a comparison. The two sides are checked
      // again for the compiler: a missing one is among those faults, and the
      // open below takes whole identities.
      comparison.close();
      return;
    }
    void comparison.open(left, right);
  },
  { immediate: true },
);

/**
 * What one compared file is, beside its path: the family it is of, the
 * directory it was in where the family holds more than one, its recognized
 * kind, and its read outcome (US3 scenario 1) — the Source half through the
 * shared facts helper, per side rather than per pair, because the two sides
 * can be two consented homes (`source-name.ts` § sourceFactsOf).
 */
function fileFacts(detail: FileDetailDto): string {
  const facts = [
    ...sourceFactsOf(sources.value, detail.file.sourceId),
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
  const recognitionsOf = (file: FileDetailDto['file']): readonly FileRecognitionDto[] => {
    for (const entry of owningBlock.value) {
      if (entry.sourceId !== file.sourceId) {
        continue;
      }
      for (const listed of entry.files) {
        if (listed.sourceRelativePath === file.sourceRelativePath) {
          return listed.recognitions;
        }
      }
    }
    return [];
  };
  // Every rendered coordinate is the adopted detail's own path, never the
  // pending-aware picker coordinate: a pick updates the coordinates one
  // render before the re-request drops this view, and labelling the old
  // details with the new paths would put one file's authored source under
  // another file's name for that frame (FR-025, FR-030).
  const leftDetailPath = left.file.sourceRelativePath;
  const rightDetailPath = right.file.sourceRelativePath;
  return {
    sides: [
      { caption: 'First file', path: leftDetailPath, detail: left },
      { caption: 'Second file', path: rightDetailPath, detail: right },
    ] as const,
    diff: {
      originalText: left.file.sourceText,
      originalPath: leftDetailPath,
      modifiedText: right.file.sourceText,
      modifiedPath: rightDetailPath,
    },
    recognition: new InstructionRecognitionComparison(
      { detail: left, recognitions: recognitionsOf(left.file) },
      { detail: right, recognitions: recognitionsOf(right.file) },
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
  const left = currentLeft.value;
  const right = currentRight.value;
  if (left === null || right === null) {
    // Unreachable: the retry control renders only behind a null `pairFault`.
    return;
  }
  void comparison.open(left, right);
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
  // Reported as this page instance's own, so an outgoing page's unmount
  // cannot erase what this page just titled the tab with
  // (`SessionViewState.reportPageSubject`).
  pageOwnership.reportSubject(titleSubject.value);
});

onBeforeUnmount(() => {
  // Before the close, whose status change would otherwise trip the focus
  // guard while the next route owns focus.
  leaving = true;
  // Leaving the route drops the authored sources this page requested; the
  // title subject is `usePageOwnership`'s to release, after unmount, where a
  // replacement page's own report stands.
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
               hold one file (FR-011). An option is one whole identity, so its
               value is the offered position and the page maps it back: a
               `<select>` carries a string, and a Source and a path are two. -->
          <option
            v-for="option in pickerOptions"
            :key="option.value"
            :value="option.value"
            :disabled="option.value !== leftSelection && option.value === rightSelection"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="aci-instruction-compare__picker">
        <label for="aci-instruction-compare-second">Second instruction file</label>
        <select id="aci-instruction-compare-second" v-model="rightSelection">
          <option
            v-for="option in pickerOptions"
            :key="option.value"
            :value="option.value"
            :disabled="option.value !== rightSelection && option.value === leftSelection"
          >
            {{ option.label }}
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

      <!-- The component owns the section order — the declarations, the body,
           the complete files it takes below through the `source` slot, and
           last the recognitions (research.md § 7). What the source diff is
           stays this page's. -->
      <RecognitionComparison
        :comparison="readyView.recognition"
        :left-path="readyView.sides[0].path"
        :right-path="readyView.sides[1].path"
      >
        <template #source>
          <div class="aci-instruction-compare__source">
            <h3>Source comparison</h3>
            <SourceDiff v-bind="readyView.diff" />
          </div>
        </template>
      </RecognitionComparison>
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

/* The facts line carries a home's escaped root, which has no break
   opportunities of its own either (WCAG 1.4.10). */
.aci-instruction-compare__file-facts {
  overflow-wrap: anywhere;
}
</style>
