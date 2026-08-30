<script setup lang="ts">
// The MCP comparison route (T399/T400; FR-011, FR-012): one declared server
// name's declarations compared across the carriers that declare it — each
// side serialized to canonical JSON and diffed in Monaco (research.md § 7)
// — with no verdict, no merge, and no fix
// anywhere. There is no source half: no carrier shows its source on any
// surface (FR-007), so the serialized declarations are the whole comparison.
//
// The route is the MCP kind's, not a shared one: comparison is kind-specific
// (spec.md § Clarifications Session 2026-08-14), and each family's
// comparison unit is its inventory's own row unit — for skills one name's
// copies, for instructions one range's files, here one declared server name
// (data-model.md § Inventory unit). The comparison is opened from that name's
// inventory row or from one of its declarations' detail pages, and stays
// inside what the row holds: its pickers move the two sides among the row's
// own carriers.
//
// The URL carries the model's own coordinates —
// `/mcp/compare/<family>?name=<declared name>&leftSource=<selector>&left=<path>&rightSource=<selector>&right=<path>`
// — the row's name in the carriers' own spelling (FR-007) and the two
// carriers by their whole identities — each side's own Source and
// Source-relative Path, the identity the inventory rows and the detail route
// already use (FR-030), each side naming its Source because a consented
// member publishes MCP carriers too (contracts/http-api.md § Host
// requirements #5). A selection the model cannot express — a name
// no current row is, one carrier twice, or a carrier the named row does not
// hold, which covers a path that is no current carrier at all — is reported,
// never opened. The link survives rescans and server launches, resolving
// against whatever generation is current. Direct loads boot the shell first,
// so this page always opens against an adopted snapshot.
//
// Like the MCP detail, this surface shows declared values exactly as
// authored — credentials included, with nothing masked and no control that
// would uncover a masked value — and it says none of that (FR-027).
//
// Three things drop the open comparison, and all three are the same cleanup
// the comparison state owns: leaving the route closes it, a client-data
// purge clears it, and a commit drops the previous generation's view while
// this page re-requests the same selection under the new snapshot (FR-030).
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NuxtLink } from '#components';
import DeclarationDiff from '../../../components/mcp-comparison/DeclarationDiff.vue';
import { canonicalDeclaredEntriesJsonText } from '../../../components/declared-entries-json';
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
import { mcpComparisonRouteFor } from '../../../composables/mcp-comparison';
import { useSessionViewState } from '../../../composables/session-view-state';
import { usePageOwnership } from '../../../composables/page-ownership';
import { useSessionSources } from '../../../composables/session-sources';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import {
  fileIdentityKey,
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import type { McpCarrierDetailDto, SourceKind } from '../../../../shared/api-types';

const sessionViewState = useSessionViewState();

const comparison = sessionViewState.mcpComparison;
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
 * One query parameter as the single value it names, or null when the URL
 * does not carry it. A repeated parameter arrives as an array; this route's
 * are not repeated, so the array form folds to its first value rather than
 * being a case. Present-but-empty stays the empty string, because strict
 * JSON accepts `""` as a declared server name (FR-025).
 */
function queryParameter(name: string): string | null {
  const parameter = route.query[name];
  if (typeof parameter === 'string') {
    return parameter;
  }
  return Array.isArray(parameter) && typeof parameter[0] === 'string' ? parameter[0] : null;
}

/**
 * The declared server name whose row owns this comparison (FR-007). The
 * query spelling is `toJsonStringBody`'s, the same layer the
 * declaration detail's `?server=` rides: decoding here is what lets a name
 * the URL cannot carry raw — a lone surrogate strict JSON resolves from an
 * authored escape — own its comparison too (`mcpComparisonRouteFor`).
 */
const subjectName = computed(() => {
  const parameter = queryParameter('name');
  return parameter === null ? null : fromJsonStringBody(parameter);
});

/** The first compared carrier's identity: its Source and path (FR-030). */
const leftSide = computed(() => querySideOf(route.query, 'leftSource', 'left'));
/** The second compared carrier's identity: its Source and path (FR-030). */
const rightSide = computed(() => querySideOf(route.query, 'rightSource', 'right'));

/**
 * Whether the URL names a selection at all; without a name and two sides
 * there is nothing to open. A path is never the empty string
 * (data-model.md § SourceRelativePath), so `''` folds into absence; the
 * empty declared name stays a name.
 */
const hasSelection = computed(
  () => subjectName.value !== null && leftSide.value !== null && rightSide.value !== null,
);

/**
 * The coordinates most recently requested by a picker and not yet reflected
 * by the route; see the instruction compare route's pending pair for the
 * race this fills. The watch below clears it the moment the route has
 * caught up, so the route stays the identity and this ref is only the
 * gap-filler.
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
 * Replaces the compared coordinates in place, inside the same named row.
 * `replace` rather than `push`: stepping through pairs is this page's
 * working motion, and a history entry per pick would make the back button
 * replay every pair the reader stepped through on the way.
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
  void router.replace(mcpComparisonRouteFor(family.value, subjectName.value ?? '', left, right));
}

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/** The published Sources; what every identity below resolves against. */
const sources = sessionSources.sources;

/**
 * The one inventory row owning the comparison: the row whose declared name
 * the URL carries. The comparison never leaves it — its sides are that
 * name's declarations, exactly as a skill pair is owned by one name's row
 * and an instruction pair by one range's (data-model.md § Inventory unit).
 * Null when no current row is the named one, which the template reports
 * instead of comparing (FR-011).
 */
const owningRow = computed(() => {
  if (subjectName.value === null) {
    return null;
  }
  return (snapshot.value?.mcp ?? []).find((entry) => entry.name === subjectName.value) ?? null;
});

/**
 * The identities the pickers offer: the owning row's carriers, one entry per
 * physical carrier in the row's published order — by whole identity, because
 * two Sources can hold one spelling (FR-030). Every one of them is
 * comparison-eligible (FR-025) by the row's own invariant: a named row's
 * declarations are parsed — a failed carrier publishes no name, and a
 * binary carrier is diagnostic-only — so a parsed carrier's text was read
 * (api-types.ts § McpDeclarationDto.parseStatus). A carrier of another
 * name's row is outside what this row owns — stepping to another name goes
 * through its own row's entry link.
 */
const comparableSides = computed<readonly ComparisonSide[]>(() => {
  const offered = new Set<string>();
  const sides: ComparisonSide[] = [];
  for (const declaration of owningRow.value?.declarations ?? []) {
    if (sessionSources.familyKindOf(declaration.sourceId) !== family.value) {
      // Another family's declaration: a pair stays inside the addressed family, so
      // the pickers never offer a side outside it.
      continue;
    }
    const identity = fileIdentityKey(declaration.sourceId, declaration.sourceRelativePath);
    if (offered.has(identity)) {
      continue;
    }
    offered.add(identity);
    sides.push({
      source: sessionSources.selectorOf(declaration.sourceId),
      sourceRelativePath: declaration.sourceRelativePath,
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
 * What is wrong with the link's coordinates, before any request — the
 * model's own validation, reported instead of a comparison. Null when the
 * selection is the model's: one declared name's row holding both carriers.
 */
const pairFault = computed<string | null>(() => {
  if (family.value === null) {
    return 'This link does not say where its declarations came from. Open a comparison from an MCP row in the inventory, or from an MCP server declaration’s detail page.';
  }
  if (!hasSelection.value) {
    return 'This link names no MCP comparison. Open a comparison from an MCP row in the inventory, or from an MCP server declaration’s detail page.';
  }
  const left = currentLeft.value;
  const right = currentRight.value;
  if (
    left !== null &&
    right !== null &&
    left.source === right.source &&
    left.sourceRelativePath === right.sourceRelativePath
  ) {
    return 'A comparison needs the declaration from two distinct MCP files, and this link names the same file twice.';
  }
  if (
    left !== null &&
    right !== null &&
    (sideFamilyOf(left) !== family.value || sideFamilyOf(right) !== family.value)
  ) {
    // A cross-family link included: a pair never spans the repository and a
    // consented home (contracts/http-api.md § Host requirements #5).
    return 'A file this link names is not from the place this link’s address names. Open a comparison from an MCP row in the inventory.';
  }
  if (owningRow.value === null) {
    // One statement for every way the name resolves no row — a name no
    // current carrier declares, or an identity the current scan does not
    // hold. Only explicit MCP configuration joins the MCP surfaces
    // (data-model.md § Inventory unit), so a non-carrier path is on no row.
    return 'No declared server name in the current scan matches this link’s. The inventory may have changed since the link was made; open a comparison from an MCP row.';
  }
  const held = new Set(
    owningRow.value.declarations.map((declaration) =>
      fileIdentityKey(declaration.sourceId, declaration.sourceRelativePath),
    ),
  );
  const leftIdentity = sideIdentityKeyOf(sources.value, left);
  const rightIdentity = sideIdentityKeyOf(sources.value, right);
  if (
    leftIdentity === null ||
    rightIdentity === null ||
    !held.has(leftIdentity) ||
    !held.has(rightIdentity)
  ) {
    // Covers a path that is no current carrier at all: such a path is on no
    // row, this one included.
    return 'A file this link names does not declare this server name in the current scan. The inventory may have changed since the link was made; open a comparison from an MCP row.';
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
    family,
    subjectName,
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
 * Whether the pickers render: only a row with more than two comparable
 * carriers has a file to move a side to — with exactly two, both already
 * stand on the two sides and each selector would offer nothing but its own
 * value — dead controls, exactly the instruction surface's rule.
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
 * The subject line's text: the declared name through the shared label rule,
 * with the empty name noted the way the inventory row heads it — strict
 * JSON accepts `""` as a server name (FR-025). Null while the URL carries
 * no name, where the fault statement is the page.
 */
const subjectNameText = computed(() =>
  subjectName.value === null
    ? null
    : subjectName.value === ''
      ? '(empty name)'
      : pathPresentationLabel(subjectName.value),
);

/**
 * Whether {@link subjectNameText} is the authored spelling rather than this
 * product's note, which decides the authored-text styling.
 */
const subjectNameIsAuthored = computed(
  () => subjectName.value !== null && subjectName.value !== '',
);

/**
 * What of each carrier the diff shows, for the sides' accessible names
 * (FR-025): the compared declaration, named by the row's subject through
 * the whitespace-safe spelling — an accessible name is a flat string — with
 * the empty name noted the way every surface notes it.
 */
const diffContentLabel = computed(() => {
  const name =
    subjectName.value === null || subjectName.value === ''
      ? '(empty name)'
      : inlinePresentationLabel(subjectName.value);
  return `declaration ${name} of`;
});

/**
 * What one compared carrier is, beside its path: the family it is of, the
 * directory it was in where that family holds more than one Source, its
 * recognized kind, and its read outcome (US3 scenario 1). Per side rather
 * than per pair, because the two sides can be two Sources — a consented
 * home's carrier beside another member's is the pair this route
 * expresses (FR-002, FR-030).
 */
function fileFacts(detail: McpCarrierDetailDto): string {
  const facts = [
    ...sourceFactsOf(sources.value, detail.file.sourceId),
    CUSTOMIZATION_KIND_TEXT.MCP,
    FILE_ENCODING_TEXT[detail.file.encoding],
  ];
  if (detail.file.encoding !== 'unknown') {
    facts.push(`${detail.file.sizeBytes} bytes`);
  }
  return facts.join(' · ');
}

/**
 * One side's recognition attribution: each product whose recognition the
 * row lists for that carrier, with the surfaces its admission rests on —
 * the inventory row's own statements, repeated per side so neither
 * declaration loses which tool reads it (FR-009: naming a surface never
 * claims it loaded the file).
 */
function attributionText(sourceId: string, path: string): string {
  return (owningRow.value?.declarations ?? [])
    .filter(
      (declaration) => declaration.sourceId === sourceId && declaration.sourceRelativePath === path,
    )
    .map(
      (declaration) =>
        `${SUPPORTED_TOOL_TEXT[declaration.tool]} (${declaration.surfaces
          .map((surface) => VENDOR_SURFACE_TEXT[surface])
          .join(', ')})`,
    )
    .join(' · ');
}

/**
 * The whole ready view as one derivation, null outside 'ready': the two
 * identity sides and each side's declaration serialized to the JSON the
 * diff mounts (declared-entries-json.ts). One computed rather than one per
 * projection, for the same release-on-next-read reason the instruction
 * compare route documents (FR-027). The name's declaration is looked up in
 * each adopted detail; a detail without it is a torn frame between a
 * snapshot replacement and the re-request it triggers, and renders nothing.
 *
 * Every rendered coordinate — the side headings, the diff labels, the
 * attribution lookups — is the adopted detail's own path, never the
 * pending-aware picker coordinate: a pick updates the coordinates one
 * render before the re-request drops this view, and labelling the old
 * details with the new paths would put one carrier's declared values —
 * credentials included — under another carrier's name for that frame
 * (FR-025, FR-030).
 */
const readyView = computed(() => {
  if (status.value !== 'ready' || subjectName.value === null) {
    return null;
  }
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (left === null || right === null) {
    return null;
  }
  const declarationOf = (detail: McpCarrierDetailDto) =>
    (detail.servers ?? []).find((server) => server.name === subjectName.value) ?? null;
  const leftDeclaration = declarationOf(left);
  const rightDeclaration = declarationOf(right);
  if (leftDeclaration === null || rightDeclaration === null) {
    return null;
  }
  const leftPath = left.file.sourceRelativePath;
  const rightPath = right.file.sourceRelativePath;
  return {
    sides: [
      {
        caption: 'First file',
        path: leftPath,
        detail: left,
        attribution: attributionText(left.file.sourceId, leftPath),
      },
      {
        caption: 'Second file',
        path: rightPath,
        detail: right,
        attribution: attributionText(right.file.sourceId, rightPath),
      },
    ] as const,
    leftPath,
    rightPath,
    leftText: canonicalDeclaredEntriesJsonText(leftDeclaration.fields),
    rightText: canonicalDeclaredEntriesJsonText(rightDeclaration.fields),
  };
});

/**
 * What this page says for the state it is in — one value read by both the
 * visible copy and the live region, so what a reader hears is the sentence
 * on the screen (WCAG 4.1.3). A link fault outranks the request status.
 */
const stateStatement = computed<string | null>(() => {
  const fault = pairFault.value;
  if (fault !== null) {
    return fault;
  }
  switch (status.value) {
    case 'stale':
      return 'No MCP file in the current scan sits at one of this link’s paths. The inventory may have changed since the link was made; a rescan that brings the file back will make it resolve again.';
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
 * What the polite live region announces; see {@link stateStatement}.
 * 'loading' and 'ready' announce themselves: a reader stepping the pickers
 * holds focus on a select, so without a completion phrase nothing would say
 * the comparison behind it changed (WCAG 4.1.3).
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

// The same rescue for the pickers themselves: a committed generation can
// take the population away and unmount the very select the reader is
// operating (WCAG 2.4.3).
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
 * moves to the heading first, because the button this click came from
 * unmounts with the failed branch the moment the state returns to loading
 * (WCAG 2.4.3).
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
    case 'loading': {
      // The row and its pair in the title, so two comparison tabs never read
      // identically (WCAG 2.4.2; `detail-route.ts` § comparisonTitleSides).
      const sides = comparisonTitleSides(leftSide.value, rightSide.value);
      if (sides === null) {
        return 'Comparing MCP declarations';
      }
      const subject = subjectName.value;
      return subject === null
        ? `Comparing MCP declarations — ${sides}`
        : `Comparing MCP declarations: ${subject} — ${sides}`;
    }
    case 'stale':
      return 'Link not in this scan';
    case 'failed':
    case 'idle':
      return 'Comparison could not be loaded';
  }
  return 'Comparing MCP declarations';
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
  // Leaving the route drops the declarations this page requested; the title
  // subject is `usePageOwnership`'s to release, after unmount, where a
  // replacement page's own report stands.
  comparison.close();
});
</script>

<template>
  <div class="aci-mcp-compare">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the MCP
         list rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=MCP">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">Compare MCP server declarations</h2>

    <!-- The comparison's subject: the declared server name whose row owns
         it, in the carriers' own spelling (FR-007) — the same heading rule
         its inventory row uses. -->
    <p
      v-if="subjectNameText !== null && pairFault === null"
      class="aci-mcp-compare__name"
      :class="subjectNameIsAuthored ? 'aci-authored-text' : 'aci-muted'"
    >
      {{ subjectNameText }}
    </p>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read
         (WCAG 4.1.3). -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>

    <!-- The pickers: a comparison stays inside the one name row that owns
         it, so what a reader chooses is which of that row's carriers stands
         on each side — the same per-side motion as the sibling surfaces,
         under the same rule: only a row with more than two comparable
         carriers offers a move. Native selects, each labelled through
         `for`/`id` (WCAG 2.4.6). -->
    <div v-if="pickersAvailable" ref="pickersRegion" class="aci-mcp-compare__pickers">
      <div class="aci-mcp-compare__picker">
        <label for="aci-mcp-compare-first">First MCP file</label>
        <select id="aci-mcp-compare-first" v-model="leftSelection">
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
      <div class="aci-mcp-compare__picker">
        <label for="aci-mcp-compare-second">Second MCP file</label>
        <select id="aci-mcp-compare-second" v-model="rightSelection">
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
         is evaluated on every render (see readyView). One wrapper, so the
         focus guard can ask whether focus is inside the region a generation
         replacement unmounts. -->
    <div v-if="readyView !== null" ref="readyRegion">
      <!-- Each side stated with its own identity — path, Source, file type,
           read outcome, and which products' recognitions the row lists for
           it — so neither declaration loses its carrier to the diff (US3
           scenario 2). The order is the link's: first named, first shown.
           No source panel follows: a carrier shows its bytes nowhere
           (FR-007). -->
      <div class="aci-mcp-compare__files">
        <section v-for="side in readyView.sides" :key="side.caption">
          <h3>{{ side.caption }}</h3>
          <p class="aci-mcp-compare__file-path aci-path aci-authored-text">
            {{ escapeControlCharacters(side.path) }}
          </p>
          <p class="aci-mcp-compare__file-facts aci-note">
            {{ fileFacts(side.detail) }}
          </p>
          <p v-if="side.attribution !== ''" class="aci-mcp-compare__file-facts aci-note">
            {{ side.attribution }}
          </p>
        </section>
      </div>

      <!-- What the diff holds, said before it: both sides are this page's
           canonical serialization of the declaration, not the carriers'
           own spellings — a `.codex/config.toml` declares in TOML and a
           `.mcp.json` in JSON, and neither file's source is shown (FR-007).
           The canonical key order is stated too, because a reader comparing
           against their own file would otherwise read the order as
           authored. -->
      <p class="aci-note">
        Each side is this server's declaration serialized as JSON with its keys in one canonical
        order; the files' own syntax and key order are not shown.
      </p>
      <DeclarationDiff
        :original-text="readyView.leftText"
        :original-path="readyView.leftPath"
        :modified-text="readyView.rightText"
        :modified-path="readyView.rightPath"
        :content-label="diffContentLabel"
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
        <NuxtLink to="/?kind=MCP"
          >Return to the inventory and open a comparison from an MCP row.</NuxtLink
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.aci-mcp-compare {
  display: flex;
  flex-direction: column;
}

.aci-mcp-compare > p:first-child {
  margin: 0;
}

.aci-mcp-compare h2 {
  margin: 0.25rem 0 0.5rem;
}

.aci-mcp-compare h3 {
  font-size: 1rem;
  margin: 0.75rem 0 0.25rem;
}

/* The subject line reads as the row heading it repeats: the declared name,
   emphasized over the state copy around it. */
.aci-mcp-compare__name {
  font-weight: 600;
  margin: 0 0 0.25rem;
}

/* The two pickers side by side, stacking on a narrow viewport; the selects
   shrink inside their columns rather than widening the page (WCAG 1.4.10). */
.aci-mcp-compare__pickers {
  display: grid;
  gap: 0.5rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  margin-block: 0.25rem;
}

@media (min-width: 52rem) {
  .aci-mcp-compare__pickers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-mcp-compare__picker {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.aci-mcp-compare__pickers select {
  max-inline-size: 100%;
}

/* The two identities side by side above the diff, stacking on a narrow
   viewport (WCAG 1.4.10). */
.aci-mcp-compare__files {
  display: grid;
  gap: 0.25rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-mcp-compare__files {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-mcp-compare__files h3 {
  margin: 0.5rem 0 0.1rem;
}

.aci-mcp-compare__files p {
  margin: 0.1rem 0;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-mcp-compare__file-path {
  overflow-wrap: anywhere;
}
</style>
