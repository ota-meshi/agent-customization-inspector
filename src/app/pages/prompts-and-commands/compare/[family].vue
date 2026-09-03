<script setup lang="ts">
// The prompt-and-command comparison route (T505; FR-011, FR-012): two files
// of one invocation-name row compared whole — their complete literal sources
// as one diff and their recognition metadata as typed rows, with no verdict,
// no merge, and no fix anywhere.
//
// The route is this kind's, not a shared one: comparison is kind-specific
// (spec.md § Clarifications Session 2026-08-14), and each family's
// comparison phase designs its own surface. One kind is one surface, so
// every location of `prompt/command` arrives here — a Claude command, a
// Copilot CLI command, and a VS Code prompt file — and a prompt standing
// opposite a command is the pair this kind's row unit makes possible. What
// the kinds share is the row-owned pair the skill precedent establishes: a
// comparison is opened from an inventory row and stays inside what that row
// holds — for skills one name's copies, here one invocation name's files. A
// file of this kind is complete in itself, so there is no copy directory and
// no corresponding-file coordinate: the row's files are compared whole, and
// the pickers move the two sides among that row's files alone.
//
// The URL carries the model's own coordinates —
// `/prompts-and-commands/compare/<family>?leftSource=<selector>&left=<path>&rightSource=<selector>&right=<path>`
// — the two files
// named by their Source-relative Paths, the identity the inventory rows and
// the detail route already use (FR-030); the owning name row is derived from
// them, the way the skill and instruction routes derive theirs, because no
// shipped rule lets one file resolve two names. A pair the model cannot
// express — one file twice, a pair no single name row holds — is reported,
// never opened. The link survives rescans and server launches, resolving
// against whatever generation is current. Direct loads boot the shell
// first, so this page always opens against an adopted snapshot.
//
// Like the detail route, this is a surface that shows file contents exactly
// as authored — credentials included, with nothing masked and no control
// that would uncover a masked value — and it says none of that (FR-027). A
// name either file's prompt mentions stays text on both sides: nothing is
// resolved, opened, imported, or run (FR-019, FR-033).
//
// Three things drop the open comparison, and all three are the same cleanup
// the comparison state owns: leaving the route closes it, a client-data
// purge clears it, and a commit drops the previous generation's view while
// this page re-requests the same pair under the new snapshot (FR-030).
import {
  comparisonFamilyOf,
  sideFamilyOf,
  type ComparisonSide,
  querySideOf,
  sideIdentityKeyOf,
  comparisonTitleSides,
} from '../../../components/detail-route';
import {
  comparisonSideOptions,
  pickedSideOf,
  sideValueOf,
} from '../../../components/comparison-side-picker';
import AuthoredNameText from '../../../components/AuthoredNameText.vue';
import DetailNavigation from '../../../components/inspection/DetailNavigation.vue';
import SubjectUnavailable from '../../../components/inspection/SubjectUnavailable.vue';
import { sourceFactsOf, sourceFamilyNameOf } from '../../../components/source-name';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NuxtLink } from '#components';
import RecognitionComparison from '../../../components/prompt-comparison/RecognitionComparison.vue';
import SourceDiff from '../../../components/prompt-comparison/SourceDiff.vue';
import {
  PromptRecognitionComparison,
  type PromptSideDefinition,
} from '../../../components/prompt-comparison/recognition-comparison';
import { promptComparisonRouteFor } from '../../../composables/prompt-comparison';
import { useSessionViewState } from '../../../composables/session-view-state';
import { usePageOwnership } from '../../../composables/page-ownership';
import { AuthoredName } from '../../../components/authored-name';
import { useSessionSources } from '../../../composables/session-sources';
import {
  fileIdentityKey,
  CUSTOMIZATION_KIND_TEXT,
  escapeControlCharacters,
  FILE_ENCODING_TEXT,
  inlinePresentationLabel,
  isReadableFile,
} from '../../../../shared/entities';
import type {
  FileDetailDto,
  PromptDefinitionDto,
  PromptInventoryEntryDto,
  SourceKind,
} from '../../../../shared/api-types';

const sessionViewState = useSessionViewState();

const comparison = sessionViewState.promptComparison;
const snapshot = sessionViewState.snapshot;
const status = comparison.status;

const route = useRoute();

const pageOwnership = usePageOwnership();
const router = useRouter();

/**
 * The Source family the address names, or null for a segment outside the two
 * this product issues ({@link comparisonFamilyOf}): every comparison route
 * leads with the family because a pair stays inside one family while a family
 * can hold two consented homes (contracts/http-api.md § Host requirements
 * #5). A null resolves nothing, and the template reports the link instead of
 * comparing.
 */
const family = computed<SourceKind | null>(() => comparisonFamilyOf(route.params['family']));

/** The first compared file's identity: its Source and path (FR-030). */
const leftSide = computed(() => querySideOf(route.query, 'leftSource', 'left'));
/** The second compared file's identity: its Source and path (FR-030). */
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
    // Unreachable: the pickers render only behind a null pairFault, which an
    // unreadable family segment is one of. The guard is what lets this build
    // the address without a fallback family that would move the reader to
    // another block's comparison.
    return;
  }
  pendingPair.value = { left, right };
  void router.replace(promptComparisonRouteFor(family.value, left, right));
}

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/** The published Sources; what every identity below resolves against. */
const sources = sessionSources.sources;

/**
 * The committed readable files by identity — the comparison-eligible files
 * (FR-025). Keyed by Source and path, because two Sources can hold one
 * spelling and only one of them may be readable (FR-030).
 */
const readablePaths = computed(
  () =>
    new Set(
      (snapshot.value?.files ?? [])
        .filter(isReadableFile)
        .map((file) => fileIdentityKey(file.sourceId, file.sourceRelativePath)),
    ),
);

/**
 * The one inventory row owning the pair: both identities are files of one
 * invocation-name row — the population this model can express, exactly as a
 * skill pair is owned by one name's row. Null when no row holds both, which
 * the template reports instead of comparing: a pair spanning two names, one
 * file twice, or an identity the current scan does not hold is not a
 * comparison this model expresses (FR-011).
 */
const owningRow = computed<PromptInventoryEntryDto | null>(() => {
  const left = currentLeft.value;
  const right = currentRight.value;
  if (
    !hasPair.value ||
    left === null ||
    right === null ||
    (left.source === right.source && left.sourceRelativePath === right.sourceRelativePath)
  ) {
    return null;
  }
  const leftIdentity = sideIdentityKeyOf(sources.value, left);
  const rightIdentity = sideIdentityKeyOf(sources.value, right);
  if (leftIdentity === null || rightIdentity === null) {
    return null;
  }
  return (
    (snapshot.value?.prompts ?? []).find((entry) => {
      const identities = new Set(
        entry.definitions.map((definition) =>
          fileIdentityKey(definition.sourceId, definition.sourceRelativePath),
        ),
      );
      return identities.has(leftIdentity) && identities.has(rightIdentity);
    }) ?? null
  );
});

/**
 * The paths the pickers offer: the owning row's files with readable source,
 * each once and in the row's published order. Deduplicated because this
 * kind's row lists one definition per `(file, tool)` — a root command file
 * two products read is two definitions of one file — and a picker offering
 * one file twice would let a reader choose the pair the model forbids
 * (FR-011). A diagnostic-only candidate is not comparison-selectable
 * (US3 scenario 4), and a file of another name's row is outside the pair
 * this row owns — stepping to another name goes through its own row's entry
 * link, exactly as a skill pair never leaves its name's row.
 */
const comparableSides = computed<readonly ComparisonSide[]>(() => {
  const offered = new Set<string>();
  const sides: ComparisonSide[] = [];
  for (const definition of owningRow.value?.definitions ?? []) {
    if (sessionSources.familyKindOf(definition.sourceId) !== family.value) {
      // Another family's file: a pair stays inside the addressed family, so
      // the pickers never offer a side outside it.
      continue;
    }
    const identity = fileIdentityKey(definition.sourceId, definition.sourceRelativePath);
    if (offered.has(identity) || !readablePaths.value.has(identity)) {
      continue;
    }
    offered.add(identity);
    sides.push({
      source: sessionSources.selectorOf(definition.sourceId),
      sourceRelativePath: definition.sourceRelativePath,
    });
  }
  return sides;
});

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

/**
 * Whether the pickers render: only a row with more than two comparable files
 * has a file to move a side to — with exactly two, both already stand on the
 * two sides and each selector would offer nothing but its own value — dead
 * controls, exactly the skill surface's copy-switcher rule (T200).
 */
const pickersAvailable = computed(
  () => pairFault.value === null && comparableSides.value.length > 2,
);

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
 * What is wrong with the link's coordinates, before any request — the
 * model's own validation, reported instead of a comparison. Null when the
 * pair is the model's: two distinct Source-relative Paths one
 * applicability-range row of the current generation holds.
 */
const pairFault = computed<string | null>(() => {
  if (family.value === null) {
    return 'This link does not say where its files came from. Open a comparison from a row in the inventory, or from a prompt or command file’s detail page.';
  }
  if (!hasPair.value) {
    return 'This link names no pair of prompt or command files. Open a comparison from a row in the inventory, or from a prompt or command file’s detail page.';
  }
  const left = currentLeft.value;
  const right = currentRight.value;
  if (
    left !== null &&
    right !== null &&
    left.source === right.source &&
    left.sourceRelativePath === right.sourceRelativePath
  ) {
    return 'A comparison needs two distinct prompt or command files, and this link names the same file twice.';
  }
  if (
    left !== null &&
    right !== null &&
    (sideFamilyOf(left) !== family.value || sideFamilyOf(right) !== family.value)
  ) {
    // A cross-family link included: a pair never spans the repository and a
    // consented home (contracts/http-api.md § Host requirements #5).
    return 'A file this link names is not from the place this link’s address names. Open a comparison from a prompt or command row in the inventory.';
  }
  if (owningRow.value === null) {
    // One statement for every way no row holds both — a pair invoked by two
    // different names, a path that is not this kind's, or an identity the
    // current scan does not hold — exactly as the skill route reports a pair
    // no name's row owns.
    return 'No invocation name in the current scan holds both of this link’s files. The inventory may have changed since the link was made; open a comparison from a prompt or command row.';
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
      // The coordinates are outside the model; the template reports the
      // fault ({@link pairFault}) instead of a comparison.
      comparison.close();
      return;
    }
    void comparison.open(left, right);
  },
  { immediate: true },
);

/**
 * What one compared file is, beside its path: the family it is of, the
 * directory it was in where that family holds more than one Source, its
 * recognized kind, and its read outcome (US3 scenario 1). Per side rather
 * than per pair, because the two sides can be two Sources — a consented
 * home's file beside another member's is the pair this route expresses
 * (FR-002, FR-030).
 */
function fileFacts(detail: FileDetailDto): string {
  const facts = [
    ...sourceFactsOf(sources.value, detail.file.sourceId),
    // This page's own kind, never the adopted variant's. Both sides are files
    // of one invocation-name row, while `get-file-detail` is addressed by the
    // path alone and answers with the first variant its fixed order reaches —
    // so a `.claude/commands/CLAUDE.md`, a command by its directory and an
    // instruction file by its name, would otherwise be captioned
    // "Instructions" on the page that compares it as a command
    // (session.ts § fileDetail).
    CUSTOMIZATION_KIND_TEXT['prompt/command'],
    FILE_ENCODING_TEXT[detail.file.encoding],
  ];
  if (detail.file.encoding !== 'unknown') {
    facts.push(`${detail.file.sizeBytes} bytes`);
  }
  return facts.join(' · ');
}

/**
 * Every definition of one file, each paired with the name of the inventory
 * row it sits under — what the recognition comparison's side input is
 * (`recognition-comparison.ts`). One definition per `(file, tool)`, in the
 * inventory's own row and definition order.
 */
function definitionsOf(file: FileDetailDto['file']): readonly PromptSideDefinition[] {
  return (snapshot.value?.prompts ?? []).flatMap((entry) =>
    entry.definitions
      .filter(
        (definition: PromptDefinitionDto) =>
          definition.sourceId === file.sourceId &&
          definition.sourceRelativePath === file.sourceRelativePath,
      )
      .map((definition) => ({ invocationName: entry.name, definition })),
  );
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
  // Every definition of one compared file, each with the name of the row it
  // sits under. Gathered across the whole inventory rather than out of the
  // owning row, because a row is one name and this comparison is about two
  // files: a file a second product invoked by a second name would define on
  // that name's row too, and a cell reading the owning row alone would
  // report that tool as not recognizing a file it does read
  // (data-model.md § Inventory unit).
  // Every rendered coordinate is the adopted detail's own path, never the
  // pending-aware picker coordinate: a pick updates the coordinates one
  // render before the re-request drops this view, and labelling the old
  // details with the new paths would put one file's authored source under
  // another file's name for that frame (FR-025, FR-030).
  const leftDetailPath = left.file.sourceRelativePath;
  const rightDetailPath = right.file.sourceRelativePath;
  // Read once and used twice — beside each side's path, and as the
  // recognition comparison's side input — so the products a side box names
  // and the products its rows compare cannot disagree (AGENTS.md
  // § Implementation simplicity policy).
  const leftDefinitions = definitionsOf(left.file);
  const rightDefinitions = definitionsOf(right.file);
  return {
    sides: [
      {
        caption: 'First file',
        path: leftDetailPath,
        detail: left,
        recognitions: leftDefinitions.map((entry) => entry.definition),
      },
      {
        caption: 'Second file',
        path: rightDetailPath,
        detail: right,
        recognitions: rightDefinitions.map((entry) => entry.definition),
      },
    ] as const,
    diff: {
      originalText: left.file.sourceText,
      originalPath: leftDetailPath,
      modifiedText: right.file.sourceText,
      modifiedPath: rightDetailPath,
    },
    recognition: new PromptRecognitionComparison(
      { detail: left, definitions: leftDefinitions },
      { detail: right, definitions: rightDefinitions },
    ),
  };
});

/**
 * The Source family this comparison stands in, as the family's own word, or
 * null where naming it distinguishes nothing — a session carrying one Source
 * (`source-name.ts` § sourceFamilyNameOf). The comparison never spans two
 * families, so one word covers both sides.
 */
const crumbFamilyText = computed(() =>
  family.value === null ? null : sourceFamilyNameOf(sources.value, family.value),
);

/**
 * The invocation name the two files share, which is what the comparison is of.
 * Null before the pair resolves, where the crumb step would name nothing.
 *
 * Drawn through the shared unit, so a name whose characters draw nothing is
 * spelled out on the crumb and the subject line the way this kind's row and
 * detail spell it ({@link AuthoredName};
 * `PromptRow.vue`). A prompt name comes from a file name, so it has no empty
 * case and never takes the substituting spelling the declared kinds use.
 */
const crumbSubject = computed(() => {
  const name = owningRow.value?.name ?? null;
  return name === null ? null : new AuthoredName(name);
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
      return 'A comparison needs two distinct prompt or command files, and this link names the same file twice.';
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
  // Narrowing only: the retry button renders only behind a null pairFault,
  // which requires both sides.
  if (left !== null && right !== null) {
    void comparison.open(left, right);
  }
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
    case 'loading': {
      // The pair in the title, so two comparison tabs never read identically
      // (WCAG 2.4.2; `detail-route.ts` § comparisonTitleSides).
      const sides = comparisonTitleSides(leftSide.value, rightSide.value);
      return sides === null
        ? 'Comparing prompt and command files'
        : `Comparing prompt and command files — ${sides}`;
    }
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
  return 'Comparing prompt and command files';
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
  <div class="aci-prompt-compare aci-route">
    <!-- The way back, drawn in the bar with every other route's moves
         (`DetailNavigation.vue`). The kind is URL state, so naming it is what
         makes the move land on the prompts and commands list rather than the kind
         order's default tab. A comparison has no neighbouring row to step to:
         what stands beside it is the other copy, which its own pickers
         choose. -->
    <DetailNavigation
      list-route="/?kind=prompt%2Fcommand"
      :list-text="CUSTOMIZATION_KIND_TEXT['prompt/command']"
      :previous="null"
      :next="null"
    />

    <!-- Where the page sits, which is location rather than a way out: the
         kind, the subject the two copies share, and this page's own step. -->
    <p class="aci-detail-crumbs">
      <template v-if="crumbFamilyText !== null">{{ crumbFamilyText }} <span>›</span> </template
      >{{ CUSTOMIZATION_KIND_TEXT['prompt/command'] }} <span>›</span>
      <template v-if="crumbSubject !== null"
        ><span class="aci-path" :class="{ 'aci-authored-text': crumbSubject.isAuthored }">{{
          crumbSubject.text
        }}</span>
        <span>›</span> </template
      ><span class="aci-detail-crumbs__subject">Compare</span>
    </p>

    <h2 ref="heading" tabindex="-1">Compare prompt and command files</h2>

    <!-- What is being compared, on the line directly below the heading so the
         two are read together. The heading states the page's purpose, because
         focus lands there on arrival and a screen reader hears it alone
         (WCAG 2.4.6); putting the subject in it would give each kind its own
         sentence, and an applicability range would read as "Compare **". The
         name is the third crumb above as well, where it says where the page
         sits rather than what it is showing. -->
    <p v-if="crumbSubject !== null" class="aci-detail-attributes">
      <AuthoredNameText :name="crumbSubject">
        <strong
          class="aci-detail-attributes__subject aci-path"
          :class="{ 'aci-authored-text': crumbSubject.isAuthored }"
          >{{ crumbSubject.text }}</strong
        >
      </AuthoredNameText>
    </p>

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
    <div
      v-if="pickersAvailable"
      ref="pickersRegion"
      class="aci-compare-pickers aci-prompt-compare__pickers"
    >
      <div class="aci-prompt-compare__picker">
        <label for="aci-prompt-compare-first">First prompt or command file</label>
        <select id="aci-prompt-compare-first" v-model="leftSelection">
          <!-- The other side's file is unselectable — the two sides would
               hold one file (FR-011). -->
          <option
            v-for="option in pickerOptions"
            :key="option.value"
            :value="option.value"
            :disabled="
              option.value !== valueOf(currentLeft) && option.value === valueOf(currentRight)
            "
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="aci-prompt-compare__picker">
        <label for="aci-prompt-compare-second">Second prompt or command file</label>
        <select id="aci-prompt-compare-second" v-model="rightSelection">
          <option
            v-for="option in pickerOptions"
            :key="option.value"
            :value="option.value"
            :disabled="
              option.value !== valueOf(currentRight) && option.value === valueOf(currentLeft)
            "
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
      <div class="aci-compare-sides">
        <section v-for="side in readyView.sides" :key="side.caption" class="aci-compare-side">
          <span class="aci-compare-side__caption">{{ side.caption }}</span>
          <p class="aci-prompt-compare__file-path aci-path aci-authored-text">
            {{ escapeControlCharacters(side.path) }}
          </p>
          <p class="aci-prompt-compare__file-facts aci-note">
            {{ fileFacts(side.detail) }}
          </p>
        </section>
      </div>

      <!-- The component owns the section order — the recognitions, the
           declarations, the body, and last the complete files it takes below
           through the `source` slot (research.md § 7). What the source diff is
           stays this page's. -->
      <RecognitionComparison
        :comparison="readyView.recognition"
        :left-path="readyView.sides[0].path"
        :right-path="readyView.sides[1].path"
      >
        <template #source>
          <div class="aci-prompt-compare__source">
            <h3 class="aci-compare-block-title">Source comparison</h3>
            <!-- What the diff holds, said before it, as each block above says
                 what its own two sides are: this one is the files themselves,
                 with nothing removed or reordered (FR-027). -->
            <p class="aci-note">Each side is the file exactly as written, frontmatter included.</p>
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
      <SubjectUnavailable :outcome="retryable ? 'error' : 'warning'">
        {{ stateStatement }}
        <template #exit>
          <button v-if="retryable" ref="retryButton" type="button" @click="retryOpen">
            Try again
          </button>
          <NuxtLink to="/?kind=prompt%2Fcommand"
            >Return to the inventory and open a comparison from a prompt or command row.</NuxtLink
          >
        </template>
      </SubjectUnavailable>
    </div>
  </div>
</template>

<style scoped>
.aci-prompt-compare {
  display: flex;
  flex-direction: column;
}

.aci-prompt-compare > p:first-child {
  margin: 0;
}

.aci-prompt-compare h2 {
  margin: 0.25rem 0 0.5rem;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-prompt-compare__file-path {
  overflow-wrap: anywhere;
}
</style>
