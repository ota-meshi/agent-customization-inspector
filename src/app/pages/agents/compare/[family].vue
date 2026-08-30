<script setup lang="ts">
// The custom-agent comparison route (T575; FR-011, FR-012): two files of one
// agent-name row compared as what they say — the declarations each makes and
// the instructions each gives its agent, each half diffed on its own — then
// each file whole, beside their recognition metadata as typed rows, with no
// verdict, no merge, and no fix anywhere.
//
// The route is this kind's, not a shared one: comparison is kind-specific
// (spec.md § Clarifications Session 2026-08-14), and each family's
// comparison phase designs its own surface. One kind is one surface, so every
// location of `agent` arrives here — a Codex TOML agent, a Claude Code
// subagent, and a Copilot agent profile — and a TOML agent standing opposite
// a Markdown one is the pair this kind's row unit makes possible. What the
// kinds share is the row-owned pair the skill precedent establishes: a
// comparison is opened from an inventory row and stays inside what that row
// holds — for skills one name's copies, here one agent name's files. A custom
// agent is one file complete in itself, so there is no copy directory and no
// corresponding-file coordinate: the row's files are compared whole, and the
// pickers move the two sides among that row's files alone.
//
// The URL carries the model's own coordinates —
// `/agents/compare/<family>?name=<agent name>&leftSource=<selector>&left=<path>&rightSource=<selector>&right=<path>` — the two files
// named by their Source-relative Paths, the identity the inventory rows and
// the detail route already use (FR-030), and the row named by the name it is
// headed with. The row is carried rather than derived, because this kind's
// rows genuinely overlap: one file sits on one row per product that names it,
// so two files can share more than one row and a derived one would be
// whichever name sorts first. A pair the model cannot express — one file
// twice, or a name whose row does not hold both files — is reported, never
// opened. The link survives
// rescans and server launches, resolving against whatever generation is
// current. Direct loads boot the shell first, so this page always opens
// against an adopted snapshot.
//
// Like the detail route, this is a surface that shows file contents exactly
// as authored — credentials included, with nothing masked and no control that
// would uncover a masked value — and it says none of that (FR-027). A name
// either agent mentions stays text on both sides: nothing is resolved,
// opened, imported, connected to, or run (FR-019, FR-033).
//
// What it does not mount is a *diff* of the two files' bytes. This kind's
// locations are written in two formats, so that diff would align quoting and
// delimiters rather than what the files say. Each file's complete authored
// source is on the page all the same, as its own read-only viewer beside the
// other's below the two halves: a comparison surface must display a readable
// file exactly as written, and an agent file is itself the customization
// rather than a carrier, so it shows its complete source wherever it is shown
// at all (FR-027, FR-007).
//
// Three things drop the open comparison, and all three are the same cleanup
// the comparison state owns: leaving the route closes it, a client-data purge
// clears it, and a commit drops the previous generation's view while this
// page re-requests the same pair under the new snapshot (FR-030).
import {
  comparisonFamilyOf,
  sideFamilyOf,
  type ComparisonSide,
  fromJsonStringBody,
  querySideOf,
  sideIdentityKeyOf,
  comparisonTitleSides,
} from '../../../components/detail-route';
import {
  comparisonSideOptions,
  pickedSideOf,
  sideValueOf,
} from '../../../components/comparison-side-picker';
import { sourceFactsOf } from '../../../components/source-name';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NuxtLink } from '#components';
import RecognitionComparison from '../../../components/custom-agent-comparison/RecognitionComparison.vue';
import SourceViewer from '../../../components/inspection/SourceViewer.vue';
import {
  CustomAgentRecognitionComparison,
  type CustomAgentSideDefinition,
} from '../../../components/custom-agent-comparison/recognition-comparison';
import { customAgentComparisonRouteFor } from '../../../composables/custom-agent-comparison';
import { useSessionViewState } from '../../../composables/session-view-state';
import { usePageOwnership } from '../../../composables/page-ownership';
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
  AgentDefinitionDto,
  AgentInventoryEntryDto,
  FileDetailDto,
  SourceKind,
} from '../../../../shared/api-types';

const sessionViewState = useSessionViewState();

const comparison = sessionViewState.customAgentComparison;
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

/**
 * One query parameter as the single path it names. A repeated parameter
 * arrives as an array; this route's are not repeated, so the array form
 * folds to its first value rather than being a case.
 */
function queryValue(name: string): string | null {
  const parameter = route.query[name];
  // Decoded through the spelling the link was built with, so a value holding
  // any character a file name — or an authored agent name — can reaches the
  // comparison as it was published (`detail-route.ts`).
  //
  // Null for an absent parameter rather than the empty string, because an
  // authored empty string is a value this model has: an agent name of `''` is
  // a row like any other, and folding the two together would make its own
  // row's comparison link resolve to "this link names no pair".
  if (typeof parameter === 'string') {
    return fromJsonStringBody(parameter);
  }
  return Array.isArray(parameter) && typeof parameter[0] === 'string'
    ? fromJsonStringBody(parameter[0])
    : null;
}

/**
 * The agent name of the row the pair belongs to. Carried rather than derived,
 * because one file can sit on two rows and two files can share more than one
 * (`composables/custom-agent-comparison.ts`).
 */
const rowName = computed(() => queryValue('name'));

/** The first compared file's identity: its Source and path (FR-030). */
const leftSide = computed(() => querySideOf(route.query, 'leftSource', 'left'));
/** The second compared file's identity: its Source and path (FR-030). */
const rightSide = computed(() => querySideOf(route.query, 'rightSource', 'right'));

/** Whether the URL names a pair at all; without one there is nothing to open. */
const hasPair = computed(
  () => rowName.value !== null && leftSide.value !== null && rightSide.value !== null,
);

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
watch([rowName, leftSide, rightSide], () => {
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
  // The row stays the one the link named: a pick moves a side inside that row
  // rather than moving the comparison to another one.
  void router.replace(
    customAgentComparisonRouteFor(family.value, rowName.value ?? '', left, right),
  );
}

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/** The published Sources; what every identity below resolves against. */
const sources = sessionSources.sources;

/**
 * Joins this comparison's own content-owner registry, which the two source
 * viewers below take. The session's registry covers a purge and a newer
 * generation; this one also covers a pick and a URL edit, which replace the
 * open pair without either — and the contract orders dispose before replace
 * (data-model.md § BrowserState), so the previous pair's authored source must
 * go synchronously rather than on Vue's unmount one flush later. The diffs
 * beside them join it through their own component.
 */
const registerComparisonContentOwner = (disposer: () => void): (() => void) =>
  comparison.registerOpenContentOwner(disposer);

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
 * The inventory row the link names, once it is a row that holds both files.
 * Null when the name is not a current row's, when that row does not hold both
 * paths, or when the pair is one file twice — each of which the template
 * reports instead of comparing (FR-011).
 *
 * Looked up by the name rather than searched for by the two paths, because one
 * file can sit on two rows: a search would settle on whichever name sorts
 * first, and the pickers below would then offer that row's files rather than
 * the row the reader opened the comparison from.
 *
 * The null-named row is never it, the way its own row links no comparison: its
 * files share the absence of a name rather than an identity, so a pair drawn
 * from it would assert a relationship the inventory does not have
 * (data-model.md § Inventory unit). A link naming it therefore resolves to no
 * row at all, and a hand-written one cannot reach what the entry links
 * withhold.
 */
const owningRow = computed<AgentInventoryEntryDto | null>(() => {
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
  for (const entry of snapshot.value?.agents ?? []) {
    if (entry.name !== rowName.value) {
      continue;
    }
    const identities = new Set(
      entry.definitions.map((definition) =>
        fileIdentityKey(definition.sourceId, definition.sourceRelativePath),
      ),
    );
    if (identities.has(leftIdentity) && identities.has(rightIdentity)) {
      return entry;
    }
  }
  return null;
});

/**
 * The paths the pickers offer: the owning row's files with readable source,
 * each once and in the row's published order. Deduplicated because this
 * kind's row lists one definition per `(file, tool)` — a `.claude/agents/*.md`
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
    return 'This link does not say where its files came from. Open a comparison from a row in the inventory, or from a custom agent’s detail page.';
  }
  if (!hasPair.value) {
    return 'This link names no pair of custom-agent files. Open a comparison from a row in the inventory, or from a custom agent’s detail page.';
  }
  const left = currentLeft.value;
  const right = currentRight.value;
  if (
    left !== null &&
    right !== null &&
    left.source === right.source &&
    left.sourceRelativePath === right.sourceRelativePath
  ) {
    return 'A comparison needs two distinct custom-agent files, and this link names the same file twice.';
  }
  if (
    left !== null &&
    right !== null &&
    (sideFamilyOf(left) !== family.value || sideFamilyOf(right) !== family.value)
  ) {
    // A cross-family link included: a pair never spans the repository and a
    // consented home (contracts/http-api.md § Host requirements #5).
    return 'A file this link names is not from the place this link’s address names. Open a comparison from a custom-agent row in the inventory.';
  }
  if (owningRow.value === null) {
    // One statement for every way the named row does not hold both files — a
    // name no current row is, a path that is not this kind's, an identity the
    // current scan does not hold, or the null-named row, which owns no pair —
    // exactly as the skill route reports a pair no name's row owns.
    return 'No agent name in the current scan holds both of this link’s files. The inventory may have changed since the link was made; open a comparison from a custom-agent row.';
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
    // The row name among the keys, because it is a coordinate of the pair
    // rather than a caption on it: a link that keeps both paths and names
    // another row is a different comparison, and one this model may not
    // express at all — without this key the previous pair would stay on
    // screen under coordinates it no longer belongs to.
    rowName,
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
    if (pairFault.value !== null) {
      // The coordinates are outside the model; the template reports the
      // fault ({@link pairFault}) instead of a comparison.
      comparison.close();
      return;
    }
    const left = currentLeft.value;
    const right = currentRight.value;
    if (left === null || right === null) {
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
    // of one agent-name row, while `get-file-detail` is addressed by the
    // file identity alone and answers with the first variant its fixed order
    // reaches — so a `.claude/agents/CLAUDE.md`, a subagent by its directory
    // and an instruction file by its name, would otherwise be captioned
    // "Instructions" on the page that compares it as a custom agent
    // (session.ts § fileDetail).
    CUSTOMIZATION_KIND_TEXT['agent'],
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
function definitionsOf(file: FileDetailDto['file']): readonly CustomAgentSideDefinition[] {
  return (snapshot.value?.agents ?? []).flatMap((entry) =>
    entry.definitions
      .filter(
        (definition: AgentDefinitionDto) =>
          definition.sourceId === file.sourceId &&
          definition.sourceRelativePath === file.sourceRelativePath,
      )
      .map((definition) => ({ agentName: entry.name, definition })),
  );
}

/**
 * The whole ready view as one derivation, null outside 'ready': the two
 * identity sides and the recognition comparison.
 *
 * No raw-source *diff* among them, unlike the skill and prompt surfaces: this
 * kind's two locations are written in two formats, so aligning a Codex
 * agent's TOML against a Markdown agent's frontmatter document byte for byte
 * aligns quoting and delimiters instead of the values and the prose. What the
 * two files actually say is compared as the two halves their own rules split
 * out, which is what the recognition comparison mounts.
 *
 * Each file's complete authored source is still on the page, as its own
 * read-only viewer beside the other's: a comparison surface must display a
 * readable file exactly as written (FR-027), and an agent file is itself the
 * customization rather than a carrier, so it shows its complete source
 * wherever it is shown at all (FR-007). Two viewers rather than one diff is
 * what that requirement asks for without asserting an alignment the formats do
 * not have — and it is also the only content on the page when a side's
 * extraction failed, which is exactly when a reader needs the bytes (FR-028).
 *
 * The readable-variant guard stays: a textless side is not comparison-eligible
 * at all (FR-025), which is a fact about the pair rather than about what this
 * view renders.
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
  return {
    sides: [
      {
        caption: 'First file',
        path: leftDetailPath,
        detail: left,
        sourceText: left.file.sourceText,
      },
      {
        caption: 'Second file',
        path: rightDetailPath,
        detail: right,
        sourceText: right.file.sourceText,
      },
    ] as const,
    recognition: new CustomAgentRecognitionComparison(
      { detail: left, definitions: definitionsOf(left.file) },
      { detail: right, definitions: definitionsOf(right.file) },
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
      return 'A comparison needs two distinct custom-agent files, and this link names the same file twice.';
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
      // The row and its pair in the title, so two comparison tabs never read
      // identically (WCAG 2.4.2; `detail-route.ts` § comparisonTitleSides).
      const sides = comparisonTitleSides(leftSide.value, rightSide.value);
      if (sides === null) {
        return 'Comparing custom-agent files';
      }
      const subject = rowName.value;
      return subject === null
        ? `Comparing custom-agent files — ${sides}`
        : `Comparing custom-agent files: ${subject} — ${sides}`;
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
  return 'Comparing custom-agent files';
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
  <div class="aci-custom-agent-compare">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the
         custom-agent list rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=agent">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">Compare custom-agent files</h2>

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
    <div v-if="pickersAvailable" ref="pickersRegion" class="aci-custom-agent-compare__pickers">
      <div class="aci-custom-agent-compare__picker">
        <label for="aci-custom-agent-compare-first">First custom-agent file</label>
        <select id="aci-custom-agent-compare-first" v-model="leftSelection">
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
      <div class="aci-custom-agent-compare__picker">
        <label for="aci-custom-agent-compare-second">Second custom-agent file</label>
        <select id="aci-custom-agent-compare-second" v-model="rightSelection">
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
      <div class="aci-custom-agent-compare__files">
        <section v-for="side in readyView.sides" :key="side.caption">
          <h3>{{ side.caption }}</h3>
          <p class="aci-custom-agent-compare__file-path aci-path aci-authored-text">
            {{ escapeControlCharacters(side.path) }}
          </p>
          <p class="aci-custom-agent-compare__file-facts aci-note">
            {{ fileFacts(side.detail) }}
          </p>
        </section>
      </div>

      <!-- The component owns the section order — the declarations, the
           instructions, the complete files it takes below through the
           `source` slot, and last the recognitions (research.md § 7). -->
      <RecognitionComparison
        :comparison="readyView.recognition"
        :left-path="readyView.sides[0].path"
        :right-path="readyView.sides[1].path"
      >
        <template #source>
          <!-- Each file whole, as its own viewer rather than as one diff:
               a comparison surface must display a readable file exactly as
               written (FR-027), while two files written in two formats have
               no meaningful byte-for-byte alignment to assert. This is also
               all a reader gets when a side's extraction failed, which is
               when the bytes matter most (FR-028). -->
          <h3>Source</h3>
          <div class="aci-custom-agent-compare__sources">
            <section v-for="side in readyView.sides" :key="side.caption">
              <h4>{{ side.caption }}</h4>
              <SourceViewer
                :source-text="side.sourceText"
                :source-relative-path="side.path"
                :register-content-owner="registerComparisonContentOwner"
              />
            </section>
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
        <NuxtLink to="/?kind=agent"
          >Return to the inventory and open a comparison from a custom-agent row.</NuxtLink
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.aci-custom-agent-compare {
  display: flex;
  flex-direction: column;
}

.aci-custom-agent-compare > p:first-child {
  margin: 0;
}

.aci-custom-agent-compare h2 {
  margin: 0.25rem 0 0.5rem;
}

.aci-custom-agent-compare h3 {
  font-size: 1rem;
  margin: 0.75rem 0 0.25rem;
}

/* The two pickers side by side, stacking on a narrow viewport. Each label is
   a column so the select sits under its name, and the selects shrink inside
   their columns rather than widening the page (WCAG 1.4.10). */
.aci-custom-agent-compare__pickers {
  display: grid;
  gap: 0.5rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  margin-block: 0.25rem;
}

@media (min-width: 52rem) {
  .aci-custom-agent-compare__pickers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-custom-agent-compare__picker {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.aci-custom-agent-compare__pickers select {
  max-inline-size: 100%;
}

/* The two identities side by side above the diff, stacking on a narrow
   viewport (WCAG 1.4.10). */
.aci-custom-agent-compare__files {
  display: grid;
  gap: 0.25rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-custom-agent-compare__files {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-custom-agent-compare__files h3 {
  margin: 0.5rem 0 0.1rem;
}

.aci-custom-agent-compare__files p {
  margin: 0.1rem 0;
}

/* The two complete sources side by side, stacking on a narrow viewport
   (WCAG 1.4.10) — the same shape the identities above them take, so a side
   stays under its own caption at either width. */
.aci-custom-agent-compare__sources {
  display: grid;
  gap: 0.25rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-custom-agent-compare__sources {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-custom-agent-compare__sources h4 {
  font-size: 0.95rem;
  margin: 0.4rem 0 0.2rem;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-custom-agent-compare__file-path {
  overflow-wrap: anywhere;
}
</style>
