<script setup lang="ts">
// The MCP detail route (T302), in two views. With `?server=<name>` the page
// is one declaration record's own detail — the kind's row unit — headed by
// the declared server name and showing that declaration's fields by the keys
// the carrier wrote. Without the query it is the carrier's file-unit view:
// the file facts and every declaration the file makes, which is where a
// declarationless carrier's record lands. Both resolve the same wire detail:
// the declaration set is the carrier's own — one parse, one response — and
// the path is the wire identity (FR-030).
//
// Unlike every other detail this page has no file tab and no viewer of the
// file's own bytes: a file admitted so its declarations can be published
// shows those declarations and never its source, and the wire backs that
// structurally — the carrier detail is `get-mcp-carrier-detail`'s own
// result, whose shape carries no `sourceText` field (FR-007). The only
// editors on the page show each declaration serialized as the JSON document
// a reader can paste into their own carrier (declared-entries-json.ts).
//
// The declared values render exactly as authored — credentials included, with
// nothing masked and no control that would uncover a masked value — and no
// environment reference is resolved: the files are the reader's own, over a
// loopback-bound session (FR-026, FR-027). Nothing here connects to, starts,
// or probes a declared server, and nothing projects trust, precedence, or a
// selected winner: what the vendor documents stays in its maintained contract
// (FR-009).
import { computed, useTemplateRef, watch } from 'vue';
import LiveRegion from '../../../../components/LiveRegion.vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import LeavesIcon from '~icons/lucide/arrow-right';
import AuthoredNameText from '../../../../components/AuthoredNameText.vue';
import DetailAttributes from '../../../../components/inspection/DetailAttributes.vue';
import DetailDiagnostics from '../../../../components/inspection/DetailDiagnostics.vue';
import RecognitionMarks from '../../../../components/inventory/RecognitionMarks.vue';
import SubjectUnavailable from '../../../../components/inspection/SubjectUnavailable.vue';
import DetailHeader from '../../../../components/inspection/DetailHeader.vue';
import DetailFailureNotice from '../../../../components/inspection/DetailFailureNotice.vue';
import SourceRootNote from '../../../../components/inspection/SourceRootNote.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import { declaredEntriesJsonText } from '../../../../components/declared-entries-json';
import {
  sideFamilyOf,
  asSourceSelector,
  detailNeighbours,
  detailRoute,
  type ComparisonSide,
  fromJsonStringBody,
  detailRoutePathOf,
} from '../../../../components/detail-route';
import { mcpServerDetailRoute } from '../../../../components/mcp-detail-route';
import FileStrip from '../../../../components/inspection/FileStrip.vue';
import { otherCopiesOf, type FileStripEntry } from '../../../../components/inspection/file-strip';
import type { SourceKind } from '../../../../../shared/api-types';
import { useDetailAddress, usePathPresentation } from '../../../../composables/detail-address';
import { useDetailHeadingFocus } from '../../../../composables/detail-heading-focus';
import { useDetailRequest } from '../../../../composables/detail-request';
import { usePageOwnership, useReportedPageSubject } from '../../../../composables/page-ownership';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { useSessionSources } from '../../../../composables/session-sources';
import type { VendorSurface } from '../../../../../shared/registries/behavior-types';
import { useSessionViewState } from '../../../../composables/session-view-state';
import { mcpComparisonRouteFor } from '../../../../composables/mcp-comparison';
import {
  type SupportedTool,
  SUPPORTED_TOOL_ORDER,
  CUSTOMIZATION_KIND_TEXT,
  accessiblePresentationLabel,
  fileIdentityKey,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../../shared/entities';
import { SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';
import { AuthoredName } from '../../../../components/authored-name';

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
 * The declared server name the URL selects, or null for the carrier view.
 * `?server=<name>` addresses one declaration record — the inventory's row
 * unit — the same way the inventory's own kind selection lives in the query;
 * an array value (a repeated parameter) selects nothing rather than guessing
 * which repetition was meant.
 */
const openServerName = computed((): string | null => {
  const parameter = route.query['server'];
  // The query spelling is `toJsonStringBody`'s: decoding it here is
  // what lets a name the URL cannot carry raw — a lone surrogate strict JSON
  // resolves from an authored escape — select its own declaration.
  return typeof parameter === 'string' ? fromJsonStringBody(parameter) : null;
});

const carrierDetail = sessionViewState.carrierDetail;
const snapshot = sessionViewState.snapshot;

/**
 * The MCP inventory entry the URL's path names, or null when the committed
 * inventory holds none there. Resolved from the snapshot rather than from a
 * fetched detail because the entry has to be known before anything is
 * requested: it carries the recognizing product this page states, and a path
 * the inventory does not list is the same dead link the host would answer,
 * reportable without a doomed request.
 */
const owner = computed(() => {
  const entries = snapshot.value?.mcp ?? [];
  if (openServerName.value !== null) {
    // The declaration view resolves through its name's own row: the selected
    // name must be a published row, and the URL's carrier one of the
    // declarations resolving it. A failed carrier publishes no named
    // declaration, so a link into one reports the dead-link state below
    // rather than a page about rows the scan could not read.
    return (
      entries
        .find((entry) => entry.name === openServerName.value)
        ?.declarations.find(
          (declaration) =>
            declaration.sourceRelativePath === openPath.value &&
            declaration.sourceId === openSourceId.value,
        ) ?? null
    );
  }
  // The carrier view resolves through any row listing the path — a named row
  // or the no-name row a declarationless carrier sits on.
  for (const entry of entries) {
    const declaration = entry.declarations.find(
      (candidate) =>
        candidate.sourceRelativePath === openPath.value &&
        candidate.sourceId === openSourceId.value,
    );
    if (declaration !== undefined) {
      return declaration;
    }
  }
  return null;
});

/**
 * Whether any committed MCP row lists a declaration at the URL's path — what
 * separates the two dead links below: a name the carrier no longer publishes,
 * against a path the inventory does not hold at all.
 */
const carrierListed = computed(() =>
  (snapshot.value?.mcp ?? []).some((entry) =>
    entry.declarations.some(
      (declaration) =>
        declaration.sourceRelativePath === openPath.value &&
        declaration.sourceId === openSourceId.value,
    ),
  ),
);

/**
 * The family the open file's Source is of: the family a comparison entry
 * built on this page stays inside, because a pair never spans two families
 * (contracts/http-api.md § Host requirements #5).
 */
const openFamily = computed<SourceKind>(() =>
  sideFamilyOf({ source: openSource.value, sourceRelativePath: openPath.value }),
);

/**
 * The other carriers declaring the name this page is showing, so the next
 * declaration of it is one move rather than a return to the list (FR-007).
 * Empty on a carrier view, which has no name to gather by, and on a name one
 * carrier declares — the strip renders nothing either way
 * (`FileStrip.vue`).
 *
 * One entry per file, with each product that declares the name there beside
 * it: a carrier two products read is one file, exactly as the copies of a
 * skill name are ({@link otherCopiesOf} removes the one on screen).
 */
const otherCarriers = computed<readonly FileStripEntry[]>(() => {
  const name = openServerName.value;
  if (name === null) {
    return [];
  }
  const row = (snapshot.value?.mcp ?? []).find((entry) => entry.name === name);
  const byFile = new Map<string, FileStripEntry>();
  for (const declaration of row?.declarations ?? []) {
    const key = fileIdentityKey(declaration.sourceId, declaration.sourceRelativePath);
    const existing = byFile.get(key);
    byFile.set(
      key,
      existing === undefined
        ? {
            key,
            sourceId: declaration.sourceId,
            pathText: pathPresentationLabel(declaration.sourceRelativePath),
            opens: {
              accessibleText: sessionSources.qualifiedLinkName(
                accessiblePresentationLabel(declaration.sourceRelativePath),
                declaration.sourceId,
              ),
              route: mcpServerDetailRoute(
                declaration.sourceRelativePath,
                name,
                sessionSources.selectorOf(declaration.sourceId),
              ),
            },
            recognitions: [{ tool: declaration.tool, surfaces: declaration.surfaces }],
            carrierText: null,
          }
        : {
            ...existing,
            recognitions: [
              ...existing.recognitions,
              { tool: declaration.tool, surfaces: declaration.surfaces },
            ],
          },
    );
  }
  return otherCopiesOf(
    [...byFile.values()],
    fileIdentityKey(openSourceId.value ?? '', openPath.value),
  );
});

/**
 * The comparison entry for one of this carrier's declared names (FR-011):
 * that name's declaration here beside the same name's declaration in the
 * first other carrier of its row — the comparison never leaves the name's
 * row, exactly as a skill's entry link stays inside its name's row
 * (data-model.md § Inventory unit), and every carrier of a named row is
 * comparison-eligible (FR-025) because its declarations are parsed
 * (api-types.ts § McpDeclarationDto.parseStatus). Null when the name's row
 * holds no second carrier; the comparison surface's own pickers take over
 * from there.
 */
function compareRouteForName(name: string): ReturnType<typeof mcpComparisonRouteFor> | null {
  const row = (snapshot.value?.mcp ?? []).find((entry) => entry.name === name);
  // The counterpart is any carrier of the row that is not this page's own and
  // that is of this page's own family — a pair stays inside one family — by
  // whole identity, so a same-path carrier in another Source of the family is
  // a valid counterpart rather than skipped (FR-030).
  let counterpart: ComparisonSide | null = null;
  for (const declaration of row?.declarations ?? []) {
    if (
      (declaration.sourceId !== openSourceId.value ||
        declaration.sourceRelativePath !== openPath.value) &&
      sessionSources.familyKindOf(declaration.sourceId) === openFamily.value
    ) {
      counterpart = {
        source: sessionSources.selectorOf(declaration.sourceId),
        sourceRelativePath: declaration.sourceRelativePath,
      };
      break;
    }
  }
  return counterpart === null
    ? null
    : mcpComparisonRouteFor(
        openFamily.value,
        name,
        { source: openSource.value, sourceRelativePath: openPath.value },
        counterpart,
      );
}

/**
 * The declaration view's own comparison entry: the open server name's, or
 * null on the carrier view — where each server block carries its own link —
 * and when the name's row holds no counterpart.
 */
const openServerCompareRoute = computed(() =>
  openServerName.value === null ? null : compareRouteForName(openServerName.value),
);

/** Whether the URL resolves in the committed inventory; see {@link owner}. */
const linkResolved = computed(() => owner.value !== null);

/**
 * The carrier's file-unit route, which the declaration view's owner line
 * links to — the same destination the record's carrier line offers.
 */
const carrierRoute = computed(() => detailRoute('MCP', openPath.value, openSource.value));

/**
 * The selected declaration's name as this page needs it, or null for the
 * carrier view, which is about the file rather than one name it declares
 * ({@link AuthoredName}).
 */
const serverName = computed(() =>
  openServerName.value === null ? null : new AuthoredName(openServerName.value),
);

/**
 * The heading's accessible name, through the single-line label rule: an
 * accessible name collapses whitespace, so two invisibly different authored
 * names — `"db"` and `" db"` — would otherwise announce as one heading
 * (FR-025). The visible heading keeps the authored spelling.
 */
const headingAccessibleText = computed(() =>
  openPath.value === ''
    ? CUSTOMIZATION_KIND_TEXT.MCP
    : (serverName.value?.singleLineText ?? inlinePresentationLabel(openPath.value)),
);

/**
 * The products that recognize this carrier and the surfaces they recognize it
 * on, restated from the row so the page and the list agree (FR-007). One
 * declaration per `(carrier, tool)`, so the carrier's declarations here are
 * its recognitions.
 */
const recognitions = computed(() => {
  const byTool = new Map<
    SupportedTool,
    { tool: SupportedTool; surfaces: readonly VendorSurface[] }
  >();
  for (const entry of snapshot.value?.mcp ?? []) {
    for (const declaration of entry.declarations) {
      if (
        declaration.sourceRelativePath === openPath.value &&
        declaration.sourceId === openSourceId.value
      ) {
        byTool.set(declaration.tool, { tool: declaration.tool, surfaces: declaration.surfaces });
      }
    }
  }
  return SUPPORTED_TOOL_ORDER.filter((tool) => byTool.has(tool)).map((tool) => byTool.get(tool)!);
});

/**
 * The rows either side of this one in the list's own order, so the next
 * declaration is one move rather than a return to the inventory (FR-007).
 */
const listNeighbours = computed(() => {
  const entries = snapshot.value?.mcp ?? [];
  const rows = entries.map((entry) => {
    const declaration = entry.declarations[0];
    const path = declaration?.sourceRelativePath ?? '';
    const source = sessionSources.selectorOf(declaration?.sourceId ?? '');
    return {
      // The drawn spelling rather than the label rule, which returns nothing at
      // all for a name with no characters and would leave the move named by its
      // arrow alone, and the announced spelling starts with the drawn one
      // ({@link AuthoredName}; FR-025, WCAG 2.5.3).
      label:
        entry.name === null ? 'No known server declarations' : new AuthoredName(entry.name).text,
      accessibleLabel:
        entry.name === null
          ? 'No known server declarations'
          : new AuthoredName(entry.name).accessibleText,
      // A row is one server name, so the move addresses that name's declaration
      // the way the row's own link does (`rows/McpRow.vue`): the carrier route
      // alone would open the whole carrier, which is a different page from the
      // one the move's label names. The no-name row is the exception, being the
      // carrier itself.
      route:
        entry.name === null
          ? detailRoute('MCP', path, source)
          : mcpServerDetailRoute(path, entry.name, source),
    };
  });
  // The open row is this carrier *and* this name: a carrier declaring several
  // servers appears on several rows, so matching the carrier alone lands on
  // whichever of them comes first and offers that row's neighbours instead of
  // this one's.
  // The carrier's own view is on no row of this list: the rows are declared
  // server names and the carrier is the file they were read from, so it has no
  // position to step from (FR-007 — a declaration view and a carrier view are
  // different subjects). Matching on the name alone gave it the row that
  // publishes none, and folding `null` and an authored `''` together gave it
  // the empty-named row's neighbours.
  if (openServerName.value === null) {
    return detailNeighbours(rows, -1);
  }
  return detailNeighbours(
    rows,
    entries.findIndex(
      (entry) =>
        entry.name === openServerName.value &&
        entry.declarations.some(
          (declaration) =>
            declaration.sourceRelativePath === openPath.value &&
            declaration.sourceId === openSourceId.value,
        ),
    ),
  );
});

/**
 * The open carrier detail once it is this path's: the carrier slot is typed
 * as this route's own result — the shape with no `sourceText` field (FR-007)
 * — so no kind narrowing exists here, and the path check keeps a slow
 * previous detail from rendering under this route's heading.
 */
const openDetail = computed(() => {
  const detail = carrierDetail.value;
  return detail !== null &&
    detail.file.sourceRelativePath === openPath.value &&
    detail.file.sourceId === openSourceId.value
    ? detail
    : null;
});

/**
 * The declarations with the rendering each one's block needs: the server name
 * heads its section — through the shared label rule, so a name of invisible
 * code points still identifies it — and the fields render through the same
 * recursive block every declaration surface uses.
 */
const serverBlocks = computed(() =>
  (openDetail.value?.servers ?? [])
    .filter((server) => openServerName.value === null || server.name === openServerName.value)
    .map((server) => ({
      key: server.name,
      // The declared name as the block's heading and its links need it, which
      // is the same unit the page's own heading reads ({@link AuthoredName}).
      name: new AuthoredName(server.name),
      // Which products read this declaration, from the committed inventory —
      // the carrier detail serves the union of the readings, and since the
      // CLI's bare schema exists the readings of one shared file can differ,
      // so each block states its own readers the way the inventory row does
      // (FR-009 names no winner; this names the documented readers). Drawn by
      // the one component every recognition on every surface is drawn by: a
      // parenthetical `GitHub Copilot (CLI)` is the comparison table's cell
      // spelling, and outside that table a reader met one statement in two
      // shapes on one page ({@link RecognitionMarks}).
      recognitions: (snapshot.value?.mcp ?? [])
        .filter((entry) => entry.name === server.name)
        .flatMap((entry) => entry.declarations)
        .filter(
          (declaration) =>
            declaration.sourceRelativePath === openPath.value &&
            declaration.sourceId === openSourceId.value,
        )
        .map((declaration) => ({ tool: declaration.tool, surfaces: declaration.surfaces })),
      // The declaration as the pretty-printed JSON a reader can paste into
      // their own carrier (declared-entries-json.ts): the keys the file
      // wrote, in the file's own order, every value as resolved (FR-007). A
      // fieldless declaration is the empty object `{}`, an authored fact
      // shown rather than a blank panel.
      jsonText: declaredEntriesJsonText(server.fields),
      // The carrier view's per-server comparison entry (FR-011): each name
      // compares within its own row, so the link is the block's rather than
      // the page's. The declaration view leaves it null — its one link is
      // the overview's ({@link openServerCompareRoute}).
      compareRoute: openServerName.value === null ? compareRouteForName(server.name) : null,
    })),
);

/** Whether extraction failed: the rows are unknown rather than absent (FR-028). */
const declarationsFailed = computed(
  () => openDetail.value !== null && openDetail.value.servers === null,
);

/**
 * The diagnostics of the open carrier. The detail response states each record
 * once — a failed extraction is one (file, kind) record (FR-028) — so the
 * list renders as published.
 */
const openDiagnostics = computed(() => openDetail.value?.diagnostics ?? []);

// Where focus sits: the entry focus, the re-focus when the address names a
// different carrier or declaration, and the question the guards below ask
// before moving it (`detail-heading-focus.ts`).
const pageRoot = useTemplateRef<HTMLElement>('pageRoot');
const header = useTemplateRef<InstanceType<typeof DetailHeader>>('header');
const headingFocus = useDetailHeadingFocus({
  pageRoot,
  heading: () => header.value,
  openPath,
  openSource,
  selection: () => openServerName.value,
});

const pageOwnership = usePageOwnership();

// The effect that keeps the open carrier the one the URL names
// (`detail-request.ts`), requested through the carrier's own function. The
// inventory has to hold the carrier first: a path it does not list is the dead
// link the host would answer anyway.
const request = useDetailRequest({
  openPath,
  openSource,
  selection: () => openServerName.value,
  ready: () => linkResolved.value,
  perform: () => {
    void pageOwnership.openCarrierDetail(openPath.value, openSource.value);
  },
  headingFocus,
});
const { detailState } = request;

/**
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
 */
const detailFailure = request.failureOf(() =>
  openDetail.value === null && detailState.value === 'idle'
    ? openServerName.value === null
      ? 'This MCP carrier could not be loaded.'
      : 'This MCP server declaration could not be loaded.'
    : null,
);

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus (WCAG 4.1.3). Each phrase matches the
 * visible copy; ready content is read as focus moves through it.
 */
const detailAnnouncement = request.announcementOf({
  resolved: () => linkResolved.value,
  missingText: 'Nothing in the current scan matches this link.',
  failure: detailFailure,
  loadingText: () =>
    openServerName.value === null
      ? 'Loading this MCP carrier…'
      : 'Loading this MCP server declaration…',
});

/**
 * What the document title says this page is showing (WCAG 2.4.2); the same
 * subject rules the other detail routes follow.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return openServerName.value === null ? 'Loading an MCP carrier' : 'Loading an MCP server';
  }
  if (detailState.value === 'stale' || !linkResolved.value) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return openServerName.value === null
      ? 'MCP carrier could not be loaded'
      : 'MCP server declaration could not be loaded';
  }
  const name = serverName.value;
  if (name !== null) {
    // The carrier's path rides in the title too: two carriers of one Source
    // can declare one server name, and their tabs must not read identically
    // (WCAG 2.4.2). A name this product spelled out does not title the tab:
    // those are its characters, not the file's.
    // An undeclared name is named in words, because a tab can carry no badge
    // and a reader who met the badge must not meet an untitled tab instead.
    const subject = name.isEmpty ? name.singleLineText : name.isAuthored ? name.authored : null;
    return subject === null
      ? null
      : `${subject} — ${openPath.value} — ${SOURCE_SELECTOR_TEXT[openSource.value]}`;
  }
  return pathIsSpelledOut.value
    ? null
    : `${openPath.value} — ${SOURCE_SELECTOR_TEXT[openSource.value]}`;
});
useReportedPageSubject(titleSubject);

// A generation replacement drops a detail that was on screen without moving
// the URL; if keyboard focus was inside that subtree it would fall to the
// document body (WCAG 2.4.3) — the same guards the other detail routes use.
watch(
  openDetail,
  (detail, previous) => {
    if (
      detail === null &&
      previous !== null &&
      previous.file.sourceRelativePath === openPath.value &&
      previous.file.sourceId === openSourceId.value
    ) {
      headingFocus.requestFocusHeading();
    }
  },
  { flush: 'sync' },
);

watch(
  [detailState, linkResolved],
  ([state, resolved]) => {
    if (state === 'stale' || !resolved) {
      headingFocus.requestFocusHeading();
    }
  },
  { flush: 'sync' },
);
</script>

<template>
  <div ref="pageRoot" class="aci-mcp-detail aci-route">
    <DetailHeader
      ref="header"
      :kind-text="CUSTOMIZATION_KIND_TEXT.MCP"
      list-route="/?kind=MCP"
      :neighbours="listNeighbours"
      :source-family-crumb-text="sourceFamilyCrumbText"
      :path-text="pathText"
      :path-is-spelled-out="pathIsSpelledOut"
      :accessible-text="headingAccessibleText"
    >
      <!-- The page's own subject, which is the declared name on a declaration
           view and the carrier's path on the carrier's own. The trail ended at
           the carrier either way, so a declaration page's last step named a
           file while its heading named a server — the only kind whose trail
           and heading disagreed. Which carrier it was declared in is the
           `Declared in` line's, said once. -->
      <template v-if="serverName !== null" #trail-subject>
        <AuthoredNameText :name="serverName">
          <span
            class="aci-detail-crumbs__subject"
            :class="{ 'aci-authored-text': serverName.isAuthored }"
            >{{ serverName.text }}</span
          >
        </AuthoredNameText>
      </template>

      <!-- The declared server name names a declaration view, where the
       carrier's own path names the file-unit one. -->
      <template v-if="serverName !== null" #heading-name>
        <AuthoredNameText :name="serverName">
          <span :class="{ 'aci-authored-text': serverName.isAuthored }">{{ serverName.text }}</span>
        </AuthoredNameText>
      </template>
      <template #title-end>
        <!-- The declaration view's comparison entry (FR-011): present exactly
             when this name's row holds another readable carrier to stand
             opposite this one. At the end of the heading's own line, because it
             acts on the subject that heading names rather than on one of the
             sections below it. The comparison surface's own pickers take over
             from there. -->
        <NuxtLink
          v-if="openServerCompareRoute !== null"
          class="aci-button aci-button--primary aci-detail-title-row__end"
          :to="openServerCompareRoute"
          >Compare this server's declarations
          <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
        /></NuxtLink>
        <!-- Why there is no comparison, rather than nothing at all: a missing
             control reads the same as a forgotten one, and the reason is a fact
             about the subject — this name resolves one carrier here, so there is
             no pair to make (FR-011). The skill detail says the same of a name
             with one copy. -->
        <!-- Said only where there is a subject to say it of: on a link the scan
             holds nothing at, and before the carrier has loaded, "one carrier
             here" would be a claim about a name that resolves nothing. -->
        <span
          v-else-if="openServerName !== null && openDetail !== null"
          class="aci-detail-title-row__end aci-muted"
          >This name has one carrier here, so there is nothing to compare</span
        >
      </template>
    </DetailHeader>

    <LiveRegion :text="detailAnnouncement" />

    <template v-if="detailState === 'loading'">
      <p v-if="openServerName === null" class="aci-empty">Loading this MCP carrier…</p>
      <p v-else class="aci-empty">Loading this MCP server declaration…</p>
    </template>

    <template v-else-if="detailState === 'stale' || !linkResolved">
      <!-- Two dead links, two sentences: a path the scan does not hold, and a
           held carrier that currently publishes no declaration by this name —
           which covers a carrier whose declarations could not be read, whose
           rows are unknown rather than absent (FR-028). -->
      <SubjectUnavailable outcome="warning">
        <template v-if="carrierListed && openServerName !== null">
          No declaration named this way is published for this file in the current scan. The carrier
          may have changed since the link was made — its declarations may even be unreadable right
          now — and a rescan that brings the name back will make it resolve again.
        </template>
        <template v-else>
          Nothing in the current scan sits at this link's path. The inventory may have changed since
          the link was made; a rescan that brings the path back will make it resolve again.
        </template>
        <template #exit>
          <NuxtLink to="/?kind=MCP">Return to the inventory and open it again.</NuxtLink>
        </template>
      </SubjectUnavailable>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request. -->
    <template v-else-if="openDetail === null">
      <DetailFailureNotice :message="detailFailure" @retry="request.retryOpen()" />
    </template>

    <template v-else>
      <div class="aci-mcp-detail__overview">
        <!-- Which products recognize the carrier and where they document
             reading it, restated from the inventory entry so the page and the
             list agree (FR-007). No product is quoted for what it would
             connect to, because an admission is not an activation
             (FR-009). -->
        <DetailAttributes
          :file="openDetail.file"
          :recognitions="recognitions"
          :source="openSource"
          states-byte-order-mark
        >
          <!-- The carrier this page read, leading its own facts: the command at
               the end of this line opens it, and with the path on the line
               below the control pointed at something the line did not name. On
               a declaration view it is a link to the carrier's own page; on
               that page it is the subject itself, which the heading above
               already names. -->
          <template v-if="openServerName !== null"
            >Declared in
            <NuxtLink :to="carrierRoute" class="aci-path aci-authored-text">{{
              pathText
            }}</NuxtLink></template
          >
        </DetailAttributes>

        <SourceRootNote :text="sourceRootText" />
      </div>

      <!-- The other carriers declaring this name, one line whatever the count
           (`FileStrip.vue`). The kinds whose row is a name all offer it — a
           skill's copies, an agent's files — and a declaration's carriers are
           the same move: the next place this name is declared, without
           returning to the list. Nothing here states an order or a winner:
           which declaration a session uses turns on runtime this tool does not
           observe (FR-009). -->
      <FileStrip
        :open-source-id="openSourceId"
        :entries="otherCarriers"
        label="Other carriers declaring this name"
      />

      <DetailDiagnostics :diagnostics="openDiagnostics" />

      <!-- An unreadable declaration block leaves the rows unknown rather than
           absent (FR-028): the diagnostic above says what happened, and no
           source panel stands in for the declarations. -->
      <p v-if="declarationsFailed" class="aci-muted">
        The declarations in this file could not be read.
      </p>
      <p v-else-if="serverBlocks.length === 0" class="aci-muted">
        This file declares no MCP servers.
      </p>

      <!-- The declarations: every one for the file-unit view, the selected
           one alone for a declaration view. Each section shows its fields as
           one JSON document in the parser's resolved order — commands, URLs,
           headers, environment values, exactly as authored, resolved against
           nothing (FR-026).
           The declaration view's name already heads the page, so its one
           section repeats no heading. -->
      <section v-for="server in serverBlocks" :key="server.key" class="aci-mcp-detail__server">
        <h3 v-if="openServerName === null" :aria-label="server.name.singleLineText">
          <AuthoredNameText :name="server.name">
            <span :class="server.name.isAuthored ? 'aci-authored-text' : 'aci-muted'">{{
              server.name.text
            }}</span>
          </AuthoredNameText>
        </h3>
        <!-- The products whose documented reading includes this declaration:
             the readings of one shared carrier can differ by schema, so the
             carrier view states each server's own readers rather than letting
             the page caption answer for every block (T353). -->
        <p v-if="openServerName === null">
          <RecognitionMarks :recognitions="server.recognitions" named />
        </p>
        <!-- The carrier view's per-server comparison entry: the accessible
             name carries the server's name after the visible phrase, because
             a carrier view lists one such link per declared name and they
             would otherwise announce identically (WCAG 2.4.6; label-in-name
             keeps the visible phrase as the prefix). -->
        <p v-if="server.compareRoute !== null">
          <NuxtLink
            class="aci-button aci-button--primary"
            :to="server.compareRoute"
            :aria-label="`Compare this server's declarations: ${server.name.singleLineText}`"
            >Compare this server's declarations
            <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
          /></NuxtLink>
        </p>
        <!-- The declaration's fields as one read-only JSON document in the
             Monaco viewer — coloured by the `json` tokenizer a `.json`
             file's model gets (monaco-languages.ts, tokens-only) — in the
             spelling a reader pastes into their own carrier. JSON's own escaping is what keeps every
             character visible and transportable: a control character or
             lone surrogate is its escape, a newline is `\n` (FR-025,
             FR-026). The accessible name says which declaration of the
             carrier is showing, because a carrier view mounts one viewer
             per declared server (WCAG 2.4.6). -->
        <!-- What the viewer holds, said before it. The carrier may be TOML or a
             settings document, and its declaration is shown as JSON this
             surface serializes rather than as the bytes the file wrote — so a
             reader who opened a `.toml` and met JSON is told why. The keys are
             the file's own, in the order it wrote them, because that is what
             this surface publishes (FR-007; {@link declaredEntriesJsonText}).
             Only the comparison sorts, and only to align its two sides. -->
        <p class="aci-note">
          This is this server's declaration serialized as JSON, with the keys the file wrote in the
          order it wrote them; the file's own syntax is not shown.
        </p>
        <SourceViewer
          panel-label="Declaration"
          :source-text="server.jsonText"
          :source-relative-path="openPath"
          :content-label="`Declaration ${server.name.singleLineText} of`"
          content-language="json"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.aci-mcp-detail__overview {
  border-bottom: 1px solid var(--aci-line);
  padding-bottom: 0.5rem;
}

/* One block per declaration, separated by spacing alone: the declaration
   document draws its own frame (SourceViewer), and a panel border around it
   would draw a second one. */
.aci-mcp-detail__server {
  margin-block-start: 1.25rem;
}

.aci-mcp-detail__server > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}
</style>
