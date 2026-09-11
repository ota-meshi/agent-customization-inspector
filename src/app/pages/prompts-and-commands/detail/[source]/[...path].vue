<script setup lang="ts">
// The prompt and command detail route (T455):
// `/prompts-and-commands/<source-relative path>` — what one file of the kind
// declares, the prompt that follows, and the complete file those were read
// from.
//
// The file is the subject, and the page is headed by its Source-relative
// Path. The inventory unit is the name a reader invokes (data-model.md
// § Inventory unit), and this page states it under the heading — the answer of
// the rule that admitted the file, derived from the path for a command file
// and declared by a VS Code prompt file — but the file is what the page shows,
// so the path is what heads it. The URL carries no tool segment, so
// the path alone is the link's identity, stable across rescans and server
// launches (FR-030).
//
// The parse and the file are two tabs, not one column, exactly as the
// instruction detail splits them: the declarations and the prompt answer what
// the file tells a product, while the complete authored source is where every
// authored spelling stays readable — and stacking them would show the same
// text twice for a file with no frontmatter block.
//
// This surface shows file contents exactly as authored — credentials
// included, with nothing masked and no control that would uncover a masked
// value — and resolves no environment reference: the files are the reader's
// own, over a loopback-bound session (FR-025, FR-026, FR-027). A name the
// prompt mentions — an agent, a skill, another command — is text on this page
// like every other line: nothing is resolved, opened, imported, or run, and
// no target is read (FR-019, FR-033). Whether typing the name reaches this
// file at all turns on a same-name skill outranking a command, on which of two
// files declaring one prompt name the editor picks, and on runtime this tool
// never observes — so the name here is the one the vendor's own rule resolves
// and never a claim that it leads back here (FR-009).
//
// Leaving the route, a client-data purge, and a commit that replaces the
// generation all drop the open detail through the same cleanup the
// instruction route uses; only the URL survives a commit, and the page
// refetches the same path under the new generation.
import { computed, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import {
  asSourceSelector,
  detailNeighbours,
  detailRoute,
  detailRoutePathOf,
  originRowNameOf,
  originRowNameQuery,
  sideFamilyOf,
} from '../../../../components/detail-route';
import AuthoredNameText from '../../../../components/AuthoredNameText.vue';
import FileStrip from '../../../../components/inspection/FileStrip.vue';
import DetailAttributes from '../../../../components/inspection/DetailAttributes.vue';
import SubjectTabStrip from '../../../../components/inspection/SubjectTabStrip.vue';
import SubjectTabPanel from '../../../../components/inspection/SubjectTabPanel.vue';
import DetailDiagnostics from '../../../../components/inspection/DetailDiagnostics.vue';
import type { DetailPageControls } from '../../../../composables/detail-heading-focus';
import DetailPage from '../../../../components/inspection/DetailPage.vue';
import SourceRootNote from '../../../../components/inspection/SourceRootNote.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import { useDetailAddress, usePathPresentation } from '../../../../composables/detail-address';
import { useDetailRequest } from '../../../../composables/detail-request';
import { usePageOwnership, useReportedPageSubject } from '../../../../composables/page-ownership';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { useSessionSources } from '../../../../composables/session-sources';
import { useSessionViewState } from '../../../../composables/session-view-state';
import {
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
  accessiblePresentationLabel,
  fileIdentityKey,
} from '../../../../../shared/entities';
import { SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';
import { AuthoredName } from '../../../../components/authored-name';
import { LEADING_PROMPT_METADATA_KEYS } from '../../../../components/inspection/declaration-order';
import { otherCopiesOf, type FileStripEntry } from '../../../../components/inspection/file-strip';
import { frontmatterYamlText } from '../../../../components/inspection/frontmatter-yaml';
import { useSubjectTabs } from '../../../../composables/subject-tabs';
import { promptComparisonRouteFor } from '../../../../composables/prompt-comparison';
import type { DeclaredEntryDto, SourceKind } from '../../../../../shared/api-types';

const sessionViewState = useSessionViewState();

const route = useRoute();

// The address this page's own filename declares (`[source]/[...path].vue`),
// undone by the module that spells it (`detail-route.ts`). What the resolved
// halves then name is every detail route's alike (`detail-address.ts`).
const { openSource, openSourceId, openPath } = useDetailAddress(
  () => asSourceSelector(route.params['source']),
  () => detailRoutePathOf(route.params['path']),
);
const { pathText, pathIsSpelledOut } = usePathPresentation(openPath);

/** The shared Source lookup, for the neighbour routes below. */
const sessionSources = useSessionSources();

// The open file's Source facts (FR-007 "show its source"): the family name
// where more than one family is inspected, and the consented directory where
// the family holds more than one Source (`source-facts.ts`).
const { sourceRootText, sourceFamilyCrumbText } = useOpenSourceFacts(
  () => snapshot.value?.sources ?? [],
  () => openSourceId.value,
);

/**
 * The family the open file's Source is of: the family a comparison entry
 * built on this page stays inside, because a pair never spans two families
 * (contracts/http-api.md § Host requirements #5).
 */
const openFamily = computed<SourceKind>(() =>
  sideFamilyOf({ source: openSource.value, sourceRelativePath: openPath.value }),
);

const entryDetail = sessionViewState.entryDetail;
const snapshot = sessionViewState.snapshot;

/**
 * The commands inventory definitions the URL's path names — empty when the
 * committed inventory holds none there. Resolved from the snapshot rather
 * than from a fetched detail because they have to be known before anything is
 * requested: they carry the recognizing products and the names this page
 * states, and a path the inventory does not list is the same dead link the
 * host would answer, reportable without a doomed request.
 *
 * Gathered across rows rather than found in one, because a row is one name
 * and this page is one file: a file two products invoke by different names is
 * a definition on each of those names' rows, and the page is about the file
 * either way (data-model.md § Inventory unit).
 */
const owner = computed(() =>
  (snapshot.value?.prompts ?? []).flatMap((entry) =>
    entry.definitions
      // Both halves of the identity (FR-030): the address's own Source, so a
      // same-path file in another Source cannot answer for this one.
      .filter(
        (definition) =>
          definition.sourceRelativePath === openPath.value &&
          definition.sourceId === openSourceId.value,
      )
      .map((definition) => ({ name: entry.name, definition })),
  ),
);

/**
 * The inventory row this page was opened from, or null where the link named
 * none (`detail-route.ts` § originRowNameQuery). It settles nothing the page
 * shows: one file's page is one page whichever of its names was followed.
 */
const originRowName = computed(() => originRowNameOf(route.query['name']));

/** The kind's own caption, for the heading and the recognition line. */
const kindText = CUSTOMIZATION_KIND_TEXT['prompt/command'];

/**
 * The comparison entry for this file (FR-011, T505): this file beside
 * another file of one of the rows it is listed under — the rows that own
 * every pair this file can be part of, exactly as a skill's entry link stays
 * inside its name's row. Null when this file is not readable or no row of
 * its own holds a readable counterpart; the compare route's own pickers take
 * over from there, so any other pair of the row is one pick away rather than
 * composed here.
 */
const comparePairRoute = computed(() => {
  // Every membership below is by whole identity — Source and path (FR-030) —
  // so a same-path file in another Source is a valid counterpart rather
  // than mistaken for this page's own file.
  const readable = new Set(
    (snapshot.value?.files ?? [])
      .filter(isReadableFile)
      .map((file) => fileIdentityKey(file.sourceId, file.sourceRelativePath)),
  );
  const openId = openSourceId.value;
  if (openId === null || !readable.has(fileIdentityKey(openId, openPath.value))) {
    return null;
  }
  for (const entry of snapshot.value?.prompts ?? []) {
    let holdsOpenFile = false;
    let counterpart: { sourceId: string; sourceRelativePath: string } | undefined;
    for (const definition of entry.definitions) {
      if (definition.sourceId === openId && definition.sourceRelativePath === openPath.value) {
        holdsOpenFile = true;
      } else if (
        counterpart === undefined &&
        readable.has(fileIdentityKey(definition.sourceId, definition.sourceRelativePath)) &&
        // A pair stays inside the open file's family
        // (contracts/http-api.md § Host requirements #5).
        sessionSources.familyKindOf(definition.sourceId) === openFamily.value
      ) {
        counterpart = definition;
      }
    }
    if (holdsOpenFile && counterpart !== undefined) {
      return promptComparisonRouteFor(
        openFamily.value,
        { source: openSource.value, sourceRelativePath: openPath.value },
        {
          source: sessionSources.selectorOf(counterpart.sourceId),
          sourceRelativePath: counterpart.sourceRelativePath,
        },
      );
    }
  }
  return null;
});

/** The inventory link that lands on the commands tab rather than the default. */
const inventoryRoute = '/?kind=prompt%2Fcommand';

/**
 * The products that recognize this file and the surfaces they recognize it on,
 * restated from the row so the page and the list agree (FR-007). One
 * definition per `(file, tool)`, so the file's definitions are its
 * recognitions.
 */
const recognitions = computed(() =>
  owner.value.map(({ definition }) => ({
    tool: definition.tool,
    surfaces: definition.surfaces,
  })),
);

/**
 * The other files carrying the same invocation names, so the next copy is one
 * move rather than a return to the list (FR-007). The one on screen is
 * excluded by the strip itself ({@link otherCopiesOf}).
 */
const nameCopies = computed(() => {
  const names = new Set(owner.value.map(({ name }) => name));
  const byFile = new Map<string, FileStripEntry>();
  // The rows this file is listed under, the one the reader followed first: a
  // copy several of them list then takes that row's name, which is the row the
  // moves either side of it should step ({@link originRowName}). `toSorted` is
  // stable, so the rest keep the list's own order.
  const listedRows = (snapshot.value?.prompts ?? [])
    .filter((entry) => names.has(entry.name))
    .toSorted(
      (left, right) =>
        Number(right.name === originRowName.value) - Number(left.name === originRowName.value),
    );
  for (const entry of listedRows) {
    for (const definition of entry.definitions) {
      const key = fileIdentityKey(definition.sourceId, definition.sourceRelativePath);
      const existing = byFile.get(key);
      byFile.set(
        key,
        existing === undefined
          ? {
              key,
              sourceId: definition.sourceId,
              pathText: pathPresentationLabel(definition.sourceRelativePath),
              opens: {
                accessibleText: sessionSources.qualifiedLinkName(
                  accessiblePresentationLabel(definition.sourceRelativePath),
                  definition.sourceId,
                ),
                route: {
                  path: detailRoute(
                    'prompt/command',
                    definition.sourceRelativePath,
                    sessionSources.selectorOf(definition.sourceId),
                  ),
                  // Under the row that brought this copy into the strip: without
                  // the coordinate the page it opens falls back to whichever of
                  // the copy's rows the snapshot lists first, and the previous and
                  // next moves go with it
                  // (`detail-route.ts` § originRowNameQuery).
                  query: originRowNameQuery(entry.name),
                },
              },
              recognitions: [{ tool: definition.tool, surfaces: definition.surfaces }],
              carrierText: null,
            }
          : {
              ...existing,
              recognitions: [
                ...existing.recognitions,
                { tool: definition.tool, surfaces: definition.surfaces },
              ],
            },
      );
    }
  }
  return [...byFile.values()];
});

/** The strip's own entries: every copy but the one this page shows. */
const otherCopies = computed(() =>
  otherCopiesOf(nameCopies.value, fileIdentityKey(openSourceId.value ?? '', openPath.value)),
);

/**
 * The rows either side of this file's in the list's own order, so the next
 * name is one move rather than a return to the inventory (FR-007).
 */
const listNeighbours = computed(() => {
  const entries = snapshot.value?.prompts ?? [];
  const rows = entries.map((entry) => ({
    // Drawn and announced through the shared unit, so a name with nothing to
    // draw still names its move, and the announced spelling starts with the
    // drawn one ({@link AuthoredName}; FR-025, WCAG 2.5.3).
    label: new AuthoredName(entry.name).text,
    accessibleLabel: new AuthoredName(entry.name).accessibleText,
    // The move carries the row it opens, exactly as that row's own link in the
    // inventory does: a neighbour whose file is listed under two names would
    // otherwise land on the page as the other name's row and offer that row's
    // neighbours, which walks the reader back up the list.
    route: {
      path: detailRoute(
        'prompt/command',
        entry.definitions[0]?.sourceRelativePath ?? '',
        sessionSources.selectorOf(entry.definitions[0]?.sourceId ?? ''),
      ),
      query: originRowNameQuery(entry.name),
    },
  }));
  // The row the reader followed, where this file is listed under more than one
  // name (`detail-route.ts` § originRowNameQuery). The first row holding it is
  // the fallback: a link naming no row, and one naming a row this generation no
  // longer publishes, both land on the same page and differ only here.
  const holdsOpenFile = (entry: { readonly name: string | null }): boolean =>
    owner.value.some(({ name }) => name === entry.name);
  const followed = entries.findIndex(
    (entry) => holdsOpenFile(entry) && entry.name === originRowName.value,
  );
  return detailNeighbours(rows, followed >= 0 ? followed : entries.findIndex(holdsOpenFile));
});

/**
 * The names this file is invoked by, restated from the rows it is listed
 * under so the page and the list agree (FR-007). One name while one product
 * recognizes the file, and the distinct names in row order when two products
 * derive different ones from the same path.
 *
 * Escaped like a path, because a derived one is made of path segments and a
 * declared one is authored text: both are the reader's own characters, and
 * both are shown as what they are (data-model.md § Inventory unit).
 */
const invocationNames = computed(() => {
  // A name drawing nothing is spelled out in full: the reader would otherwise
  // see `Invocation name:` followed by blank space, which says nothing about
  // the name it is showing (FR-025; `PromptRow.vue` draws its row by the same
  // rule, through the same unit). Deduplicated by the drawn text, because two
  // rows drawing one text are one name on this line.
  const seen = new Map<string, AuthoredName>();
  for (const { name } of owner.value) {
    const authored = new AuthoredName(name);
    if (!seen.has(authored.text)) {
      seen.set(authored.text, authored);
    }
  }
  return [...seen.values()];
});

/**
 * The open detail once it is this path's: the fetched entry whose file is the
 * URL's own. The path check keeps a slow previous detail from rendering under
 * this route's heading.
 *
 * The variant is this route's own or the plain file: `get-file-detail` is
 * asked for this kind, so a file another kind also owns — a
 * `.claude/commands/CLAUDE.md` is an instruction file by its name — arrives as
 * the command variant here and as the instructions variant on that route
 * (session.ts § fileDetail).
 */
const openDetail = computed(() => {
  const detail = entryDetail.value;
  return detail !== null && detail.file.sourceRelativePath === openPath.value ? detail : null;
});

/**
 * The file's own presentation — the one scan-time parse, published on the
 * command variant of the detail (PromptFileDetailDto). Null when extraction
 * failed all-or-nothing, which is when there is nothing parsed to show and the
 * failure's diagnostic says so (FR-028), and null for the plain file, which
 * has nothing read out of it.
 */
const presentation = computed(() => {
  const detail = openDetail.value;
  return detail !== null && detail.kind === 'prompt/command' ? detail.presentation : null;
});

/**
 * The metadata as the YAML document the detail renders (FR-007,
 * frontmatter-yaml.ts): every declared key the file wrote, led by
 * {@link LEADING_PROMPT_METADATA_KEYS} and otherwise in the file's own order.
 * YAML for every vendor's file — the agent detail's choice, for the same
 * reason: one surface, one spelling of a declaration set, whatever syntax the
 * file carried it in.
 */
const metadataText = computed(() => {
  const rank = (entry: DeclaredEntryDto): number => {
    // Only a string key can be one of the leading keys: a numeric key spelling
    // `name` is a different key (api-types.ts § DeclaredKeyKind).
    const index = entry.keyKind === 'string' ? LEADING_PROMPT_METADATA_KEYS.indexOf(entry.key) : -1;
    return index === -1 ? LEADING_PROMPT_METADATA_KEYS.length : index;
  };
  // `toSorted` is stable, so the keys past the leaders keep authored order.
  return frontmatterYamlText(
    (presentation.value?.metadata ?? []).toSorted((left, right) => rank(left) - rank(right)),
  );
});

/**
 * Whether the file left no prompt at all. Only an empty string counts: a
 * prompt of whitespace is what the file wrote, and calling it none would
 * report a shortened value as the whole (FR-025).
 */
const promptIsEmpty = computed(() => (presentation.value?.promptText ?? '') === '');

/**
 * The diagnostics of the open file. The detail response states each record
 * once — a failed extraction is one (file, kind) record (FR-028) — so the
 * list renders as published.
 */
const openDiagnostics = computed(() => openDetail.value?.diagnostics ?? []);

/**
 * The two halves of this kind's detail, as the tab strip presents them: what the
 * parse read out of the file, and the complete file itself. The same split the
 * instruction detail uses, for the same reason: two subjects, and stacked they
 * would show one text twice for a file with no frontmatter block.
 */
const PROMPT_DETAIL_TABS = ['prompt', 'file'] as const;

/** Which half is in view; see {@link PROMPT_DETAIL_TABS}. */
type PromptDetailTab = (typeof PROMPT_DETAIL_TABS)[number];

/** The label each tab shows. */
const PROMPT_DETAIL_TAB_TEXT: Readonly<Record<PromptDetailTab, string>> = {
  /** Label for the panel holding the file's declarations and prompt. */
  prompt: 'Prompt',
  /** Label for the panel holding the complete authored file. */
  file: 'File',
};

// Where focus sits: the frame bounds this page and holds its heading focus
// (`DetailPage.vue`), and the guards below ask that focus to rescue itself.
const page = useTemplateRef<DetailPageControls>('page');

const pageOwnership = usePageOwnership();

// The effect that keeps the open subject the one the URL names
// (`detail-request.ts`). This kind's subject is its path alone, so nothing is
// selected inside it.
const request = useDetailRequest({
  openPath,
  openSource,
  selection: null,
  ready: () => owner.value.length > 0,
  perform: () => {
    void pageOwnership.openFileDetail(
      openPath.value,
      openPath.value,
      openSource.value,
      'prompt/command',
    );
  },
  focusHeading: () => page.value?.focusHeading(),
});
const { detailState } = request;

/** The strip and the panels it controls (`subject-tabs.ts` § SubjectTabs). */
const subjectTabs = useSubjectTabs({
  tabs: PROMPT_DETAIL_TABS,
  initialTab: 'prompt',
  idPrefix: 'prompt',
});

/**
 * Opening a file starts on what it declares and prompts — unless its
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
  subjectTabs.activeTab = presentation.value !== null ? 'prompt' : 'file';
});

/**
 * What a screen reader announces the heading as. The accessible-name
 * computation collapses whitespace, so two paths differing only in consecutive
 * or edge spaces would announce as one heading; the inline label spells such a
 * run out instead, while the visible heading keeps the authored spelling
 * (FR-025).
 */
const headingAccessibleText = computed(() =>
  openPath.value === '' ? kindText : inlinePresentationLabel(openPath.value),
);

/**
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
 */
const detailFailure = request.failureOf(() =>
  openDetail.value === null && detailState.value === 'idle'
    ? 'This file could not be loaded.'
    : null,
);

/**
 * What the document title says this page is showing (WCAG 2.4.2): the path
 * the heading shows while a file is open, and the state the page is in
 * otherwise, so a reader returning to a tab is never told it shows a file the
 * link no longer resolves. The raw path, not the escaped spelling: the shell
 * escapes its subject exactly once at the rendering boundary. Null when the
 * escaped spelling would draw nothing — the shell then titles the tab by this
 * route's surface name, because the spelled-out presentation the heading falls
 * back to contains backslashes the shell's escaping would double.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return 'Loading a prompt or command file';
  }
  if (detailState.value === 'stale' || owner.value.length === 0) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Prompt or command file could not be loaded';
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
    class="aci-prompt-detail"
    :kind-text="kindText"
    :list-route="inventoryRoute"
    :neighbours="listNeighbours"
    :source-family-crumb-text="sourceFamilyCrumbText"
    :path-text="pathText"
    :path-is-spelled-out="pathIsSpelledOut"
    :accessible-text="headingAccessibleText"
    :open-path="openPath"
    :open-source="openSource"
    :selection="null"
    :subject-resolved="owner.length > 0"
    missing-text="Nothing in the current scan sits at this link's path."
    :failure-text="detailFailure"
    loading-text="Loading this file…"
    :subject="openDetail"
    @retry="request.retryOpen()"
  >
    <template #subject-comparison>
      <!-- The comparison this file's row can make, at the end of the heading's
             own line — where every kind whose subject is the heading puts its own
             (`mcp/detail`, `hooks/detail`, `plugins/detail`). On the tabs' row it
             read as a control on what the tabs select, which is one half of the
             file rather than the file this comparison is of (FR-011). -->
      <NuxtLink
        v-if="comparePairRoute !== null"
        :to="comparePairRoute"
        class="aci-button aci-button--primary aci-detail-title-end"
        >Compare this file <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
      /></NuxtLink>
    </template>

    <!-- eslint-disable-next-line vue/no-template-shadow -- same value, same name, never null -->
    <template #default="{ subject: openDetail }">
      <!-- What this customization is, on one line: how the file read, which
           products recognize it and where they document reading it, and the
           command that opens it. Restated from the row so the page and the list
           agree (FR-007); no product is quoted for what it would invoke or run,
           because existence is what an admission proves (FR-009). -->
      <DetailAttributes :file="openDetail.file" :recognitions="recognitions" :source="openSource" />

      <SourceRootNote :text="sourceRootText" />

      <!-- The name the inventory row this page was opened from is listed
           under: the answer of the rule that admitted the file, derived from
           the path for a command file and declared by a prompt file, and
           never a claim that typing it would reach this file — a same-name
           skill outranks a command (FR-009). -->
      <p class="aci-prompt-detail__invocation-name aci-note">
        Invocation name:
        <template v-for="(entry, index) in invocationNames" :key="entry.text"
          ><span v-if="index > 0">, </span
          ><AuthoredNameText :name="entry"
            ><span :class="entry.isAuthored ? 'aci-authored-text' : 'aci-muted'">{{
              entry.text
            }}</span></AuthoredNameText
          ></template
        >
      </p>

      <!-- The comparison entry for this file (FR-011): present exactly
           when the current scan holds another readable file that resolves
           one of this file's names. The comparison surface's own pickers
           take over from there. -->

      <!-- The other files carrying the same name, one line whatever the count
           (`FileStrip.vue`). Nothing here states an order or a winner: which
           copy a session loads turns on runtime this tool does not observe
           (FR-009). -->
      <FileStrip
        :open-source-id="openSourceId"
        :entries="otherCopies"
        label="Other files of this command"
      />

      <!-- Two subjects, two tabs: what the parse read out of the file, and
           the complete file itself. A real `tablist`, with the roving
           tabindex and arrow keys the WAI-ARIA tabs pattern specifies
           (QR-004, contracts/accessibility-acceptance.md). -->
      <SubjectTabStrip :tabs="subjectTabs" label="Prompt and command detail">
        <template #tab="{ tab }">{{ PROMPT_DETAIL_TAB_TEXT[tab] }}</template>
      </SubjectTabStrip>

      <!-- Both panels stay in the document and the unselected one is hidden,
           so the source box keeps its text and the reader's scroll position across a
           tab switch, and both `aria-controls` IDREFs resolve. -->
      <SubjectTabPanel :tabs="subjectTabs" tab="prompt">
        <!-- A failed extraction leaves this panel with nothing parsed to
             show; its Diagnostic is what says so, and the complete source is
             one tab away (FR-028). -->
        <DetailDiagnostics v-if="presentation === null" :diagnostics="openDiagnostics" />

        <div v-if="presentation" class="aci-prompt-detail__declarations">
          <p v-if="presentation.metadata.length === 0" class="aci-note">This file declares none.</p>
          <!-- The declared keys as one read-only YAML document in the file's
               own order (FR-007), through the same viewer the prompt uses —
               sized to the block, because a metadata set is short
               (SourceViewer § fitContent). "Metadata" rather than
               "Frontmatter", because the keys arrive as a frontmatter fence
               only for the products whose command file is Markdown, and the
               wire shape does not assume that: it is `PromptPresentationDto`
               rather than the Markdown one, so a format declaring its keys
               beside its prompt reaches this page unchanged (api-types.ts). The agent detail solved the same
               problem the same way — its agents are declared as Markdown
               frontmatter and as YAML — so the two pages share the word;
               "Declaration" is not it, being what this product calls a
               carrier's named declaration rendered as JSON (MCP, hooks,
               plugins). YAML for both, the way an agent's metadata is:
               nothing here is markup, a link, or a resolved reference
               (FR-025, FR-026, FR-033). -->
          <SourceViewer
            v-else
            panel-label="Metadata"
            :source-text="metadataText"
            :source-relative-path="openPath"
            content-label="Metadata of"
            content-language="yaml"
          />
        </div>

        <div v-if="presentation" class="aci-prompt-detail__prompt">
          <p v-if="promptIsEmpty" class="aci-note">This file has none.</p>
          <!-- The same read-only viewer the file tab uses, highlighted as the
               Markdown a prompt is whatever file carried it — the path's own
               claim would colour a TOML command's prompt as TOML, which the
               prompt is not. Highlighting is tokenizing, not rendering: no
               heading becomes large, no link becomes clickable, and no image
               loads (FR-033). A name the prompt mentions stays text: nothing
               is resolved to an agent, a skill, or another command, and a
               `!{...}` shell block is characters (FR-019). -->
          <SourceViewer
            v-else
            panel-label="Prompt"
            :source-text="presentation.promptText"
            :source-relative-path="openPath"
            content-label="Prompt of"
            content-language="markdown"
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
/* The two halves of the parse, inside the tab that holds them. */
.aci-prompt-detail__declarations,
.aci-prompt-detail__prompt {
  padding-block-start: 0.75rem;
}

.aci-prompt-detail__declarations > h3,
.aci-prompt-detail__prompt > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}
</style>
