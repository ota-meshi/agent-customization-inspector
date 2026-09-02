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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import { declaredEntriesJsonText } from '../../../../components/declared-entries-json';
import { DIAGNOSTIC_REGISTRY } from '../../../../../shared/diagnostics';
import {
  familyGenerationOf,
  asSourceSelector,
  decodeDetailRoutePath,
  detailNeighbours,
  detailRoute,
  type SourceSelector,
} from '../../../../components/detail-route';
import DetailNavigation from '../../../../components/inspection/DetailNavigation.vue';
import SubjectUnavailable from '../../../../components/inspection/SubjectUnavailable.vue';
import OpenFileButton from '../../../../components/inspection/OpenFileButton.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import RecognitionMarks from '../../../../components/inventory/RecognitionMarks.vue';
import { usePageOwnership } from '../../../../composables/page-ownership';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { useSessionSources } from '../../../../composables/session-sources';
import { useSessionViewState } from '../../../../composables/session-view-state';
import {
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
} from '../../../../../shared/entities';
import { SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';

const sessionViewState = useSessionViewState();

const route = useRoute();

/**
 * The Source-relative path from the URL's catch-all segments — the declaring
 * file's path, which is the row's identity and the whole route identity
 * (FR-030). The router hands the segments over individually and decoded, so
 * joining them with `/` restores the published spelling exactly.
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

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The Source ID the address's own token names in the current snapshot, or
 * null while the snapshot lists no such Source — a link kept across a Global
 * disable. Every row resolution on this page is scoped by it, because a
 * same-path policy in another Source is a different file (FR-030).
 */
const openSourceId = computed((): string | null => sessionSources.sourceIdFor(openSource.value));

// The open file's Source facts (FR-007 "show its source"): the family name
// where more than one family is inspected, and the consented directory where
// the family holds more than one Source (`source-facts.ts`).
const { sourceRootText, sourceFamilyCrumbText } = useOpenSourceFacts(
  () => snapshot.value?.sources ?? [],
  () => openSourceId.value,
);

const policyDetail = sessionViewState.policyDetail;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
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
    label: inlinePresentationLabel(entry.sourceRelativePath),
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
 * The path as the heading shows it, through the one label rule every surface
 * that draws a path uses ({@link pathPresentationLabel}).
 */
const pathText = computed(() => pathPresentationLabel(openPath.value));

/**
 * Whether {@link pathText} is the spelled-out form rather than the path's own
 * spelling, which an authored name of whitespace or default-ignorable code
 * points produces. The label then draws this product's characters instead of
 * the reader's, so it is not authored text and does not title the tab.
 * Compared against the escaping rather than tested again, so the two cannot
 * answer differently.
 */
const pathIsSpelledOut = computed(() => pathText.value !== escapeControlCharacters(openPath.value));

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

/** The page's root, for the focus guards below. */
const pageRoot = ref<HTMLElement | null>(null);

/**
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
 */
const detailFailure = computed<string | null>(() => {
  const statement =
    openDetail.value === null && detailState.value === 'idle'
      ? 'This permission policy could not be loaded.'
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
    return 'Loading this permission policy…';
  }
  return '';
});

/** The page heading, focused on entry so a keyboard user starts at the top. */
const heading = ref<HTMLHeadingElement | null>(null);

/** Set as the route is left, so the focus guards yield to the next route. */
let leaving = false;

const pageOwnership = usePageOwnership();

/**
 * Requests the policy the URL currently names. The route watcher below calls
 * it on every selection, and the failed-load branch calls it again as the
 * retry.
 */
const requestOpen = (): void => {
  if (owner.value === null) {
    return;
  }
  void pageOwnership.openPolicyDetail(openPath.value, openSource.value);
};

// One effect owns "which policy should be open", so entering the route and a
// history step between policies take the same path. The committed generations
// are part of what "open" means: adopting a newer one closes the open detail
// while the path stays identical, so their change is what re-requests the same
// path under the new snapshot.
watch(
  [
    openPath,
    (): boolean => owner.value !== null,
    (): number => familyGenerationOf(snapshot.value ?? null, openSource.value),
    // The Source is a key beside the path, because it is the other half of the
    // identity: a step between two Sources' details at one path leaves the path
    // identical and the file different, so without this the page would keep
    // showing the file it already had (FR-030).
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

// Focus moves to the heading when the page is entered or the open policy
// changes: following a link in an SPA moves no focus by itself.
function focusHeading(): void {
  heading.value?.focus();
}

onMounted(focusHeading);
watch([openSource, openPath], () => void nextTick(focusHeading));

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
      previous.file.sourceId === openSourceId.value &&
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
// itself and considers the whole page root (WCAG 2.4.3).
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
  <div ref="pageRoot" class="aci-permission-policy-detail aci-route">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the
         permissions list rather than the kind order's default tab. -->
    <!-- The way back and the rows either side of this one, drawn in the bar
         with every other route's moves (`DetailNavigation.vue`). The kind is
         URL state, so naming it is what makes the move land on this kind's
         list rather than the kind order's default tab. -->
    <DetailNavigation
      :list-route="inventoryRoute"
      :list-text="kindText"
      :previous="listNeighbours.previous"
      :next="listNeighbours.next"
    />

    <!-- Where the page sits, which is location rather than a way out: the
         Source family, the kind, and this page's own subject. -->
    <p class="aci-detail-crumbs">
      <template v-if="sourceFamilyCrumbText !== null"
        >{{ sourceFamilyCrumbText }} <span>›</span> </template
      >{{ kindText }} <span>›</span>
      <span class="aci-detail-crumbs__subject aci-path">{{ pathText }}</span>
    </p>

    <div class="aci-permission-policy-detail__title">
      <h2 ref="heading" tabindex="-1" class="aci-detail-title" :aria-label="headingAccessibleText">
        <!-- The declaring file's path heads the page — the row's own identity,
           in the same spelling the inventory lists: escaped for presentation,
           never a locator anything can open (FR-024, FR-030). A path whose
           escaped spelling draws nothing is spelled out in full instead — a
           spelled presentation, not the authored run, so it drops the
           authored-text treatment (data-model.md § SourceRelativePath) — and a
           URL with no path segments at all is headed by the kind, so the
           heading always describes the page (WCAG 2.4.6). -->
        <template v-if="openPath === ''">{{ kindText }}</template>
        <span v-else class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{
          pathText
        }}</span>
      </h2>
    </div>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ detailAnnouncement }}
    </p>

    <template v-if="detailState === 'loading'">
      <p class="aci-empty">Loading this permission policy…</p>
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
          <button type="button" @click="retryOpen">Try again</button>
        </template>
      </SubjectUnavailable>
    </template>

    <template v-else>
      <!-- What this customization is, on one line: how the file read, which
           products recognize the policy and where they document reading it, and
           the command that opens the file. Restated from the row so the page
           and the list agree (FR-007); no product is quoted for what it would
           decide or enforce, because existence is what an admission proves (FR-009). -->
      <p class="aci-detail-attributes">
        <span
          >{{ FILE_ENCODING_TEXT[openDetail.file.encoding]
          }}<template v-if="openDetail.file.encoding !== 'unknown'">
            · {{ openDetail.file.sizeBytes }} bytes</template
          ><template v-if="isReadableFile(openDetail.file) && openDetail.file.hadLeadingBom">
            · byte-order mark removed before decoding</template
          ></span
        >
        <RecognitionMarks :recognitions="recognitions" named />
        <!-- Outside the heading so it does not join the heading's accessible
             name: a reader hearing the page's landmarks should hear the file,
             not an action on it (WCAG 2.4.6). -->
        <span class="aci-detail-attributes__end">
          <OpenFileButton
            :source-relative-path="openDetail.file.sourceRelativePath"
            :source="openSource"
          />
        </span>
      </p>

      <!-- Which directory the file was in, where its family holds more
           than one: an escaped presentation of the admitted root, never a
           path anything can open (FR-002). -->
      <p v-if="sourceRootText !== null" class="aci-permission-policy-detail__root aci-note">
        <span class="aci-authored-text">{{ sourceRootText }}</span>
      </p>

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
          <ul v-if="openDiagnostics.length > 0" class="aci-list" role="list">
            <li v-for="diagnostic in openDiagnostics" :key="diagnostic.diagnosticId">
              {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
            </li>
          </ul>
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* The policy detail reads top to bottom: what the policy is, then the policy.
   It scrolls as a page rather than fitting the viewport, the same trade the
   other detail routes make. */
.aci-permission-policy-detail {
  display: flex;
  flex-direction: column;
}

/* The heading block is chrome, and every line of it is a line the policy does
   not get, so it is tighter here than the shell's default heading spacing. */
.aci-permission-policy-detail > p:first-child {
  margin: 0;
}

/* The recognition caption line, weighted like a heading within the overview:
   it says which products' recognition the page restates. */
.aci-permission-policy-detail__recognition {
  font-weight: 600;
  margin: 0;
}

.aci-permission-policy-detail__overview {
  border-bottom: 1px solid var(--aci-line);
  margin-block-end: 0.75rem;
  padding-bottom: 0.5rem;
}

/* Tighter than the shell's section-heading baseline, because the heading
   block is chrome; the authored path may have no break opportunities of its
   own, and without the wrap a long one forces sideways scrolling at narrow
   widths and 200% zoom (WCAG 1.4.10). */
/* The path and the link that opens it on one line, wrapping together when the
   path is long. */
.aci-permission-policy-detail__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-block-end: 0.5rem;
}

.aci-permission-policy-detail h2 {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}
</style>
