<script setup lang="ts">
// The rule detail route (T417/T435): `/rules/<source-relative path>`.
//
// A rule file is the document its author wrote, so the page shows it whole —
// a Claude rule with its frontmatter block included, because splitting a rule
// into declarations and a body would show the reader two halves of one file.
// Nothing is read out of it, so a declared `paths` glob is shown as the
// characters that were written and is never evaluated against a filesystem
// path (FR-019); nothing here states which files it would match.
//
// The file is the subject, because the file is this kind's inventory unit
// (data-model.md § Inventory unit): a rule declares no name a page could be
// headed by. The URL carries no tool segment, so the path alone is the link's
// identity, stable across rescans and server launches (FR-030).
//
// A file whose bytes were never accepted gains no recognition and so has no
// detail at all — its finding stays on the inventory, under the files in no
// kind (FR-028).
//
// This surface shows file contents exactly as authored — credentials
// included, with nothing masked and no control that would uncover a masked
// value — and resolves no environment reference: the files are the reader's
// own, over a loopback-bound session (FR-025, FR-026, FR-027). Whether a rule
// is in context depends on runtime this tool never observes, so nothing here
// states a decision, an order, or that any product applied the file (FR-009).
//
// Leaving the route, a client-data purge, and a commit that replaces the
// generation all drop the open detail through the same cleanup the
// instruction route uses; only the URL survives a commit, and the page
// refetches the same path under the new generation.
import { computed, useTemplateRef, watch } from 'vue';
import LiveRegion from '../../../../components/LiveRegion.vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import {
  asSourceSelector,
  detailNeighbours,
  detailRoute,
  detailRoutePathOf,
} from '../../../../components/detail-route';
import DetailAttributes from '../../../../components/inspection/DetailAttributes.vue';
import DetailCrumbs from '../../../../components/inspection/DetailCrumbs.vue';
import DetailNavigation from '../../../../components/inspection/DetailNavigation.vue';
import SubjectUnavailable from '../../../../components/inspection/SubjectUnavailable.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import { useDetailAddress, usePathPresentation } from '../../../../composables/detail-address';
import { useDetailHeadingFocus } from '../../../../composables/detail-heading-focus';
import { useDetailRequest } from '../../../../composables/detail-request';
import { usePageOwnership, useReportedPageSubject } from '../../../../composables/page-ownership';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { useSessionSources } from '../../../../composables/session-sources';
import { useSessionViewState } from '../../../../composables/session-view-state';
import {
  CUSTOMIZATION_KIND_TEXT,
  inlinePresentationLabel,
  isReadableFile,
} from '../../../../../shared/entities';
import { SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';

const sessionViewState = useSessionViewState();

// What the URL names, resolved once for every path-addressed detail route
// (`detail-address.ts`). A rule page is headed by the address's own path, so
// its presentation is that path's.
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

const entryDetail = sessionViewState.entryDetail;
const snapshot = sessionViewState.snapshot;

/**
 * The rules inventory row the URL's path names, or null when the committed
 * inventory holds none there. Resolved from the snapshot rather than from a
 * fetched detail because the row has to be known before anything is
 * requested: it carries the recognizing products this page states, and a path
 * the inventory does not list is the same dead link the host would answer,
 * reportable without a doomed request.
 */
const owner = computed(
  () =>
    (snapshot.value?.rules ?? []).find(
      (entry) =>
        // Both halves of the identity (FR-030): a same-path rule file in
        // another Source is a different file's row.
        entry.sourceId === openSourceId.value && entry.sourceRelativePath === openPath.value,
    ) ?? null,
);

/** The kind's own caption, for the crumbs and the moves back to its list. */
const kindText = CUSTOMIZATION_KIND_TEXT.rule;

/** The inventory link that lands on the rules tab rather than the default. */
const inventoryRoute = '/?kind=rule';

/**
 * The rows either side of this one in the rule list's own order, so the next
 * file is one move rather than a return to the inventory (FR-007). The list's
 * order is the snapshot's, which is the order the inventory renders.
 *
 * A rule row is one file, so a row's subject is its path and the strip of
 * other copies this kind has is empty: there is no name for a second file to
 * carry.
 */
const listNeighbours = computed(() => {
  const rows = (snapshot.value?.rules ?? []).map((entry) => ({
    // A path always draws, so the two spellings are the one label rule.
    label: inlinePresentationLabel(entry.sourceRelativePath),
    accessibleLabel: inlinePresentationLabel(entry.sourceRelativePath),
    route: detailRoute('rule', entry.sourceRelativePath, sessionSources.selectorOf(entry.sourceId)),
  }));
  return detailNeighbours(
    rows,
    (snapshot.value?.rules ?? []).findIndex((entry) => entry === owner.value),
  );
});

/**
 * The products that recognize this file and the surfaces they recognize it
 * on, restated from the row so the page and the list agree (FR-007). The
 * row's recognitions are already in the closed tool order and each one's
 * surfaces in the closed surface order.
 */
const recognitions = computed(() => owner.value?.recognitions ?? []);

/**
 * The open detail once it is this path's: the fetched entry whose file is the
 * URL's own. The path check keeps a slow previous detail from rendering under
 * this route's heading.
 *
 * The variant is deliberately not checked. One file can hold recognitions of
 * two kinds — a `.claude/rules/CLAUDE.md` is a Claude rule by its directory
 * and a Claude instruction file by its name, so it is a row in both
 * inventories — while `get-file-detail` is addressed by the path alone and
 * answers with the first variant its fixed order reaches. Requiring `rule`
 * here would turn this page into a dead end for exactly the files two of this
 * product's own inventories link to. What the page renders is the document,
 * which every variant carries the same way.
 */
const openDetail = computed(() => {
  const detail = entryDetail.value;
  return detail !== null && detail.file.sourceRelativePath === openPath.value ? detail : null;
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

// Where focus sits: the entry focus, the re-focus when the address names a
// different file, and the question the guards below ask before rescuing it
// (`detail-heading-focus.ts`).
const pageRoot = useTemplateRef<HTMLElement>('pageRoot');
const heading = useTemplateRef<HTMLHeadingElement>('heading');
const headingFocus = useDetailHeadingFocus({
  pageRoot,
  heading,
  openPath,
  openSource,
  selection: null,
});

const pageOwnership = usePageOwnership();

// The effect that keeps the open file the one the URL names
// (`detail-request.ts`). This kind's subject is its path alone, so nothing is
// selected inside it; the one file is both arguments of the request, because
// this kind has no companion to read from it.
const request = useDetailRequest({
  openPath,
  openSource,
  selection: null,
  ready: () => owner.value !== null,
  perform: () => {
    void pageOwnership.openFileDetail(openPath.value, openPath.value, openSource.value);
  },
  headingFocus,
});
const { detailState, detailError } = request;

/**
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
 */
const detailFailure = computed<string | null>(() => {
  const statement =
    openDetail.value === null && detailState.value === 'idle'
      ? 'This rule file could not be loaded.'
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
    return 'Loading this rule file…';
  }
  return '';
});

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
    return 'Loading a rule file';
  }
  if (detailState.value === 'stale' || owner.value === null) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Rule file could not be loaded';
  }
  return pathIsSpelledOut.value
    ? null
    : `${openPath.value} — ${SOURCE_SELECTOR_TEXT[openSource.value]}`;
});
useReportedPageSubject(titleSubject);

// A generation replacement drops a detail that was on screen — the viewer
// unmounts — without moving the URL, so if keyboard focus is inside that
// subtree it would drop to the document body (WCAG 2.4.3). Only an
// actually-departing detail moves focus: a request that fails before anything
// was shown unmounts nothing but the loading line, and the reader may be on
// the surviving back link — an error is announced through the live region,
// never by forcing focus. The path condition keeps this guard out of a
// history step to another rule file, whose own `openPath` watcher focuses the
// heading after the flush. Synchronous, because afterwards the focused
// element is already gone.
watch(
  openDetail,
  (detail, previous) => {
    if (
      detail === null &&
      previous !== null &&
      previous.file.sourceRelativePath === openPath.value
    ) {
      headingFocus.requestFocusHeading();
    }
  },
  { flush: 'sync' },
);

// The stale transition replaces the whole body of the page below the heading
// — the loading line or the detail alike — so its guard watches the state
// itself and considers the whole page root (WCAG 2.4.3).
watch(
  [detailState, owner],
  ([state, resolved]) => {
    if (state === 'stale' || resolved === null) {
      headingFocus.requestFocusHeading();
    }
  },
  { flush: 'sync' },
);
</script>

<template>
  <div ref="pageRoot" class="aci-rule-detail aci-route">
    <!-- The way back and the rows either side of this one, drawn in the bar
         with every other route's moves (`DetailNavigation.vue`). The kind is
         URL state, so naming it is what makes the move land on the rule list
         rather than the kind order's default tab. -->
    <DetailNavigation
      :list-route="inventoryRoute"
      :list-text="kindText"
      :previous="listNeighbours.previous"
      :next="listNeighbours.next"
    />

    <DetailCrumbs
      :source-family-crumb-text="sourceFamilyCrumbText"
      :kind-text="kindText"
      :path-text="pathText"
    />

    <div class="aci-rule-detail__title">
      <h2 ref="heading" tabindex="-1" class="aci-detail-title" :aria-label="headingAccessibleText">
        <!-- The file's path heads the page — the row's own identity, in the
           same spelling the inventory lists: escaped for presentation, never
           a locator anything can open (FR-024, FR-030). A path whose escaped
           spelling draws nothing is spelled out in full instead — a spelled
           presentation, not the authored run, so it drops the authored-text
           treatment (data-model.md § SourceRelativePath) — and a URL with no
           path segments at all is headed by the kind, so the heading always
           describes the page (WCAG 2.4.6). -->
        <template v-if="openPath === ''">{{ kindText }}</template>
        <span v-else class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{
          pathText
        }}</span>
      </h2>
    </div>

    <LiveRegion :text="detailAnnouncement" />

    <template v-if="detailState === 'loading'">
      <p class="aci-empty">Loading this rule file…</p>
    </template>

    <template v-else-if="detailState === 'stale' || owner === null">
      <SubjectUnavailable outcome="warning">
        Nothing in the current scan sits at this link's path. The inventory may have changed since
        the link was made; a rescan that brings the path back will make it resolve again.
        <template #exit>
          <NuxtLink :to="inventoryRoute">Return to the inventory and open it again.</NuxtLink>
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
          <button type="button" @click="request.retryOpen()">Try again</button>
        </template>
      </SubjectUnavailable>
    </template>

    <template v-else>
      <DetailAttributes
        :file="openDetail.file"
        :recognitions="recognitions"
        :source="openSource"
        states-byte-order-mark
      />

      <!-- Which directory the file was in, where its family holds more than
           one: an escaped presentation of the admitted root, never a path
           anything can open (FR-002). -->
      <p v-if="sourceRootText !== null" class="aci-rule-detail__root aci-note">
        <span class="aci-authored-text">{{ sourceRootText }}</span>
      </p>

      <!-- The readability guard is the narrowing this file's own union asks
           for and never a branch with a second outcome: a rule recognition
           exists only for a readable file, so this page is reached with
           nothing else. The viewer colours by the path's own extension, which
           is Markdown for every shipped rule file; colouring is tokenizing
           rather than rendering, so no heading becomes large and no link
           becomes clickable (FR-033). -->
      <SourceViewer
        v-if="isReadableFile(openDetail.file)"
        panel-label="Source"
        :source-text="openDetail.file.sourceText"
        :source-relative-path="openDetail.file.sourceRelativePath"
      />
    </template>
  </div>
</template>

<style scoped>
/* The rule detail reads top to bottom: what the file is, then the complete
   file. It scrolls as a page rather than fitting the viewport, the same trade
   the instruction detail makes. */
.aci-rule-detail {
  display: flex;
  flex-direction: column;
}

/* The heading block is chrome, and every line of it is a line the file does
   not get, so it is tighter here than the shell's default heading spacing. */
.aci-rule-detail > p:first-child {
  margin: 0;
}

/* Tighter than the shell's section-heading baseline, because the heading
   block is chrome; the authored path may have no break opportunities of its
   own, and without the wrap a long one forces sideways scrolling at narrow
   widths and 200% zoom (WCAG 1.4.10). */
/* The path and the link that opens it on one line, wrapping together when the
   path is long. */
.aci-rule-detail__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-block-end: 0.5rem;
}

.aci-rule-detail h2 {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}
</style>
