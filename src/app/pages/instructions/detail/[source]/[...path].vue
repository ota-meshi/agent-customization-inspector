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
import { computed, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import LeavesIcon from '~icons/lucide/arrow-right';
import DetailAttributes from '../../../../components/inspection/DetailAttributes.vue';
import SubjectTabStrip from '../../../../components/inspection/SubjectTabStrip.vue';
import SubjectTabPanel from '../../../../components/inspection/SubjectTabPanel.vue';
import DetailDiagnostics from '../../../../components/inspection/DetailDiagnostics.vue';
import type { DetailPageControls } from '../../../../composables/detail-heading-focus';
import DetailPage from '../../../../components/inspection/DetailPage.vue';
import FileStrip from '../../../../components/inspection/FileStrip.vue';
import SourceRootNote from '../../../../components/inspection/SourceRootNote.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import { otherCopiesOf, type FileStripEntry } from '../../../../components/inspection/file-strip';
import ToolMark from '../../../../components/ToolMark.vue';
import { VENDOR_SURFACE_TEXT } from '../../../../../shared/registries/behavior-text';
import { frontmatterYamlText } from '../../../../components/inspection/frontmatter-yaml';
import type {
  DeclaredEntryDto,
  FileRecognitionDto,
  InstructionInventoryEntryDto,
  SourceKind,
} from '../../../../../shared/api-types';
import type { RouteLocationRaw } from 'vue-router';
import { LEADING_INSTRUCTION_FRONTMATTER_KEYS } from '../../../../components/inspection/declaration-order';
import {
  asSourceSelector,
  detailNeighbours,
  detailRoute,
  detailRoutePathOf,
  originRowRangeOf,
  originRowRangeQuery,
} from '../../../../components/detail-route';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { useSubjectTabs } from '../../../../composables/subject-tabs';
import { instructionComparisonRouteFor } from '../../../../composables/instruction-comparison';
import { useDetailAddress, usePathPresentation } from '../../../../composables/detail-address';
import { useDetailRequest } from '../../../../composables/detail-request';
import { usePageOwnership, useReportedPageSubject } from '../../../../composables/page-ownership';
import { ApplicabilityRange } from '../../../../components/applicability-range';
import { useSessionSources } from '../../../../composables/session-sources';
import { useSessionViewState } from '../../../../composables/session-view-state';
import {
  fileIdentityKey,
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_TEXT,
  accessiblePresentationLabel,
  isReadableFile,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../../shared/entities';
import { SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';

const sessionViewState = useSessionViewState();

const route = useRoute();

// The address this page's own filename declares (`[source]/[...path].vue`),
// undone by the module that spells it (`detail-route.ts`). What the resolved
// halves then name is every detail route's alike (`detail-address.ts`); the
// unresolved Source stays in reach because the comparison link below needs the
// token itself rather than the repository the address falls back to.
const routeSource = computed(() => asSourceSelector(route.params['source']));
const { openSource, openSourceId, openPath } = useDetailAddress(routeSource, () =>
  detailRoutePathOf(route.params['path']),
);
const { pathText, pathIsSpelledOut } = usePathPresentation(openPath);

const entryDetail = sessionViewState.entryDetail;
const snapshot = sessionViewState.snapshot;

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The instructions inventory rows the URL's identity names — every row of the
 * addressed Source that lists this file, in the snapshot's own order — or
 * empty when the committed inventory holds none there. Resolved from the
 * snapshot rather than from a fetched detail because the rows have to be known
 * before anything is requested: they carry the ranges and recognizing products
 * this page states, and a path the inventory does not list is the same dead
 * link the host would answer, reportable without a doomed request.
 *
 * More than one row when two products derive different ranges for the file —
 * a `.claude/AGENTS.md` is Claude Code's `**` and GitHub Copilot's
 * `.claude/**` (`session.ts` § projectInstructionInventory) — and the page
 * shows every one of them, whichever the reader followed.
 *
 * Scoped to the addressed Source: the repository and a consented home can each
 * hold `AGENTS.md`, and the row of the other one describes a different file
 * (FR-030).
 */
const ownRows = computed(() =>
  (snapshot.value?.instructions ?? []).filter(
    (entry) =>
      entry.sourceId === openSourceId.value &&
      entry.files.some((file) => file.sourceRelativePath === openPath.value),
  ),
);

/**
 * The row the reader followed: the one the link's `range` query names, or the
 * first row holding the file where it names none or names a range this
 * generation no longer publishes for it (`detail-route.ts` §
 * originRowRangeQuery). It decides the moves to the previous and next range
 * and nothing the page shows.
 */
const enteredRow = computed(() => {
  const range = originRowRangeOf(route.query['range']);
  return (
    ownRows.value.find((entry) => range !== null && entry.applicabilityRange === range) ??
    ownRows.value[0] ??
    null
  );
});

/**
 * One recognition as a range's box lists it: the product and the surfaces of
 * the documented behaviors its admitting rules rest on (FR-009), spelled once
 * here so the template draws them rather than composing them.
 */
class InstructionRangeRecognition {
  /** The recognizing product. */
  public readonly tool: FileRecognitionDto['tool'];

  /** The surfaces, in the closed surface order, joined for the row. */
  public readonly surfacesText: string;

  /** Takes one published recognition of the open file. */
  public constructor(recognition: FileRecognitionDto) {
    this.tool = recognition.tool;
    this.surfacesText = recognition.surfaces
      .map((surface) => VENDOR_SURFACE_TEXT[surface])
      .join(', ');
  }
}

/**
 * One range this file governs, as its box on the page: the range, the
 * products that give the file that range, the range's comparison entry, and
 * the other files of the range. Everything is the row's own, because the
 * range is what a product derived — a file two products give two ranges is on
 * two rows, each carrying only the recognitions that put it there
 * (`session.ts` § projectInstructionInventory).
 */
class InstructionRangeGroup {
  /** The range, in the presentation form the row's own heading draws. */
  public readonly range: ApplicabilityRange;

  /** The open file's recognitions on this row, in the closed tool order. */
  public readonly recognitions: readonly InstructionRangeRecognition[];

  /** The other files of this range, for the box's closing strip. */
  public readonly otherCopies: readonly FileStripEntry[];

  /** This range's comparison, or null where its block holds no counterpart. */
  public readonly compareRoute: RouteLocationRaw | null;

  /** Reads the open file's own recognitions off the row that lists it. */
  public constructor(
    row: InstructionInventoryEntryDto,
    openPath: string,
    otherCopies: readonly FileStripEntry[],
    compareRoute: RouteLocationRaw | null,
  ) {
    this.range = new ApplicabilityRange(row.applicabilityRange);
    this.recognitions = (
      row.files.find((file) => file.sourceRelativePath === openPath)?.recognitions ?? []
    ).map((recognition) => new InstructionRangeRecognition(recognition));
    this.otherCopies = otherCopies;
    this.compareRoute = compareRoute;
  }
}

/**
 * One box per range this file governs, in the rows' own order, whether it
 * governs one or two: a page whose shape changed with the count would leave a
 * reader who learned one shape puzzled by the other. The range heads the box,
 * the products that give the file that range are the rows inside it, and the
 * other files of the range close it — the same order the skill detail gives a
 * file two products invoke by two names, because the range is to an
 * instruction file what the name is to a skill (FR-007).
 */
const rangeGroups = computed((): readonly InstructionRangeGroup[] =>
  ownRows.value.map(
    (row) =>
      new InstructionRangeGroup(
        row,
        openPath.value,
        otherCopiesOf(
          copiesOfRange(row.applicabilityRange),
          fileIdentityKey(openSourceId.value ?? '', openPath.value),
        ),
        comparePairRouteFor(row.applicabilityRange),
      ),
  ),
);

/**
 * Every file governing one range, across every Source that governs it: what
 * that range's strip offers, so the next file of the range is one move rather
 * than a return to the list (FR-007). The one on screen is excluded by the
 * strip itself ({@link otherCopiesOf}). Each link carries the range, so the
 * page it opens steps from this range's row
 * (`detail-route.ts` § originRowRangeQuery).
 */
function copiesOfRange(range: string | null): readonly FileStripEntry[] {
  return (snapshot.value?.instructions ?? [])
    .filter((entry) => entry.applicabilityRange === range)
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
          route: {
            path: detailRoute(
              'instructions',
              file.sourceRelativePath,
              sessionSources.selectorOf(entry.sourceId),
            ),
            query: originRowRangeQuery(range),
          },
        },
        recognitions: file.recognitions,
        carrierText: null,
      })),
    );
}

/**
 * The ranges either side of the row the reader followed, in the list's own
 * order, so the next range is one move rather than a return to the inventory
 * (FR-007). The neighbours are ranges rather than files, because a range is
 * what the list's rows are, and each move carries the range it opens so a
 * neighbour whose first file sits in two ranges lands on that range's row
 * rather than walking the reader back up the list.
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
    route: {
      path: detailRoute(
        'instructions',
        entries[0]?.files[0]?.sourceRelativePath ?? '',
        sessionSources.selectorOf(entries[0]?.sourceId ?? ''),
      ),
      query: originRowRangeQuery(applicabilityRange),
    },
  }));
  return detailNeighbours(
    rows,
    groups.findIndex(([, entries]) => entries.some((entry) => entry === enteredRow.value)),
  );
});

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
 * The comparison entry for this file in one of its ranges (FR-011, T278): this
 * file beside a counterpart from the same applicability range of the same
 * Source family — the block that owns every pair this file can be part of
 * there, exactly as a skill's entry link stays inside its name's box. Null when
 * this file is not readable or that block holds no readable counterpart; the
 * compare route's own pickers take over from there, so any other pair of the
 * block is one pick away rather than composed here.
 *
 * The counterpart may be in another Source of the family — a reader with two
 * consented homes compares what each of them says — while a pair spanning two
 * families is a pair no block holds (`filters.ts` § InstructionRangeGroup).
 */
function comparePairRouteFor(range: string | null): RouteLocationRaw | null {
  const source = routeSource.value;
  const kind = openFamily.value;
  if (
    source === null ||
    kind === null ||
    !comparableIdentities.value.has(identityKey(openSourceId.value, openPath.value))
  ) {
    return null;
  }
  for (const entry of snapshot.value?.instructions ?? []) {
    if (entry.applicabilityRange !== range || familyOf(entry.sourceId) !== kind) {
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
}

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

// Where focus sits: the frame bounds this page and holds its heading focus
// (`DetailPage.vue`), and the guards below ask that focus to rescue itself.
const page = useTemplateRef<DetailPageControls>('page');

const pageOwnership = usePageOwnership();

// The effect that keeps the open file the one the URL names
// (`detail-request.ts`). This kind's subject is its path alone, so nothing is
// selected inside it; the page's own Source is passed so a same-path file in
// the other Source cannot answer this request (FR-030).
const request = useDetailRequest({
  openPath,
  openSource,
  selection: null,
  ready: () => ownRows.value.length > 0,
  perform: () => {
    void pageOwnership.openFileDetail(
      openPath.value,
      openPath.value,
      openSource.value,
      'instructions',
    );
  },
  focusHeading: () => page.value?.focusHeading(),
});
const { detailState } = request;

/** The strip and the panels it controls (`subject-tabs.ts` § SubjectTabs). */
const subjectTabs = useSubjectTabs({
  tabs: INSTRUCTION_DETAIL_TABS,
  initialTab: 'instructions',
  idPrefix: 'instruction',
});

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
  subjectTabs.activeTab = presentation.value !== null ? 'instructions' : 'file';
});

/**
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
 */
const detailFailure = request.failureOf(() =>
  openDetail.value === null && detailState.value === 'idle'
    ? 'This instruction file could not be loaded.'
    : null,
);

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
  if (detailState.value === 'stale' || ownRows.value.length === 0) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Instruction file could not be loaded';
  }
  return pathIsSpelledOut.value
    ? null
    : `${openPath.value} — ${SOURCE_SELECTOR_TEXT[openSource.value]}`;
});
useReportedPageSubject(titleSubject);
</script>

<template>
  <DetailPage
    ref="page"
    class="aci-instruction-detail"
    :kind-text="CUSTOMIZATION_KIND_TEXT.instructions"
    list-route="/?kind=instructions"
    :neighbours="listNeighbours"
    :source-family-crumb-text="sourceFamilyCrumbText"
    :path-text="pathText"
    :path-is-spelled-out="pathIsSpelledOut"
    :accessible-text="headingAccessibleText"
    :open-path="openPath"
    :open-source="openSource"
    :selection="null"
    :subject-resolved="ownRows.length > 0"
    missing-text="Nothing in the current scan sits at this link's path."
    :failure-text="detailFailure"
    loading-text="Loading this instruction file…"
    :subject="openDetail"
    @retry="request.retryOpen()"
  >
    <!-- eslint-disable-next-line vue/no-template-shadow -- same value, same name, never null -->
    <template #default="{ subject: openDetail }">
      <!-- The file's own facts, on the line under the heading: how it read, its
           size, and the command that opens it. The ranges and the products are
           not here: which range a file governs is each recognizing product's
           own derivation, so they are a box apiece below rather than one value
           on this line — the arrangement the skill detail gives a file two
           products invoke by two names (FR-007). No product is quoted for what
           it would select or load, because existence is what an admission
           proves (FR-009). -->
      <DetailAttributes :file="openDetail.file" :source="openSource" />

      <SourceRootNote :text="sourceRootText" />

      <!-- One box per range this file governs, stacked: the range heads it
           with the range's comparison at the end of that band, the products
           that give the file this range are the rows inside, and the other
           files of the range close it. One box when there is one range, so
           the page keeps its shape whatever the count. -->
      <ul class="aci-instruction-detail__ranges" role="list">
        <li v-for="group in rangeGroups" :key="group.range.text">
          <p class="aci-instruction-detail__range-head">
            <!-- Whether a range is known decides the prefix; whether its drawn
                 spelling is its own characters decides only the styling, so a
                 declared whitespace-only range keeps its prefix
                 (`applicability-range.ts` § isKnown). -->
            <span v-if="group.range.isKnown"
              >Applies to
              <strong class="aci-path" :class="{ 'aci-authored-text': group.range.isDeclared }">{{
                group.range.text
              }}</strong></span
            >
            <span v-else>{{ group.range.text }}</span>
            <!-- This range's comparison (FR-011). The accessible name carries
                 the range, because a page listing two ranges offers the same
                 phrase twice (WCAG 2.4.6; label-in-name keeps the visible
                 phrase as the prefix). -->
            <NuxtLink
              v-if="group.compareRoute !== null"
              :to="group.compareRoute"
              class="aci-button aci-button--primary aci-instruction-detail__range-compare"
              :aria-label="`Compare this instruction file: ${group.range.accessibleText}`"
              >Compare this instruction file
              <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
            /></NuxtLink>
          </p>
          <ul class="aci-instruction-detail__recognitions" role="list">
            <li v-for="recognition in group.recognitions" :key="recognition.tool">
              <span class="aci-instruction-detail__product">
                <ToolMark :tool="recognition.tool" decorative />
                {{ SUPPORTED_TOOL_TEXT[recognition.tool] }}</span
              >
              <span class="aci-instruction-detail__surfaces">{{ recognition.surfacesText }}</span>
            </li>
          </ul>
          <!-- The other files governing this range, one line whatever the
               count (`FileStrip.vue`), drawn as the box's last row. Nothing
               here states an order or a winner: which file a session loads
               turns on runtime this tool does not observe (FR-009). -->
          <FileStrip
            :open-source-id="openSourceId"
            :entries="group.otherCopies"
            box-row
            :label="`Other files applying to ${group.range.text}`"
            :accessible-label="`Other files applying to ${group.range.accessibleText}`"
          />
        </li>
      </ul>

      <!-- Two subjects, two tabs: what the parse read out of the file, and
           the complete file itself. A real `tablist`, with the roving
           tabindex and arrow keys the WAI-ARIA tabs pattern specifies
           (QR-004, contracts/accessibility-acceptance.md). -->
      <SubjectTabStrip :tabs="subjectTabs" label="Instruction detail">
        <template #tab="{ tab }">{{ INSTRUCTION_DETAIL_TAB_TEXT[tab] }}</template>
      </SubjectTabStrip>

      <!-- Both panels stay in the document and the unselected one is hidden,
           so the source box keeps its text and the reader's scroll position across a
           tab switch, and both `aria-controls` IDREFs resolve. -->
      <SubjectTabPanel :tabs="subjectTabs" tab="instructions">
        <!-- A failed extraction leaves this panel with nothing parsed to
             show; its Diagnostic is what says so, and the complete source is
             one tab away (FR-028). -->
        <DetailDiagnostics v-if="presentation === null" :diagnostics="openDiagnostics" />

        <div v-if="presentation" class="aci-instruction-detail__declarations">
          <p v-if="presentation.frontmatter.length === 0" class="aci-note">
            This file declares none.
          </p>
          <!-- The declared keys as one read-only YAML document in the file's
               own order (FR-007), through the same viewer the instructions
               use — sized to the block, because a frontmatter is short
               (SourceViewer § fitContent). YAML because the block is YAML:
               nothing here is markup, a link, or a resolved reference
               (FR-025, FR-026, FR-033). "Frontmatter" because every
               instruction file this product reads is Markdown, so the word
               names what the reader sees on screen; a kind whose keys can
               arrive in another syntax says "Metadata" instead (the agent and
               prompt details), and this label changes with it the day an
               instruction file does. -->
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
      </SubjectTabPanel>

      <SubjectTabPanel :tabs="subjectTabs" tab="file">
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

        <DetailDiagnostics :diagnostics="openDiagnostics" />

        <!-- Only the readable variants carry text. An unreadable file has no
             source to show and its diagnostic above says why. -->
        <SourceViewer
          v-if="isReadableFile(openDetail.file)"
          panel-label="Source"
          :source-text="openDetail.file.sourceText"
          :source-relative-path="openDetail.file.sourceRelativePath"
        />
        <p v-else class="aci-note">This file has no source text to show.</p>
      </SubjectTabPanel>
    </template>
  </DetailPage>
</template>

<style scoped>
/* One box per range, stacked — the skill detail's box per invocation name,
   because the range is to an instruction file what the name is to a skill
   (`skills/detail` § aci-skill-detail__invocations). The range is the box's
   heading and the products that give the file that range are the rows inside,
   which is what makes the comparison and the strip the range's rather than
   the page's. */
.aci-instruction-detail__ranges {
  display: grid;
  gap: 0.375rem;
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
}

.aci-instruction-detail__ranges > li {
  background: var(--aci-surface-raised);
  border: 1px solid var(--aci-line);
  border-radius: 0.4375rem;
  overflow: hidden;
}

/* The range heads its own box on a band of its own, with the comparison it
   owns at the end of that band. It wraps rather than pushing the range off the
   line (WCAG 1.4.10). */
.aci-instruction-detail__range-head {
  align-items: center;
  background: var(--aci-surface-sunken);
  border-block-end: 1px solid var(--aci-hairline);
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  margin: 0;
  padding: 0.3125rem 0.625rem;
}

.aci-instruction-detail__range-compare {
  margin-inline-start: auto;
}

/* One row per recognition: the product, and the surfaces its admitting rules
   rest on (FR-009), in two columns so two products read down one. Below the
   reflow width each row becomes a column of its own. */
.aci-instruction-detail__recognitions {
  display: grid;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aci-instruction-detail__recognitions li {
  align-items: center;
  column-gap: 0.75rem;
  display: grid;
  grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
  padding: 0.25rem 0.625rem;
  row-gap: 0.15rem;
}

/* A hairline between recognitions, inside a box its border already
   identifies (main.css § --aci-hairline). */
.aci-instruction-detail__recognitions li + li {
  border-block-start: 1px solid var(--aci-hairline);
}

@media (width < 40rem) {
  .aci-instruction-detail__recognitions li {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* The product names the row, so it carries the row's weight. */
.aci-instruction-detail__product {
  align-items: center;
  display: flex;
  font-weight: 600;
  gap: 0.3125rem;
}

/* The surfaces qualify the recognition beside them, as they do on a row. */
.aci-instruction-detail__surfaces {
  color: var(--aci-muted);
  font-size: 0.65625rem;
  letter-spacing: 0.01em;
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
</style>
