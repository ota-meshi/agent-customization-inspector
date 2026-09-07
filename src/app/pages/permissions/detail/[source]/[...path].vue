<script setup lang="ts">
// The permission policy detail route: `/permissions/<source-relative path>`.
//
// The subject is a policy, not a file (data-model.md § Inventory unit), which
// is why this page reads `get-permission-policy-detail` rather than the file
// detail every other path-addressed page reads: what a permissions row names
// is the policy a file declares. The path in the URL is how that policy is
// addressed, because the declaring file's path is what the row is named by —
// stable across rescans and server launches (FR-030) — and no tool segment
// splits it, since no per-tool fact changes what the page would show.
//
// A policy whose whole document is the policy — a Codex `.codex/rules/*.rules`
// file — is shown as that document. A policy a carrier declares as one block
// of a larger document is shown as that block, never as the bytes around it;
// the page names it as a part rather than presenting a slice as a
// whole file (FR-025).
//
// Nothing here is a claim that the policy is in force. A permission decision
// is combined with every other active layer's under trust and approval state
// that turns on runtime this tool never observes, so the page states no
// decision, no precedence, and no enforcement (FR-009). Its commands, paths,
// and patterns are shown as the characters that were written and are never
// evaluated against anything (FR-019).
//
// The policy is shown exactly as authored — credentials included, with
// nothing masked and no control that would uncover a masked value — and no
// environment reference is resolved: the files are the reader's own, over a
// loopback-bound session (FR-025, FR-026, FR-027).
//
// Leaving the route, a client-data purge, and a commit that replaces the
// generation all drop the open detail through the same cleanup the other
// detail routes use; only the URL survives a commit, and the page refetches
// the same path under the new generation.
import { computed, useTemplateRef, watch } from 'vue';
import LiveRegion from '../../../../components/LiveRegion.vue';
import { useRoute } from 'vue-router';
import { declaredEntriesJsonText } from '../../../../components/declared-entries-json';
import {
  asSourceSelector,
  detailNeighbours,
  detailRoute,
  detailRoutePathOf,
} from '../../../../components/detail-route';
import DetailAttributes from '../../../../components/inspection/DetailAttributes.vue';
import DetailDiagnostics from '../../../../components/inspection/DetailDiagnostics.vue';
import DetailPathNotFound from '../../../../components/inspection/DetailPathNotFound.vue';
import DetailHeader from '../../../../components/inspection/DetailHeader.vue';
import DetailFailureNotice from '../../../../components/inspection/DetailFailureNotice.vue';
import SourceRootNote from '../../../../components/inspection/SourceRootNote.vue';
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

const policyDetail = sessionViewState.policyDetail;
const snapshot = sessionViewState.snapshot;

/**
 * The permissions inventory row the URL's path names, or null when the
 * committed inventory holds none there. Resolved from the snapshot rather
 * than from a fetched detail because the row has to be known before anything
 * is requested: it carries the recognizing products this page states, and a
 * path the inventory does not list is the same dead link the host would
 * answer, reportable without a doomed request.
 */
const owner = computed(
  () =>
    // Both halves of the identity (FR-030): the address's own Source, so a
    // same-path policy in another Source cannot answer for this one.
    (snapshot.value?.permissions ?? []).find(
      (entry) =>
        entry.sourceRelativePath === openPath.value && entry.sourceId === openSourceId.value,
    ) ?? null,
);

/** The kind's own caption, for the heading and the recognition line. */
const kindText = CUSTOMIZATION_KIND_TEXT.permissions;

/** The inventory link that lands on the permissions tab rather than the default. */
const inventoryRoute = '/?kind=permissions';

/**
 * The rows either side of this one in the list's own order, so the next file
 * is one move rather than a return to the inventory (FR-007). The order is the
 * snapshot's, which is the order the inventory renders.
 */
const listNeighbours = computed(() => {
  const rows = (snapshot.value?.permissions ?? []).map((entry) => ({
    // A path always draws, so the two spellings are the one label rule.
    label: inlinePresentationLabel(entry.sourceRelativePath),
    accessibleLabel: inlinePresentationLabel(entry.sourceRelativePath),
    route: detailRoute(
      'permissions',
      entry.sourceRelativePath,
      sessionSources.selectorOf(entry.sourceId),
    ),
  }));
  return detailNeighbours(
    rows,
    (snapshot.value?.permissions ?? []).findIndex((entry) => entry === owner.value),
  );
});

/**
 * The products that recognize this policy and the surfaces they recognize it
 * on, restated from the row so the page and the list agree (FR-007). The
 * row's recognitions are already in the closed tool order and each one's
 * surfaces in the closed surface order.
 */
const recognitions = computed(() => owner.value?.recognitions ?? []);

/**
 * The open policy once it is this path's: the fetched detail whose declaring
 * file is the URL's own. The path check keeps a slow previous request from
 * rendering under this route's heading.
 */
const openDetail = computed(() => {
  const detail = policyDetail.value;
  return detail !== null &&
    detail.file.sourceRelativePath === openPath.value &&
    detail.file.sourceId === openSourceId.value
    ? detail
    : null;
});

/**
 * The declared block as the JSON document the viewer shows, or null when the
 * open detail has no block to show — a policy that is its own document, or one
 * whose extraction failed. The keys the file wrote, in its own order, through
 * the one serializer every declared block is rendered by
 * (`declared-entries-json.ts`).
 */
const declaredPolicyJson = computed(() => {
  const detail = openDetail.value;
  return detail === null || detail.form !== 'declared-block' || detail.declaredPolicy === null
    ? null
    : declaredEntriesJsonText(detail.declaredPolicy);
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

/** The open policy's own file-scoped diagnostics, or none (FR-028). */
const openDiagnostics = computed(() => openDetail.value?.diagnostics ?? []);

// Where focus sits: the entry focus, the re-focus when the address names a
// different file, and the question the guards below ask before rescuing it
// (`detail-heading-focus.ts`).
const pageRoot = useTemplateRef<HTMLElement>('pageRoot');
const header = useTemplateRef<InstanceType<typeof DetailHeader>>('header');
const headingFocus = useDetailHeadingFocus({
  pageRoot,
  heading: () => header.value,
  openPath,
  openSource,
  selection: null,
});

const pageOwnership = usePageOwnership();

// The effect that keeps the open subject the one the URL names
// (`detail-request.ts`). A policy is addressed by the path of the file that
// declares it, which is the identity its inventory row is named by.
const request = useDetailRequest({
  openPath,
  openSource,
  selection: null,
  ready: () => owner.value !== null,
  perform: () => {
    void pageOwnership.openPolicyDetail(openPath.value, openSource.value);
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
    ? 'This permission policy could not be loaded.'
    : null,
);

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus (WCAG 4.1.3): the stale state, the
 * in-flight load, and a request that failed. Each phrase matches the visible
 * copy; ready content is read as focus moves through it.
 */
const detailAnnouncement = request.announcementOf({
  resolved: () => owner.value !== null,
  missingText: 'Nothing in the current scan sits at this link’s path.',
  failure: detailFailure,
  loadingText: 'Loading this permission policy…',
});

/**
 * What the document title says this page is showing (WCAG 2.4.2): the path
 * the heading shows while a policy is open, and the state the page is in
 * otherwise, so a reader returning to a tab is never told it shows a policy
 * the link no longer resolves. The raw path, not the escaped spelling: the
 * shell escapes its subject exactly once at the rendering boundary. Null when
 * the escaped spelling would draw nothing — the shell then titles the tab by
 * this route's surface name, because the spelled-out presentation the heading
 * falls back to contains backslashes the shell's escaping would double.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return 'Loading a permission policy';
  }
  if (detailState.value === 'stale' || owner.value === null) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Permission policy could not be loaded';
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
// history step to another policy, whose own `openPath` watcher focuses the
// heading after the flush. Synchronous, because afterwards the focused
// element is already gone.
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
  <div ref="pageRoot" class="aci-permission-policy-detail aci-route">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the
         permissions list rather than the kind order's default tab. -->
    <DetailHeader
      ref="header"
      :kind-text="kindText"
      :list-route="inventoryRoute"
      :neighbours="listNeighbours"
      :source-family-crumb-text="sourceFamilyCrumbText"
      :path-text="pathText"
      :path-is-spelled-out="pathIsSpelledOut"
      :accessible-text="headingAccessibleText"
    />

    <LiveRegion :text="detailAnnouncement" />

    <template v-if="detailState === 'loading'">
      <p class="aci-empty">Loading this permission policy…</p>
    </template>

    <template v-else-if="detailState === 'stale' || owner === null">
      <DetailPathNotFound :list-route="inventoryRoute" />
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request —
         the shell reports what happened to the session, so neither hides or
         repeats the other. -->
    <template v-else-if="openDetail === null">
      <DetailFailureNotice :message="detailFailure" @retry="request.retryOpen()" />
    </template>

    <template v-else>
      <!-- What this customization is, on one line: how the file read, which
           products recognize the policy and where they document reading it, and
           the command that opens the file. Restated from the row so the page
           and the list agree (FR-007); no product is quoted for what it would
           decide or enforce, because existence is what an admission proves (FR-009). -->
      <DetailAttributes
        :file="openDetail.file"
        :recognitions="recognitions"
        :source="openSource"
        states-byte-order-mark
      />

      <SourceRootNote :text="sourceRootText" />

      <!-- The whole document, which is what a policy file is. The grammar is
           the vendor's: Codex's `.rules` is Starlark, whose syntax its own
           page states is like Python and whose examples that page presents in
           a `python` block, while `.rules` is a spelling unrelated tools give
           files of their own and so borrows no grammar by suffix (monaco.ts
           § BORROWED_GRAMMARS). Colouring is tokenizing rather than
           validating: nothing here can mark the policy invalid (FR-033). The
           readability guard is the narrowing this detail's own union asks for
           and never a branch with a second outcome: a permissions recognition
           exists only for a readable file. -->
      <SourceViewer
        v-if="openDetail.form === 'whole-document' && isReadableFile(openDetail.file)"
        panel-label="Policy"
        :source-text="openDetail.file.sourceText"
        :source-relative-path="openDetail.file.sourceRelativePath"
        content-language="starlark"
      />

      <!-- The declared block, and nothing of the document around it: the
           carrier's other keys are the settings recognition's content and
           never reach this response (FR-007). One read-only JSON document in
           the Monaco viewer, in the keys the file wrote and its own order,
           which is the spelling a reader pastes back into their settings; JSON
           escaping is what keeps every character visible and transportable
           (FR-025, FR-026). A rule string is the characters its author wrote:
           nothing here resolves a tool, a command, a path, or a domain, and
           nothing is evaluated (FR-019). -->
      <template v-else-if="openDetail.form === 'declared-block'">
        <SourceViewer
          v-if="declaredPolicyJson !== null"
          panel-label="Declared permissions"
          :source-text="declaredPolicyJson"
          :source-relative-path="openDetail.file.sourceRelativePath"
          content-label="Declared permissions of"
          content-language="json"
        />
        <!-- The block could not be read at all: the carrier stays admitted,
             and the page says so with the extraction's own record rather than
             drawing an empty document or sending the reader elsewhere for the
             reason (FR-028). -->
        <template v-else>
          <p class="aci-empty">This carrier's declared permissions could not be read.</p>
          <DetailDiagnostics :diagnostics="openDiagnostics" />
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped></style>
