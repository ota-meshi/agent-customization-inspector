<script setup lang="ts">
// The hook detail route (T855), in two views. With `?event=<name>` the page is
// one declaration record's own detail — the kind's row unit — headed by the
// declared lifecycle event and showing the matcher groups the carrier wrote
// under it. Without the query it is the carrier's file-unit view: the file
// facts and every event the file declares, which is where a carrier with no
// declaration lands. Both resolve the same wire detail: the declaration set is
// the carrier's own — one parse, one response — and the path is the wire
// identity (FR-030).
//
// Unlike a file detail this page has no viewer of the file's own bytes: a file
// admitted so its declarations can be published shows those declarations and
// never its source, and the wire backs that structurally — the carrier detail
// is `get-hook-carrier-detail`'s own result, whose shape carries no
// `sourceText` field (FR-007). The only editors on the page show each
// declaration serialized as the JSON document a reader can paste into their
// own hook map (declared-entries-json.ts).
//
// The declared values render exactly as authored — commands, matchers,
// credentials included, with nothing masked and no control that would uncover
// a masked value — and no environment reference is resolved: the files are the
// reader's own, over a loopback-bound session (FR-026, FR-027). Nothing here
// runs, spawns, or resolves a declared command or handler (FR-020), no
// referenced script is read, and nothing projects trust, review state, or
// precedence: what the vendor documents stays in its maintained contract
// (FR-009).
import { computed, useTemplateRef, watch } from 'vue';
import LiveRegion from '../../../../components/LiveRegion.vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import LeavesIcon from '~icons/lucide/arrow-right';
import AuthoredNameText from '../../../../components/AuthoredNameText.vue';
import DetailAttributes from '../../../../components/inspection/DetailAttributes.vue';
import DetailDiagnostics from '../../../../components/inspection/DetailDiagnostics.vue';
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
import { hookEventDetailRoute } from '../../../../components/hook-detail-route';
import FileStrip from '../../../../components/inspection/FileStrip.vue';
import { otherCopiesOf, type FileStripEntry } from '../../../../components/inspection/file-strip';
import type { SourceKind } from '../../../../../shared/api-types';
import { hookComparisonRouteFor } from '../../../../composables/hook-comparison';
import { useDetailAddress, usePathPresentation } from '../../../../composables/detail-address';
import { useDetailHeadingFocus } from '../../../../composables/detail-heading-focus';
import { useDetailRequest } from '../../../../composables/detail-request';
import { usePageOwnership, useReportedPageSubject } from '../../../../composables/page-ownership';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { useSessionSources } from '../../../../composables/session-sources';
import type { VendorSurface } from '../../../../../shared/registries/behavior-types';
import { useSessionViewState } from '../../../../composables/session-view-state';
import { HOOK_CARRIER_FORM_TEXT, SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';
import { AuthoredName } from '../../../../components/authored-name';
import {
  type SupportedTool,
  SUPPORTED_TOOL_ORDER,
  CUSTOMIZATION_KIND_TEXT,
  accessiblePresentationLabel,
  fileIdentityKey,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../../shared/entities';

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
 * The declared event the URL selects, or null for the carrier view.
 * `?event=<name>` addresses one declaration record — the inventory's row
 * unit — the same way the MCP route's `?server=` does; an array value (a
 * repeated parameter) selects nothing rather than guessing which repetition
 * was meant.
 */
const openEventName = computed((): string | null => {
  const parameter = route.query['event'];
  // The query spelling is `toJsonStringBody`'s: decoding it here is what lets
  // a name the URL cannot carry raw — a lone surrogate strict JSON resolves
  // from an authored escape — select its own declaration.
  return typeof parameter === 'string' ? fromJsonStringBody(parameter) : null;
});

const hookDetail = sessionViewState.hookDetail;
const snapshot = sessionViewState.snapshot;

/**
 * The carrier's file-unit route, which the declaration view's owner line links
 * to — the same destination the record's carrier line offers.
 */
const carrierRoute = computed(() => detailRoute('hook', openPath.value, openSource.value));

/**
 * The selected event as this page needs it, or null for the carrier view,
 * which is about the file rather than one event it declares
 * ({@link AuthoredName}).
 */
const eventName = computed(() =>
  openEventName.value === null ? null : new AuthoredName(openEventName.value),
);

/**
 * The heading's accessible name, through the single-line label rule: an
 * accessible name collapses whitespace, so two invisibly different authored
 * names would otherwise announce as one heading (FR-025). The visible heading
 * keeps the authored spelling.
 */
const headingAccessibleText = computed(() =>
  openPath.value === ''
    ? CUSTOMIZATION_KIND_TEXT.hook
    : (eventName.value?.singleLineText ?? inlinePresentationLabel(openPath.value)),
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
  for (const entry of snapshot.value?.hooks ?? []) {
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
 * The other carriers declaring the event this page is showing, so the next
 * declaration of it is one move rather than a return to the list (FR-007).
 * Empty on a carrier view, which has no event to gather by, and on an event
 * one carrier declares — the strip renders nothing either way
 * (`FileStrip.vue`).
 *
 * One entry per file, with each product that declares the event there beside
 * it: a carrier two products read is one file, exactly as the copies of a
 * skill name are ({@link otherCopiesOf} removes the one on screen).
 */
const otherCarriers = computed<readonly FileStripEntry[]>(() => {
  const event = openEventName.value;
  if (event === null) {
    return [];
  }
  const row = (snapshot.value?.hooks ?? []).find((entry) => entry.event === event);
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
              route: hookEventDetailRoute(
                declaration.sourceRelativePath,
                event,
                sessionSources.selectorOf(declaration.sourceId),
              ),
            },
            recognitions: [{ tool: declaration.tool, surfaces: declaration.surfaces }],
            // What kind of file it is, which the path does not say: a
            // `.codex/hooks.json` and a `[hooks]` table inside a config file
            // are both carriers of this event, and the row states which
            // ({@link HOOK_CARRIER_FORM_TEXT}). A file is one form or the
            // other, so the first declaration answers for the file — the same
            // reading `HookRow` makes of its own carriers.
            carrierText: HOOK_CARRIER_FORM_TEXT[declaration.carrier],
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
 * The rows either side of this one in the list's own order, so the next
 * declaration is one move rather than a return to the inventory (FR-007).
 */
const listNeighbours = computed(() => {
  const entries = snapshot.value?.hooks ?? [];
  const rows = entries.map((entry) => {
    const declaration = entry.declarations[0];
    const path = declaration?.sourceRelativePath ?? '';
    const source = sessionSources.selectorOf(declaration?.sourceId ?? '');
    return {
      // The drawn spelling rather than the label rule, which returns nothing at
      // all for a name with no characters and would leave the move named by
      // its arrow alone, and the announced spelling starts with the drawn one
      // ({@link AuthoredName}; FR-025, WCAG 2.5.3).
      label:
        entry.event === null ? 'No known hook declarations' : new AuthoredName(entry.event).text,
      accessibleLabel:
        entry.event === null
          ? 'No known hook declarations'
          : new AuthoredName(entry.event).accessibleText,
      // A row is one event, so the move addresses that event's declaration the
      // way the row's own link does (`rows/HookRow.vue`): the carrier route
      // alone would open the whole carrier, which is a different page from the
      // one the move's label names. The no-event row is the exception, being
      // the carrier itself.
      route:
        entry.event === null
          ? detailRoute('hook', path, source)
          : hookEventDetailRoute(path, entry.event, source),
    };
  });
  // The open row is this carrier *and* this event: a carrier declaring several
  // events appears on several rows, so matching the carrier alone lands on
  // whichever of them comes first and offers that row's neighbours instead of
  // this one's.
  // The carrier's own view is on no row of this list: the rows are declared
  // event names and the carrier is the file they were read from, so it has no
  // position to step from (FR-007 — a declaration view and a carrier view are
  // different subjects). Matching on the name alone gave it the row that
  // publishes none, and folding `null` and an authored `''` together gave it
  // the empty-named row's neighbours.
  if (openEventName.value === null) {
    return detailNeighbours(rows, -1);
  }
  return detailNeighbours(
    rows,
    entries.findIndex(
      (entry) =>
        entry.event === openEventName.value &&
        entry.declarations.some(
          (declaration) =>
            declaration.sourceRelativePath === openPath.value &&
            declaration.sourceId === openSourceId.value,
        ),
    ),
  );
});

/**
 * The open carrier detail once it is this path's: the hook slot is typed as
 * this route's own result — the shape with no `sourceText` field (FR-007) — so
 * no kind narrowing exists here, and the path check keeps a slow previous
 * detail from rendering under this route's heading.
 */
const openDetail = computed(() => {
  const detail = hookDetail.value;
  return detail !== null &&
    detail.file.sourceRelativePath === openPath.value &&
    detail.file.sourceId === openSourceId.value
    ? detail
    : null;
});

/**
 * Whether the URL names a declaration the loaded carrier does not publish: an
 * event this file no longer declares, or one whose declarations could not be
 * read at all, where they are unknown rather than absent (FR-028). False for a
 * carrier view, whose subject is the file itself.
 *
 * Answered from the loaded detail rather than from the inventory rows, because
 * the host holds the whole answer: a parsed carrier declaring no event sits on
 * no row and still resolves
 * (contracts/http-api.md § get-hook-carrier-detail), so deriving the link's
 * fate from the rows would report a held carrier as a path this scan does not
 * have.
 */
const declarationMissing = computed(
  () =>
    openEventName.value !== null &&
    openDetail.value !== null &&
    !(openDetail.value.events ?? []).some((event) => event.event === openEventName.value),
);

/**
 * Which documented form the open carrier is, as the caption states it: a file
 * whose whole purpose is hooks, or a table inside a file admitted for other
 * content too. The response's own discriminant, not derived from the path.
 */
const carrierFormText = computed(() =>
  openDetail.value === null ? null : HOOK_CARRIER_FORM_TEXT[openDetail.value.carrier],
);

/**
 * What the carrier declares about itself, as the same JSON document: a
 * standalone hook file's top-level keys beside its hook map — the documented
 * optional `description` among them. Empty for a contained table, whose
 * neighbouring keys belong to the settings recognition of the same file and
 * are shown there.
 */
const carrierFieldsJsonText = computed(() => {
  const detail = openDetail.value;
  return detail === null || detail.carrier !== 'standalone' || detail.carrierFields.length === 0
    ? ''
    : declaredEntriesJsonText(detail.carrierFields);
});

/**
 * The family the open file's Source is of: the family a comparison entry
 * built on this page stays inside, because a pair never spans two families
 * (contracts/http-api.md § Host requirements #5).
 */
const openFamily = computed<SourceKind>(() =>
  sideFamilyOf({ source: openSource.value, sourceRelativePath: openPath.value }),
);

/**
 * The comparison one event's row leads to from this carrier: that event's
 * declarations in this file and in the first other carrier the row lists, or
 * null when the row holds no counterpart — a comparison needs two distinct
 * files (FR-011). The compare route's own pickers step to any further carrier
 * of the row, so this link composes one pair rather than a menu.
 */
function compareRouteForEvent(event: string): ReturnType<typeof hookComparisonRouteFor> | null {
  const row = (snapshot.value?.hooks ?? []).find((entry) => entry.event === event);
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
    : hookComparisonRouteFor(
        openFamily.value,
        event,
        { source: openSource.value, sourceRelativePath: openPath.value },
        counterpart,
      );
}

/**
 * The addressed event's comparison, for the declaration view only: that view's
 * heading names one event, so the comparison of it acts on the subject the
 * heading states rather than on one of the sections below. The carrier view
 * heads itself with the carrier and lists every event, so each event carries
 * its own entry instead ({@link eventBlocks}).
 */
const openEventCompareRoute = computed(() =>
  openEventName.value === null ? null : (eventBlocks.value[0]?.compareRoute ?? null),
);

/**
 * The events with the rendering each one's section needs: the declared event
 * heads its section — through the shared label rule, so a name of invisible
 * code points still identifies it — and its groups render as the JSON document
 * the file wrote under that key.
 */
const eventBlocks = computed(() =>
  (openDetail.value?.events ?? [])
    .filter((event) => openEventName.value === null || event.event === openEventName.value)
    .map((event) => ({
      key: event.event,
      // The declared event as the block's heading and its links need it, which
      // is the same unit the page's own heading reads ({@link AuthoredName}).
      name: new AuthoredName(event.event),
      // The event as the pretty-printed JSON a reader can paste into their own
      // hook map (declared-entries-json.ts): the key the file wrote and the
      // groups under it, in the file's own order, every value as resolved
      // (FR-007). The key is kept in the document because that is what a
      // reader pastes — a bare list of groups would need the event name added
      // back by hand.
      jsonText: declaredEntriesJsonText([
        {
          key: event.event,
          keyKind: 'string',
          value: { kind: 'sequence', items: event.groups },
        },
      ]),
      // The event's own comparison entry, so a carrier view offers one link
      // per declared event and a declaration view offers the one its heading
      // is about (FR-011).
      compareRoute: compareRouteForEvent(event.event),
    })),
);

/** Whether extraction failed: the rows are unknown rather than absent (FR-028). */
const declarationsFailed = computed(
  () => openDetail.value !== null && openDetail.value.events === null,
);

/**
 * The diagnostics of the open carrier. The detail response states each record
 * once — a failed extraction is one (file, kind) record (FR-028) — so the list
 * renders as published.
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
  selection: () => openEventName.value,
});

const pageOwnership = usePageOwnership();

// The effect that keeps the open carrier the one the URL names
// (`detail-request.ts`). Nothing is asked of the inventory first: a carrier
// page requests on the path alone, and a step between two declarations of one
// carrier re-requests the same path, which the view state answers from the
// held detail without a second fetch.
const request = useDetailRequest({
  openPath,
  openSource,
  selection: () => openEventName.value,
  ready: () => true,
  perform: () => {
    void pageOwnership.openHookCarrierDetail(openPath.value, openSource.value);
  },
  headingFocus,
});
const { detailState } = request;

/**
 * What this route says when its own request failed, or null when none has: the
 * failing state's statement, then the failure's own message. One value, read
 * by both the visible paragraph and the live region, so what a reader hears is
 * the sentence that is on the screen.
 */
const detailFailure = request.failureOf(() =>
  openDetail.value === null && detailState.value === 'idle'
    ? openEventName.value === null
      ? 'This hook carrier could not be loaded.'
      : 'This hook declaration could not be loaded.'
    : null,
);

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus (WCAG 4.1.3). Each phrase matches the
 * visible copy; ready content is read as focus moves through it.
 */
const detailAnnouncement = request.announcementOf({
  resolved: () => !declarationMissing.value,
  missingText: 'Nothing in the current scan matches this link.',
  failure: detailFailure,
  loadingText: () =>
    openEventName.value === null ? 'Loading this hook carrier…' : 'Loading this hook declaration…',
});

/**
 * What the document title says this page is showing (WCAG 2.4.2); the same
 * subject rules the other detail routes follow.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return openEventName.value === null ? 'Loading a hook carrier' : 'Loading a hook declaration';
  }
  if (detailState.value === 'stale' || declarationMissing.value) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return openEventName.value === null
      ? 'Hook carrier could not be loaded'
      : 'Hook declaration could not be loaded';
  }
  const event = eventName.value;
  if (event !== null) {
    // The carrier's path rides in the title too: two carriers of one Source
    // can declare one lifecycle event, and their tabs must not read
    // identically (WCAG 2.4.2). A name this product spelled out does not title
    // the tab: those are its characters, not the file's.
    // An undeclared name is named in words, because a tab can carry no badge
    // and a reader who met the badge must not meet an untitled tab instead.
    const subject = event.isEmpty ? event.singleLineText : event.isAuthored ? event.authored : null;
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
  [detailState, declarationMissing],
  ([state, missing]) => {
    if (state === 'stale' || missing) {
      headingFocus.requestFocusHeading();
    }
  },
  { flush: 'sync' },
);
</script>

<template>
  <div ref="pageRoot" class="aci-hook-detail aci-route">
    <DetailHeader
      ref="header"
      :kind-text="CUSTOMIZATION_KIND_TEXT.hook"
      list-route="/?kind=hook"
      :neighbours="listNeighbours"
      :source-family-crumb-text="sourceFamilyCrumbText"
      :path-text="pathText"
      :path-is-spelled-out="pathIsSpelledOut"
      :accessible-text="headingAccessibleText"
    >
      <!-- The page's own subject, which is the declared event on a declaration
           view and the carrier's path on the carrier's own — the trail's
           default, taken when no event is named. The trail ended at the
           carrier either way, so a declaration page's last step named a file
           while its heading named an event. Which carrier it was declared in
           is the `Declared in` line's, said once. -->
      <template v-if="eventName !== null" #trail-subject>
        <AuthoredNameText :name="eventName">
          <span
            class="aci-detail-crumbs__subject"
            :class="{ 'aci-authored-text': eventName.isAuthored }"
            >{{ eventName.text }}</span
          >
        </AuthoredNameText>
      </template>

      <!-- The declared event names a declaration view, where the carrier's
       own path names the file-unit one. -->
      <template v-if="eventName !== null" #heading-name>
        <AuthoredNameText :name="eventName">
          <span :class="{ 'aci-authored-text': eventName.isAuthored }">{{ eventName.text }}</span>
        </AuthoredNameText>
      </template>
      <template #title-end>
        <!-- The addressed event's comparison, at the end of the heading's own
             line: it acts on the subject that heading names
             ({@link openEventCompareRoute}). -->
        <NuxtLink
          v-if="openEventCompareRoute !== null"
          class="aci-button aci-button--primary aci-detail-title-end"
          :to="openEventCompareRoute"
          >Compare this event's declarations
          <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
        /></NuxtLink>
        <!-- Why there is no comparison, rather than nothing at all: a missing
             control reads the same as a forgotten one, and the reason is a fact
             about the subject — this name resolves one carrier here, so there is
             no pair to make (FR-011). The skill detail says the same of a name
             with one copy. -->
        <!-- Said only where there is a subject to say it of: on a link the scan
             holds nothing at, before the carrier has loaded, and on a carrier
             that holds no declaration for this event, "one carrier here" would
             be a claim about a name that resolves nothing — and the last of the
             three says so directly below, so the two would stand together. -->
        <span
          v-else-if="openEventName !== null && openDetail !== null && !declarationMissing"
          class="aci-detail-title-end aci-muted"
          >This event has one carrier here, so there is nothing to compare</span
        >
      </template>
    </DetailHeader>

    <LiveRegion :text="detailAnnouncement" />

    <template v-if="detailState === 'loading'">
      <p v-if="openEventName === null" class="aci-empty">Loading this hook carrier…</p>
      <p v-else class="aci-empty">Loading this hook declaration…</p>
    </template>

    <template v-else-if="detailState === 'stale' || declarationMissing">
      <!-- Two dead links, two sentences: a path this scan holds no hook
           recognition at, and a held carrier that currently declares no event
           by this name — which covers a carrier whose declarations could not be
           read, whose rows are unknown rather than absent (FR-028). -->
      <SubjectUnavailable outcome="warning">
        <template v-if="declarationMissing">
          No hook declaration named this way is published for this file in the current scan. The
          carrier may have changed since the link was made — its declarations may even be unreadable
          right now — and a rescan that brings the name back will make it resolve again.
        </template>
        <template v-else>
          Nothing in the current scan sits at this link's path. The inventory may have changed since
          the link was made; a rescan that brings the path back will make it resolve again.
        </template>
        <template #exit>
          <NuxtLink to="/?kind=hook">Return to the inventory and open it again.</NuxtLink>
        </template>
      </SubjectUnavailable>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request. -->
    <template v-else-if="openDetail === null">
      <DetailFailureNotice :message="detailFailure" @retry="request.retryOpen()" />
    </template>

    <template v-else>
      <div class="aci-hook-detail__overview">
        <!-- What the carrier is to this kind, and which products recognize it
             with the surfaces they document reading it on, restated from the
             inventory entry so the page and the list agree (FR-007). No
             product is quoted for what it would run, because an admission is
             not an activation (FR-009). -->
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
          <template v-if="openEventName !== null"
            >Declared in
            <NuxtLink :to="carrierRoute" class="aci-path aci-authored-text">{{
              pathText
            }}</NuxtLink></template
          >
          <span v-if="carrierFormText !== null" class="aci-carrier-kind">{{
            carrierFormText
          }}</span>
        </DetailAttributes>

        <SourceRootNote :text="sourceRootText" />
      </div>

      <!-- The other carriers declaring this event, one line whatever the count
           (`FileStrip.vue`). The kinds whose row is a name all offer it — a
           skill's copies, an agent's files — and a declaration's carriers are
           the same move: the next place this event is declared, without
           returning to the list. Nothing here states an order or a winner:
           which declaration a session runs turns on runtime this tool does not
           observe (FR-009). -->
      <FileStrip
        :open-source-id="openSourceId"
        :entries="otherCarriers"
        label="Other carriers declaring this event"
      />

      <DetailDiagnostics :diagnostics="openDiagnostics" />

      <!-- An unreadable hook block leaves the rows unknown rather than absent
           (FR-028): the diagnostic above says what happened, and no source
           panel stands in for the declarations. -->
      <p v-if="declarationsFailed" class="aci-muted">
        The hook declarations in this file could not be read.
      </p>
      <p v-else-if="eventBlocks.length === 0" class="aci-muted">This file declares no hooks.</p>

      <!-- What a standalone hook file declares about itself: the keys beside
           its hook map, which no other row publishes because such a file has
           only this recognition (FR-007). The carrier view alone shows it — a
           declaration view is about one event, and the file's own keys are not
           part of it. -->
      <section v-if="openEventName === null && carrierFieldsJsonText !== ''">
        <SourceViewer
          panel-label="This file's own declarations"
          :source-text="carrierFieldsJsonText"
          :source-relative-path="openPath"
          content-label="File declarations of"
          content-language="json"
        />
      </section>

      <!-- The declarations: every one for the file-unit view, the selected one
           alone for a declaration view. Each section shows the groups the file
           wrote under its event as one JSON document in the parser's resolved
           order — matchers, commands, timeouts, exactly as authored, resolved
           against nothing and run by nothing (FR-020, FR-026).
           The declaration view's event already heads the page, so its one
           section repeats no heading. -->
      <section v-for="event in eventBlocks" :key="event.key" class="aci-hook-detail__event">
        <h3 v-if="openEventName === null" :aria-label="event.name.singleLineText">
          <AuthoredNameText :name="event.name">
            <span :class="event.name.isAuthored ? 'aci-authored-text' : 'aci-muted'">{{
              event.name.text
            }}</span>
          </AuthoredNameText>
        </h3>
        <!-- The comparison this event's row leads to: the accessible name
             carries the declared event after the visible phrase, because a
             carrier view renders one link per event and they would otherwise
             announce identically (WCAG 2.4.6). -->
        <p
          v-if="openEventName === null && event.compareRoute !== null"
          class="aci-hook-detail__compare"
        >
          <NuxtLink
            class="aci-button aci-button--primary"
            :to="event.compareRoute"
            :aria-label="`Compare this event's declarations: ${event.name.singleLineText}`"
            >Compare this event's declarations
            <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
          /></NuxtLink>
        </p>
        <!-- The declaration's groups as one read-only JSON document in the
             Monaco viewer — coloured by the `json` tokenizer a `.json` file's
             model gets (monaco-languages.ts, tokens-only) — in the spelling a
             reader pastes into their own hook map. JSON's own escaping is what
             keeps every character visible and transportable: a control
             character or lone surrogate is its escape, a newline is `\n`
             (FR-025, FR-026). The accessible name says which declaration of
             the carrier is showing, because a carrier view mounts one viewer
             per declared event (WCAG 2.4.6). -->
        <!-- What the viewer holds, said before it. The carrier may be TOML or a
             settings document, and its declaration is shown as JSON this
             surface serializes rather than as the bytes the file wrote — so a
             reader who opened a `.toml` and met JSON is told why. The keys are
             the file's own, in the order it wrote them, because that is what
             this surface publishes (FR-007; {@link declaredEntriesJsonText}).
             Only the comparison sorts, and only to align its two sides. -->
        <p class="aci-note">
          This is this event's declaration serialized as JSON, with the keys the file wrote in the
          order it wrote them; the file's own syntax is not shown.
        </p>
        <SourceViewer
          panel-label="Declaration"
          :source-text="event.jsonText"
          :source-relative-path="openPath"
          :content-label="`Declaration ${event.name.singleLineText} of`"
          content-language="json"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.aci-hook-detail__overview {
  border-bottom: 1px solid var(--aci-line);
  padding-bottom: 0.5rem;
}

/* The comparison entry sits under the declaration it pairs, as the sibling
   detail surfaces' does. */
.aci-hook-detail__compare {
  margin: 0.35rem 0 0;
}

/* One block per declaration, separated by spacing alone: the declaration
   document draws its own frame (SourceViewer), and a panel border around it
   would draw a second one. */
.aci-hook-detail__event {
  margin-block-start: 1.25rem;
}

.aci-hook-detail__event > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}
</style>
