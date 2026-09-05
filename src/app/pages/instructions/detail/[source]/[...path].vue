<script setup lang="ts">
// The instruction detail route (T224): what one instruction file declares,
// the instructions that follow, and the complete file those were read from.
//
// The file is the subject, because the file is this kind's inventory unit
// (data-model.md § Inventory unit): no authored declaration names an
// instruction file, so the page is headed by the Source-relative Path — the
// row's own identity, in the same spelling the inventory lists — with the
// recognizing products beside it. The URL is `/instructions/<source-relative
// path>` with no tool segment: unlike a skill definition, no per-tool fact
// distinguishes what the page would show, so the path alone is the link's
// identity, stable across rescans and server launches (FR-030).
//
// The parse and the file are two tabs, not one column, exactly as the skill
// detail splits them: the declarations and instructions answer what the file
// tells a product, while the complete authored source is where every authored
// spelling stays readable — and stacking them would show the same text twice
// on one screen for a file with no frontmatter block.
//
// This surface shows file contents exactly as authored — credentials
// included, with nothing masked and no control that would uncover a masked
// value — and resolves no environment reference: the files are the reader's
// own, over a loopback-bound session (FR-027). What the vendor documents
// about selection order or instruction capacity stays in its maintained
// contract; nothing here projects a winner, an order, or a relationship
// (FR-009, T217).
//
// Leaving the route, a client-data purge, and a commit that replaces the
// generation all drop the open detail through the same cleanup the skill
// route uses; only the URL survives a commit, and the page refetches the same
// path under the new generation.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import LeavesIcon from '~icons/lucide/arrow-right';
import DetailNavigation from '../../../../components/inspection/DetailNavigation.vue';
import SubjectUnavailable from '../../../../components/inspection/SubjectUnavailable.vue';
import FileStrip from '../../../../components/inspection/FileStrip.vue';
import OpenFileButton from '../../../../components/inspection/OpenFileButton.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import RecognitionMarks from '../../../../components/inventory/RecognitionMarks.vue';
import { otherCopiesOf } from '../../../../components/inspection/file-strip';
import { frontmatterYamlText } from '../../../../components/inspection/frontmatter-yaml';
import type { DeclaredEntryDto, SourceKind } from '../../../../../shared/api-types';
import { LEADING_INSTRUCTION_FRONTMATTER_KEYS } from '../../../../components/inspection/declaration-order';
import {
  familyGenerationOf,
  asSourceSelector,
  decodeDetailRoutePath,
  detailNeighbours,
  detailRoute,
  type SourceSelector,
} from '../../../../components/detail-route';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { nextTabForKey } from '../../../../components/tab-navigation';
import { instructionComparisonRouteFor } from '../../../../composables/instruction-comparison';
import { usePageOwnership } from '../../../../composables/page-ownership';
import { ApplicabilityRange } from '../../../../components/applicability-range';
import { useSessionSources } from '../../../../composables/session-sources';
import { useSessionViewState } from '../../../../composables/session-view-state';
import { DIAGNOSTIC_REGISTRY } from '../../../../../shared/diagnostics';
import {
  fileIdentityKey,
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  accessiblePresentationLabel,
  applicabilityRangePresentation,
  escapeControlCharacters,
  isReadableFile,
  pathPresentationLabel,
  inlinePresentationLabel,
} from '../../../../../shared/entities';
import { SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';

const sessionViewState = useSessionViewState();

const route = useRoute();

/**
 * The Source-relative path from the URL's catch-all segments — the file's
 * identity and the whole route identity (FR-030). The router hands the
 * segments over individually and decoded, so joining them with `/` restores
 * the published spelling exactly.
 */
const openAddress = computed(() => ({
  // The router splits the address: `[source]` is its own parameter and the
  // catch-all below it holds the path alone, so nothing here takes a segment
  // off a joined string (`detail-route.ts` § SourceSelector).
  source: asSourceSelector(route.params['source']),
  sourceRelativePath: decodeDetailRoutePath(
    ((parameter) => (typeof parameter === 'string' ? [parameter] : (parameter ?? [])))(
      route.params['path'],
    ),
  ),
}));

/**
 * The Source-relative Path this page is about, or the empty string for an
 * address whose leading segment names no Source this product issues. No file
 * has an empty path, so such an address resolves nothing and the page reports
 * what it already reports for a path the current scan does not hold.
 */
const openPath = computed((): string =>
  openAddress.value.source === null ? '' : openAddress.value.sourceRelativePath,
);

/**
 * The Source this page's address names, the other half of the identity
 * {@link openPath} carries (FR-030). It is what the detail request resolves
 * against and what the open control hands the host, so both answer for the
 * file the address names rather than for whichever Source lists the path
 * first.
 *
 * An address whose leading segment names no Source takes the repository token.
 * Nothing renders under such an address — {@link openPath} is empty, so no
 * detail resolves — so the token is never what a request is made with; it
 * exists so this is a `SourceSelector` rather than a null every caller would
 * branch on.
 */
const openSource = computed((): SourceSelector => openAddress.value.source ?? 'repository');

const entryDetail = sessionViewState.entryDetail;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
const snapshot = sessionViewState.snapshot;

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The addressed Source's own ID, or null when this session carries no such
 * Source — an address naming a token this product issues for a Global Source
 * that is not published now. Every row and file below is scoped by it: a path
 * names a file in each Source that holds it, so an unscoped lookup would state
 * one Source's recognitions under the other's address (FR-030).
 */
const openSourceId = computed(() =>
  openAddress.value.source === null ? null : sessionSources.sourceIdFor(openAddress.value.source),
);

/**
 * The instructions inventory row the URL's identity names, or null when the
 * committed inventory holds none there. Resolved from the snapshot rather
 * than from a fetched detail because the row has to be known before anything
 * is requested: it carries the recognizing products this page states, and a
 * path the inventory does not list is the same dead link the host would
 * answer, reportable without a doomed request.
 *
 * Scoped to the addressed Source: the repository and a consented home can each
 * hold `AGENTS.md`, and the row of the other one describes a different file
 * (FR-030).
 */
const owner = computed(
  () =>
    (snapshot.value?.instructions ?? [])
      .filter((entry) => entry.sourceId === openSourceId.value)
      .flatMap((entry) => entry.files)
      .find((file) => file.sourceRelativePath === openPath.value) ?? null,
);

/**
 * The published row this file belongs to: the range it governs, of its own
 * Source. It is what the range attribute and the strip of other files below it
 * are read from (FR-030).
 */
const ownerRow = computed(
  () =>
    (snapshot.value?.instructions ?? []).find(
      (entry) =>
        entry.sourceId === openSourceId.value &&
        entry.files.some((file) => file.sourceRelativePath === openPath.value),
    ) ?? null,
);

/**
 * What this file governs, in the presentation form the inventory shows: a
 * range spanning lines cannot read as two, and the backslashes a range uses to
 * spell a literal directory name stay the glob syntax they are
 * ({@link applicabilityRangePresentation}). The no-range copy says none is
 * known rather than none is declared, because a file whose declarations could
 * not be read may well declare one (FR-028).
 */
const rangeText = computed(() =>
  ownerRow.value === null || ownerRow.value.applicabilityRange === null
    ? 'No known applicability range'
    : applicabilityRangePresentation(ownerRow.value.applicabilityRange),
);

/**
 * The other files governing the same range, across every Source that governs
 * it: what the strip offers, so the next file of the range is one move rather
 * than a return to the list (FR-007). The one on screen is excluded by the
 * strip itself ({@link otherCopiesOf}).
 */
const rangeCopies = computed(() =>
  (snapshot.value?.instructions ?? [])
    .filter((entry) => entry.applicabilityRange === ownerRow.value?.applicabilityRange)
    .flatMap((entry) =>
      entry.files.map((file) => ({
        key: fileIdentityKey(entry.sourceId, file.sourceRelativePath),
        sourceId: entry.sourceId,
        pathText: pathPresentationLabel(file.sourceRelativePath),
        opens: {
          accessibleText: sessionSources.qualifiedLinkName(
            accessiblePresentationLabel(file.sourceRelativePath),
            entry.sourceId,
          ),
          route: detailRoute(
            'instructions',
            file.sourceRelativePath,
            sessionSources.selectorOf(entry.sourceId),
          ),
        },
        recognitions: file.recognitions,
        carrierText: null,
      })),
    ),
);

/** The strip's own entries: every copy but the one this page shows. */
const otherCopies = computed(() =>
  otherCopiesOf(rangeCopies.value, fileIdentityKey(openSourceId.value ?? '', openPath.value)),
);

/**
 * The ranges either side of this file's in the list's own order, so the next
 * range is one move rather than a return to the inventory (FR-007). The
 * neighbours are ranges rather than files, because a range is what the list's
 * rows are.
 */
const listNeighbours = computed(() => {
  // Grouped by range across Sources, because that is what the list's rows are:
  // the wire carries one entry per `(Source, range)`, and the inventory shows
  // one row per range with its Sources' files under it
  // (`filters.ts` § instructionRangeGroups). Stepping the wire entries instead
  // walked a range twice — Repository `**`, `docs/**`, then a consented home's
  // `**` — so `docs/**`'s next went back to a range the reader had passed.
  //
  // The snapshot's own order is the group order and the first entry of a group
  // is its representative: the host sorts Sources with the repository's first,
  // which is the family-major order the row's own file list is drawn in.
  const groups = [
    ...Map.groupBy(snapshot.value?.instructions ?? [], (entry) => entry.applicabilityRange),
  ];
  const rows = groups.map(([applicabilityRange, entries]) => ({
    // The drawn spelling, and the accessible one beside it, which starts with
    // the drawn spelling (WCAG 2.5.3) and spells the range out after it where
    // the control's collapsed whitespace would otherwise name `**` and ` **`
    // as one move ({@link ApplicabilityRange}; `DetailNavigation.vue`).
    label: new ApplicabilityRange(applicabilityRange).text,
    accessibleLabel: new ApplicabilityRange(applicabilityRange).accessibleText,
    route: detailRoute(
      'instructions',
      entries[0]?.files[0]?.sourceRelativePath ?? '',
      sessionSources.selectorOf(entries[0]?.sourceId ?? ''),
    ),
  }));
  return detailNeighbours(
    rows,
    groups.findIndex(([, entries]) => entries.some((entry) => entry === ownerRow.value)),
  );
});

/**
 * The path as the heading shows it, through the one label rule every surface
 * that draws a path uses ({@link pathPresentationLabel}).
 */
const pathText = computed(() => pathPresentationLabel(openPath.value));

/**
 * Whether {@link pathText} is the spelled-out form rather than the file's own
 * spelling — which a configured fallback basename of whitespace or
 * default-ignorable code points produces. The label then draws this product's
 * characters instead of the reader's, so it is not authored text and does not
 * title the tab. Compared against the escaping rather than tested again, so
 * the two cannot answer differently.
 */
const pathIsSpelledOut = computed(() => pathText.value !== escapeControlCharacters(openPath.value));

/**
 * What a screen reader announces the heading as. The accessible-name
 * computation collapses whitespace, so two paths differing only in consecutive
 * or edge spaces would announce as one heading; the inline label spells such a
 * run out instead, while the visible heading keeps the authored spelling
 * (FR-025) — the same rule every other detail's heading follows.
 */
const headingAccessibleText = computed(() =>
  openPath.value === ''
    ? CUSTOMIZATION_KIND_TEXT.instructions
    : inlinePresentationLabel(openPath.value),
);

// The open file's Source facts (FR-007 "show its source"): the family name
// where more than one family is inspected, and the consented directory where
// the family holds more than one Source — the shared derivation every
// path-addressed detail states them through (`source-facts.ts`).
const { sourceRootText, sourceFamilyCrumbText } = useOpenSourceFacts(
  () => snapshot.value?.sources ?? [],
  () => openSourceId.value,
);

/**
 * Which family the addressed Source belongs to, or null when this session
 * carries no such Source. It is what the comparison this page links to stays
 * inside, and what the heading above names.
 */
const openFamily = computed<SourceKind | null>(() => {
  for (const source of snapshot.value?.sources ?? []) {
    if (source.sourceId === openSourceId.value) {
      return source.kind;
    }
  }
  return null;
});

/**
 * The products that recognize this file and the surfaces they recognize it
 * on, restated from the row so the page and the list agree (FR-007). The row's
 * recognitions are already in the closed tool order and each one's surfaces in
 * the closed surface order.
 */
const recognitions = computed(() => owner.value?.recognitions ?? []);

/** Which family one published Source belongs to, for the block below. */
function familyOf(sourceId: string): SourceKind | null {
  for (const source of snapshot.value?.sources ?? []) {
    if (source.sourceId === sourceId) {
      return source.kind;
    }
  }
  return null;
}

/** One published file's identity as a lookup key: its Source and its path (FR-030). */
function identityKey(sourceId: string | null, sourceRelativePath: string): string {
  return fileIdentityKey(sourceId ?? '', sourceRelativePath);
}

/**
 * The comparison-eligible files of this file's own family, by identity:
 * readable (FR-025), which is the whole gate, exactly as the inventory block and
 * the compare route's own pickers apply it. An MCP carrier is not excluded:
 * which detail answers for a file follows from the row it is reached through and
 * never from the file (FR-007), so a `.mcp.json` a Codex
 * `project_doc_fallback_filenames` entry names is an instruction file with a
 * complete source of its own, and a comparison of instruction files may pair it.
 *
 * Keyed by identity rather than by path, because a family can hold two consented
 * homes and one path can be in both (FR-030).
 */
const comparableIdentities = computed(() => {
  const identities = new Set<string>();
  for (const file of snapshot.value?.files ?? []) {
    if (familyOf(file.sourceId) === openFamily.value && isReadableFile(file)) {
      identities.add(identityKey(file.sourceId, file.sourceRelativePath));
    }
  }
  return identities;
});

/**
 * The comparison entry for this file (FR-011, T278): this file beside a
 * counterpart from the same applicability range of the same Source family — the
 * block that owns every pair this file can be part of, exactly as a skill's
 * entry link stays inside its name's row. Null when this file is not readable or
 * its block holds no readable counterpart; the compare route's own pickers take
 * over from there, so any other pair of the block is one pick away rather than
 * composed here.
 *
 * The counterpart may be in another Source of the family — a reader with two
 * consented homes compares what each of them says — while a pair spanning two
 * families is a pair no block holds (`filters.ts` § InstructionRangeGroup).
 */
const comparePairRoute = computed(() => {
  const source = openAddress.value.source;
  const kind = openFamily.value;
  if (
    source === null ||
    kind === null ||
    owner.value === null ||
    !comparableIdentities.value.has(identityKey(openSourceId.value, openPath.value))
  ) {
    return null;
  }
  // The block: every row of this family at the range this file's row governs.
  const ownRow = (snapshot.value?.instructions ?? []).find(
    (entry) =>
      entry.sourceId === openSourceId.value &&
      entry.files.some((file) => file.sourceRelativePath === openPath.value),
  );
  if (ownRow === undefined) {
    return null;
  }
  for (const entry of snapshot.value?.instructions ?? []) {
    if (
      entry.applicabilityRange !== ownRow.applicabilityRange ||
      familyOf(entry.sourceId) !== kind
    ) {
      continue;
    }
    for (const file of entry.files) {
      if (entry.sourceId === openSourceId.value && file.sourceRelativePath === openPath.value) {
        continue;
      }
      if (!comparableIdentities.value.has(identityKey(entry.sourceId, file.sourceRelativePath))) {
        continue;
      }
      return instructionComparisonRouteFor(
        kind,
        { source, sourceRelativePath: openPath.value },
        {
          source: sessionSources.selectorOf(entry.sourceId),
          sourceRelativePath: file.sourceRelativePath,
        },
      );
    }
  }
  return null;
});

/**
 * The open detail once it is this path's: the fetched entry whose file is the
 * URL's own. The path check keeps a slow previous detail from rendering under
 * this route's heading.
 */
const openDetail = computed(() => {
  const detail = entryDetail.value;
  return detail !== null && detail.file.sourceRelativePath === openPath.value ? detail : null;
});

/**
 * The file's own presentation — the one scan-time parse, published on the
 * instructions variant of the detail (InstructionFileDetailDto). Null when
 * extraction failed all-or-nothing, which is when there is nothing parsed to
 * show and the failure's diagnostic says so (FR-028).
 */
const presentation = computed(() => {
  const detail = openDetail.value;
  return detail !== null && detail.kind === 'instructions' ? detail.presentation : null;
});

/**
 * The frontmatter as the YAML document the detail renders (FR-007,
 * frontmatter-yaml.ts): every declared key the file wrote, led by
 * {@link LEADING_INSTRUCTION_FRONTMATTER_KEYS} and otherwise in the file's own
 * order, spelled back in the block's own language, so a reader compares it
 * against their file without translating and pastes from it without
 * converting.
 */
const frontmatterText = computed(() => {
  const rank = (entry: DeclaredEntryDto): number => {
    // Only a string key can be one of the leading keys: a numeric key spelling
    // `name` is a different key (api-types.ts § DeclaredKeyKind).
    const index =
      entry.keyKind === 'string' ? LEADING_INSTRUCTION_FRONTMATTER_KEYS.indexOf(entry.key) : -1;
    return index === -1 ? LEADING_INSTRUCTION_FRONTMATTER_KEYS.length : index;
  };
  // `toSorted` is stable, so the keys past the leaders keep authored order.
  return frontmatterYamlText(
    (presentation.value?.frontmatter ?? []).toSorted((left, right) => rank(left) - rank(right)),
  );
});

/**
 * Whether the file left no instructions at all. Only an empty string counts:
 * a body of whitespace is what the file wrote after its frontmatter, and
 * calling it none would report a shortened value as the whole (FR-025).
 */
const bodyIsEmpty = computed(() => (presentation.value?.bodyText ?? '') === '');

/**
 * The diagnostics of the open file. The detail response states each record
 * once — a failed extraction is one (file, kind) record (FR-028) — so the
 * list renders as published.
 */
const openDiagnostics = computed(() => openDetail.value?.diagnostics ?? []);

/**
 * The two halves of an instruction detail, as the tab strip presents them:
 * what the parse read out of the file, and the complete file itself. The same
 * split the skill detail uses, for the same reason: two subjects, and stacked
 * they would show one text twice for a file with no frontmatter block.
 */
const INSTRUCTION_DETAIL_TABS = ['instructions', 'file'] as const;

/** Which half is in view; see {@link INSTRUCTION_DETAIL_TABS}. */
type InstructionDetailTab = (typeof INSTRUCTION_DETAIL_TABS)[number];

/** The label each tab shows. */
const INSTRUCTION_DETAIL_TAB_TEXT: Readonly<Record<InstructionDetailTab, string>> = {
  /** Label for the panel holding the file's declarations and instructions. */
  instructions: 'Instructions',
  /** Label for the panel holding the complete authored file. */
  file: 'File',
};

const activeTab = ref<InstructionDetailTab>('instructions');

/** The page's root, for the focus guards below. */
const pageRoot = ref<HTMLElement | null>(null);

/** The `id` of the panel a tab controls (WCAG 4.1.2). */
function instructionTabPanelId(tab: InstructionDetailTab): string {
  return `aci-instruction-panel-${tab}`;
}

/** The `id` of the tab that controls {@link instructionTabPanelId}'s panel. */
function instructionTabId(tab: InstructionDetailTab): string {
  return `aci-instruction-tab-${tab}`;
}

/**
 * Arrow keys move the selection, matching the WAI-ARIA tabs pattern.
 * Selection follows focus because switching panels issues no request and
 * loses no work: both halves are already in hand.
 */
function onTabKeydown(event: KeyboardEvent, index: number): void {
  const next = nextTabForKey(event.key, INSTRUCTION_DETAIL_TABS, index);
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior; swallowing
    // it here would break Tab out of the strip.
    return;
  }
  event.preventDefault();
  activeTab.value = next;
  document.getElementById(instructionTabId(next))?.focus();
}

/**
 * Opening a file starts on what it declares and instructs — unless its
 * extraction failed, where that panel has nothing parsed to show and the
 * complete source is the honest landing (FR-028): the failure's diagnostic
 * stays visible on both.
 *
 * The detail's arrival is where that is decided, because it is the first
 * moment there is anything to decide between: the strip is rendered beside
 * the detail, so until one is in hand no tab is on screen to have been
 * chosen.
 *
 * Which file arrived, rather than that one did: a commit drops the open detail
 * and the route re-requests under the new generation (FR-030), so a rescan
 * while the reader is reading takes the detail away and brings the same one
 * back, and deciding again on that round trip would move a reader who had
 * switched tabs. The identity is the file's own — its Source and its
 * Source-relative Path together — which is what makes a move to another file a
 * new decision and a refetch of this one not (`plugins/detail`
 * § tabDecidedFor, the same rule).
 *
 * A plain `let` rather than a ref: nothing but the watch below reads it, so
 * there is no render to keep in step and a ref would declare state the view
 * depends on when none does.
 */
let tabDecidedFor: string | null = null;
watch([openDetail, openSource, openPath], ([detail, source, path]) => {
  if (detail === null) {
    return;
  }
  const decidingFor = `${source}\u0000${path}`;
  if (tabDecidedFor === decidingFor) {
    return;
  }
  tabDecidedFor = decidingFor;
  activeTab.value = presentation.value !== null ? 'instructions' : 'file';
});

/**
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
 */
const detailFailure = computed<string | null>(() => {
  // An idle page holding nothing is this route's recoverable failure state
  // however it was reached — a failed request carries its message in
  // `detailError`, while a newer-generation refresh that could not adopt
  // leaves the message to the shell and this statement stands alone.
  const statement =
    openDetail.value === null && detailState.value === 'idle'
      ? 'This instruction file could not be loaded.'
      : null;
  if (statement === null) {
    return null;
  }
  return detailError.value === null ? statement : `${statement} ${detailError.value}`;
});

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus (WCAG 4.1.3): the stale state, the
 * in-flight load, and a request that failed. Each phrase matches the visible
 * copy; ready content is read as focus moves through it.
 */
const detailAnnouncement = computed(() => {
  if (detailState.value === 'stale' || owner.value === null) {
    return 'Nothing in the current scan sits at this link’s path.';
  }
  if (detailFailure.value !== null) {
    return detailFailure.value;
  }
  if (detailState.value === 'loading') {
    return 'Loading this instruction file…';
  }
  return '';
});

/** The page heading, focused on entry so a keyboard user starts at the top. */
const heading = ref<HTMLHeadingElement | null>(null);

/** Set as the route is left, so the focus guards yield to the next route. */
let leaving = false;

/**
 * Requests the file the URL currently names. The route watcher below calls it
 * on every selection, and the failed-load branch calls it again as the retry.
 * The one file is both arguments: this kind has no companion to read from it.
 */
const pageOwnership = usePageOwnership();

const requestOpen = (): void => {
  if (owner.value === null) {
    return;
  }
  // The page's own Source, so a same-path file in the other Source cannot
  // answer this request (FR-030).
  void pageOwnership.openFileDetail(openPath.value, openPath.value, openSource.value);
};

// One effect owns "which file should be open", so entering the route and a
// history step between instruction files take the same path. The committed
// generations are part of what "open" means: adopting a newer one closes the
// open detail while the path stays identical, so their change is what
// re-requests the same path under the new snapshot.
watch(
  [
    openPath,
    (): boolean => owner.value !== null,
    (): number => familyGenerationOf(snapshot.value ?? null, openSource.value),
    // The Source is a key beside the path, because it is the other half of the
    // identity: a step that changes only the Source leaves the path identical
    // and the file different, and this page instance is reused across it — the
    // shell keys a page by its route record (`router.options.ts` § pageKey), so
    // a param-only change mounts nothing new. No surface links one Source's
    // detail to the other's today, so every such step currently arrives through
    // the inventory or a fresh load; the key is what keeps that an arrangement
    // of the surfaces rather than something this page depends on (FR-030).
    openSource,
  ],
  ([path, ownerPresent]) => {
    if (path === '' || !ownerPresent) {
      // The URL names nothing this generation holds. Dropping what is open is
      // the point: the page shows the recoverable state below, and holding
      // authored content the reader navigated away from would keep it in
      // memory for nothing.
      pageOwnership.close();
      return;
    }
    requestOpen();
  },
  { immediate: true },
);

// Focus moves to the heading when the page is entered or the open file
// changes: following a link in an SPA moves no focus by itself. The Source is
// watched beside the path because this kind is the one two Sources can both
// publish: a step between their same-path details changes the file the page
// shows while the path stays put, and focus has to follow that (WCAG 2.4.3).
function focusHeading(): void {
  heading.value?.focus();
}

onMounted(focusHeading);
watch([openPath, openSource], () => void nextTick(focusHeading));

/**
 * What the document title says this page is showing (WCAG 2.4.2): the path
 * the heading shows while a file is open, and the state the page is in
 * otherwise, so a reader returning to a tab is never told it shows a file
 * the link no longer resolves. The raw path, not the escaped spelling: the
 * shell escapes its subject exactly once at the rendering boundary. Null when
 * the escaped spelling would draw nothing — the shell then titles the tab by
 * this route's surface name, because the spelled-out presentation the heading
 * falls back to contains backslashes the shell's escaping would double. An
 * empty path never reaches the last branch: no inventory row has an empty
 * path, so the dead-link state above answers for it.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return 'Loading an instruction file';
  }
  if (detailState.value === 'stale' || owner.value === null) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Instruction file could not be loaded';
  }
  return pathIsSpelledOut.value
    ? null
    : `${openPath.value} — ${SOURCE_SELECTOR_TEXT[openSource.value]}`;
});
watchEffect(() => {
  // Reported as this page instance's own, so an outgoing page's unmount
  // cannot erase what this page just titled the tab with
  // (`SessionViewState.reportPageSubject`).
  pageOwnership.reportSubject(titleSubject.value);
});

/**
 * The failed-load retry. Separate from {@link requestOpen} because the button
 * this click comes from vanishes with the failed branch the moment the state
 * returns to loading, and focus would drop to the document body
 * (WCAG 2.4.3); the heading is the landmark that survives the transition.
 */
const retryOpen = (): void => {
  focusHeading();
  requestOpen();
};

// A generation replacement drops a detail that was on screen — the tabs and
// the viewer unmount — without moving the URL, so if keyboard focus is inside
// that subtree it would drop to the document body (WCAG 2.4.3). Only an
// actually-departing detail moves focus: a request that fails before anything
// was shown unmounts nothing but the loading line, and the reader may be on
// the surviving back link — an error is announced through the live region,
// never by forcing focus (contracts/accessibility-acceptance.md § 4.1.3).
// The path condition keeps this guard out of a history step to another
// instruction file, whose own `openPath` watcher focuses the heading after
// the flush so the new path is what gets announced — this guard would focus
// it while it still shows the path being left. Synchronous, because
// afterwards the focused element is already gone.
watch(
  openDetail,
  (detail, previous) => {
    if (
      detail === null &&
      previous !== null &&
      previous.file.sourceRelativePath === openPath.value &&
      !leaving &&
      pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== heading.value
    ) {
      focusHeading();
    }
  },
  { flush: 'sync' },
);

// The stale transition replaces the whole body of the page below the heading
// — the loading line or the detail alike — so its guard watches the state
// itself and considers the whole page root, the same shape the skill detail
// uses (WCAG 2.4.3).
watch(
  [detailState, owner],
  ([state, resolved]) => {
    if (
      (state === 'stale' || resolved === null) &&
      !leaving &&
      pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== heading.value
    ) {
      focusHeading();
    }
  },
  { flush: 'sync' },
);

onBeforeUnmount(() => {
  leaving = true;
  // The title subject and the open detail are both `usePageOwnership`'s to
  // drop, after unmount, where the focus guards above are naturally inert
  // and a replacement page's own report or open stands.
});
</script>

<template>
  <div ref="pageRoot" class="aci-instruction-detail aci-route">
    <!-- The way back and the ranges either side of this file's, drawn in the
         bar with every other route's moves (`DetailNavigation.vue`). The kind
         is URL state, so naming it is what makes the move land on the
         instructions list rather than the kind order's default tab. -->
    <DetailNavigation
      list-route="/?kind=instructions"
      :list-text="CUSTOMIZATION_KIND_TEXT.instructions"
      :previous="listNeighbours.previous"
      :next="listNeighbours.next"
    />

    <!-- Where the page sits, which is location rather than a way out: the
         Source family, the kind, and this page's own subject. -->
    <p class="aci-detail-crumbs">
      <template v-if="sourceFamilyCrumbText !== null"
        >{{ sourceFamilyCrumbText }} <span>›</span> </template
      >{{ CUSTOMIZATION_KIND_TEXT.instructions }} <span>›</span>
      <span class="aci-detail-crumbs__subject aci-path">{{ pathText }}</span>
    </p>

    <div class="aci-instruction-detail__title">
      <h2 ref="heading" tabindex="-1" class="aci-detail-title" :aria-label="headingAccessibleText">
        <!-- The file's path heads the page — the row's own identity, in the
           same spelling the inventory lists: escaped for presentation, never
           a locator anything can open (FR-024, FR-030). A path whose escaped
           spelling draws nothing is spelled out in full instead — a spelled
           presentation, not the authored run, so it drops the authored-text
           treatment (data-model.md § SourceRelativePath) — and a URL with no
           path segments at all is headed by the kind, so the heading always
           describes the page (WCAG 2.4.6). -->
        <template v-if="openPath === ''">{{ CUSTOMIZATION_KIND_TEXT.instructions }}</template>
        <span v-else class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{
          pathText
        }}</span>
      </h2>
      <!-- The comparison this file's range can make (FR-011), at the end of
           the heading's own line — where every kind whose subject is the
           heading puts its own (`agents/detail`, `mcp/detail`). On the tabs'
           row it read as a control on what the tabs select, which is one half
           of the file rather than the file this comparison is of. -->
      <NuxtLink
        v-if="comparePairRoute !== null"
        :to="comparePairRoute"
        class="aci-button aci-button--primary aci-instruction-detail__title-end"
        >Compare this instruction file
        <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
      /></NuxtLink>
    </div>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ detailAnnouncement }}
    </p>

    <template v-if="detailState === 'loading'">
      <p class="aci-empty">Loading this instruction file…</p>
    </template>

    <template v-else-if="detailState === 'stale' || owner === null">
      <SubjectUnavailable outcome="warning">
        Nothing in the current scan sits at this link's path. The inventory may have changed since
        the link was made; a rescan that brings the path back will make it resolve again.
        <template #exit>
          <NuxtLink to="/?kind=instructions">Return to the inventory and open it again.</NuxtLink>
        </template>
      </SubjectUnavailable>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request —
         the shell reports what happened to the session, so neither hides or
         repeats the other. -->
    <template v-else-if="openDetail === null">
      <SubjectUnavailable outcome="error">
        {{ detailFailure }}
        <template #exit>
          <button type="button" @click="retryOpen">Try again</button>
        </template>
      </SubjectUnavailable>
    </template>

    <template v-else>
      <!-- What this customization is, on one line: what the file governs, how
           it read, which products recognize it and where they document reading
           it, and the command that opens it. Restated from the row so the page
           and the list agree (FR-007); no product is quoted for what it would
           select or load, because existence is what an admission proves
           (FR-009). -->
      <p class="aci-detail-attributes">
        <span
          >Applies to <strong class="aci-path aci-authored-text">{{ rangeText }}</strong></span
        >
        <span
          >{{ FILE_ENCODING_TEXT[openDetail.file.encoding]
          }}<template v-if="openDetail.file.encoding !== 'unknown'">
            · {{ openDetail.file.sizeBytes }} bytes</template
          ></span
        >
        <RecognitionMarks :recognitions="recognitions" named />
        <!-- The command that opens the file, at the end of the line that
             states that file's facts — the one place every kind puts it, so a
             reader who found it on one detail finds it on the next. Outside
             the heading so it does not join the heading's accessible name: a
             reader hearing the page's landmarks should hear the file, not an
             action on it (WCAG 2.4.6). -->
        <span class="aci-detail-attributes__end">
          <OpenFileButton
            :source-relative-path="openDetail.file.sourceRelativePath"
            :source="openSource"
          />
        </span>
      </p>

      <!-- Which directory the file was in, where its family holds more than
           one: an escaped presentation of the admitted root, never a path
           anything can open (FR-002). -->
      <p v-if="sourceRootText !== null" class="aci-instruction-detail__root aci-note">
        <span class="aci-authored-text">{{ sourceRootText }}</span>
      </p>

      <!-- The other files governing the same range, one line whatever the
           count (`FileStrip.vue`). Nothing here states an order or a winner:
           which file a session loads turns on runtime this tool does not
           observe (FR-009). -->
      <FileStrip
        :open-source-id="openSourceId"
        :entries="otherCopies"
        :label="`Other files applying to ${rangeText}`"
      />

      <!-- Two subjects, two tabs: what the parse read out of the file, and
           the complete file itself. A real `tablist`, with the roving
           tabindex and arrow keys the WAI-ARIA tabs pattern specifies
           (QR-004, contracts/accessibility-acceptance.md). -->
      <div class="aci-kind-tabs" role="tablist" aria-label="Instruction detail">
        <button
          v-for="(tab, index) in INSTRUCTION_DETAIL_TABS"
          :id="instructionTabId(tab)"
          :key="tab"
          class="aci-kind-tab"
          type="button"
          role="tab"
          :aria-controls="instructionTabPanelId(tab)"
          :aria-selected="tab === activeTab"
          :tabindex="tab === activeTab ? 0 : -1"
          @click="activeTab = tab"
          @keydown="onTabKeydown($event, index)"
        >
          {{ INSTRUCTION_DETAIL_TAB_TEXT[tab] }}
        </button>
      </div>

      <!-- Both panels stay in the document and the unselected one is hidden,
           so Monaco keeps its model and the reader's scroll position across a
           tab switch, and both `aria-controls` IDREFs resolve. -->
      <div
        v-show="activeTab === 'instructions'"
        :id="instructionTabPanelId('instructions')"
        role="tabpanel"
        :aria-labelledby="instructionTabId('instructions')"
        tabindex="0"
      >
        <!-- A failed extraction leaves this panel with nothing parsed to
             show; its Diagnostic is what says so, and the complete source is
             one tab away (FR-028). -->
        <ul v-if="presentation === null && openDiagnostics.length > 0" class="aci-list" role="list">
          <li
            v-for="diagnostic in openDiagnostics"
            :key="diagnostic.diagnosticId"
            :class="
              DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'
            "
          >
            {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
          </li>
        </ul>

        <div v-if="presentation" class="aci-instruction-detail__declarations">
          <p v-if="presentation.frontmatter.length === 0" class="aci-note">
            This file declares none.
          </p>
          <!-- The declared keys as one read-only YAML document in the file's
               own order (FR-007), through the same viewer the instructions
               use — sized to the block, because a frontmatter is short
               (SourceViewer § fitContent). YAML because the block is YAML:
               nothing here is markup, a link, or a resolved reference
               (FR-025, FR-026, FR-033). -->
          <SourceViewer
            v-else
            panel-label="Frontmatter"
            :source-text="frontmatterText"
            :source-relative-path="openPath"
            content-label="Frontmatter of"
            content-language="yaml"
          />
        </div>

        <div v-if="presentation" class="aci-instruction-detail__instructions">
          <p v-if="bodyIsEmpty" class="aci-note">This file has none.</p>
          <!-- The same read-only viewer the file tab uses, given the file's
               own path so the body is highlighted as the Markdown it is.
               Highlighting is tokenizing, not rendering: no heading becomes
               large, no link becomes clickable, and no image loads (FR-033). -->
          <SourceViewer
            v-else
            panel-label="Instructions"
            :source-text="presentation.bodyText"
            :source-relative-path="openPath"
            content-label="Instructions of"
          />
        </div>
      </div>

      <div
        v-show="activeTab === 'file'"
        :id="instructionTabPanelId('file')"
        role="tabpanel"
        :aria-labelledby="instructionTabId('file')"
        tabindex="0"
      >
        <!-- What the read produced, and nothing else. The file below is the
             file; a viewer that narrated what a file might contain would be
             telling the reader about their own repository (FR-027). -->
        <p class="aci-note">
          {{ FILE_ENCODING_TEXT[openDetail.file.encoding]
          }}<template v-if="openDetail.file.encoding !== 'unknown'">
            · {{ openDetail.file.sizeBytes }} bytes</template
          ><template v-if="isReadableFile(openDetail.file) && openDetail.file.hadLeadingBom">
            · byte-order mark removed before decoding</template
          >
        </p>

        <ul v-if="openDiagnostics.length > 0" class="aci-list" role="list">
          <li
            v-for="diagnostic in openDiagnostics"
            :key="diagnostic.diagnosticId"
            :class="
              DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'
            "
          >
            {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
          </li>
        </ul>

        <!-- Only the readable variants carry text. An unreadable file has no
             source to show and its diagnostic above says why. -->
        <SourceViewer
          v-if="isReadableFile(openDetail.file)"
          panel-label="Source"
          :source-text="openDetail.file.sourceText"
          :source-relative-path="openDetail.file.sourceRelativePath"
        />
        <p v-else class="aci-note">This file has no source text to show.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The instruction detail reads top to bottom: what the file is, what it
   declares, what it instructs, then the complete file. It scrolls as a page
   rather than fitting the viewport, the same trade the skill detail makes. */
.aci-instruction-detail {
  display: flex;
  flex-direction: column;
}

/* The heading block is chrome, and every line of it is a line the file does
   not get, so it is tighter here than the shell's default heading spacing. */
.aci-instruction-detail > p:first-child {
  margin: 0;
}

/* The two halves of the parse, inside the tab that holds them. */
.aci-instruction-detail__declarations,
.aci-instruction-detail__instructions {
  padding-block-start: 0.75rem;
}

.aci-instruction-detail__declarations > h3,
.aci-instruction-detail__instructions > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* Tighter than the shell's section-heading baseline, because the heading
   block is chrome; the authored path may have no break opportunities of its
   own, and without the wrap a long one forces sideways scrolling at narrow
   widths and 200% zoom (WCAG 1.4.10). */
/* The path and the link that opens it on one line, wrapping together when the
   path is long. */
.aci-instruction-detail__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.75rem;
  margin-block-end: 0.5rem;
}

/* The comparison closes the heading's line, as it does on every kind whose
   subject is the heading. */
.aci-instruction-detail__title-end {
  margin-inline-start: auto;
}

.aci-instruction-detail h2 {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}
</style>
