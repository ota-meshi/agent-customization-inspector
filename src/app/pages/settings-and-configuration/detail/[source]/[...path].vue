<script setup lang="ts">
// The settings-and-configuration detail route (T599):
// `/settings-and-configuration/<source-relative path>`.
//
// A settings or configuration file is the document its author wrote, so the
// page shows it whole — a Codex `.codex/config.toml` as the TOML it is, with
// its comments, authored spellings, and section order intact, which is what a
// reader comparing the page against their own file needs. Nothing is read out
// of it, so a declared agent, skill, model-instruction, compact-prompt, or
// hook path is shown as the characters that were written and is never
// resolved, opened, or followed (FR-019); no configured target gains read
// authority, and no environment reference is substituted (FR-026).
//
// The file is the subject, because the file is this kind's inventory unit
// (data-model.md § Inventory unit). The URL carries no tool segment, so the
// path alone is the link's identity, stable across rescans and server
// launches (FR-030).
//
// One physical file can hold this row and another kind's: Codex's
// `.codex/config.toml` has one MCP row per server it declares and this row for
// the document those declarations sit in. Which detail answers is decided by
// the row a link is on, so the `[mcp_servers.*]` tables are visible here as
// part of the one document, while the MCP page leads with one declaration
// (FR-007).
//
// A file whose bytes were never accepted gains no recognition and so has no
// detail at all — its finding stays on the inventory, under the files in no
// kind (FR-028).
//
// This surface shows file contents exactly as authored — credentials
// included, with nothing masked and no control that would uncover a masked
// value: the files are the reader's own, over a loopback-bound session
// (FR-025, FR-026, FR-027). A project layer applies only to a trusted
// project, the layers outside this Source resolve against the same keys, and
// which value wins is runtime this tool never observes, so nothing here
// states a decision, a precedence, or that any product applied the file
// (FR-009).
//
// Leaving the route, a client-data purge, and a commit that replaces the
// generation all drop the open detail through the same cleanup the
// instruction route uses; only the URL survives a commit, and the page
// refetches the same path under the new generation.
import { computed, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';
import {
  asSourceSelector,
  detailNeighbours,
  detailRoute,
  detailRoutePathOf,
} from '../../../../components/detail-route';
import DetailAttributes from '../../../../components/inspection/DetailAttributes.vue';
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

const entryDetail = sessionViewState.entryDetail;
const snapshot = sessionViewState.snapshot;

/**
 * The settings-and-configuration inventory row the URL's path names, or null
 * when the committed inventory holds none there. Resolved from the snapshot rather than from a
 * fetched detail because the row has to be known before anything is
 * requested: it carries the recognizing products this page states, and a path
 * the inventory does not list is the same dead link the host would answer,
 * reportable without a doomed request.
 */
const owner = computed(
  () =>
    (snapshot.value?.settings ?? []).find(
      (entry) =>
        // Both halves of the identity (FR-030): the Claude and Copilot homes
        // both hold a `settings.json`, so a path-only match would state one
        // Source's recognizing products on the other's page.
        entry.sourceId === openSourceId.value && entry.sourceRelativePath === openPath.value,
    ) ?? null,
);

/** The kind's own caption, for the heading and the recognition line. */
const kindText = CUSTOMIZATION_KIND_TEXT['settings/config'];

/**
 * The inventory link that lands on the settings-and-configuration tab rather
 * than the default. The query value is the wire kind, which is what the
 * inventory reads back (`tab-navigation.ts`).
 */
const inventoryRoute = '/?kind=settings%2Fconfig';

/**
 * The rows either side of this one in the list's own order, so the next file
 * is one move rather than a return to the inventory (FR-007). The order is the
 * snapshot's, which is the order the inventory renders.
 */
const listNeighbours = computed(() => {
  const rows = (snapshot.value?.settings ?? []).map((entry) => ({
    // A path always draws, so the two spellings are the one label rule.
    label: inlinePresentationLabel(entry.sourceRelativePath),
    accessibleLabel: inlinePresentationLabel(entry.sourceRelativePath),
    route: detailRoute(
      'settings/config',
      entry.sourceRelativePath,
      sessionSources.selectorOf(entry.sourceId),
    ),
  }));
  return detailNeighbours(
    rows,
    (snapshot.value?.settings ?? []).findIndex((entry) => entry === owner.value),
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
 * two kinds — a Codex `.codex/config.toml` a `project_doc_fallback_filenames`
 * entry also names is an instruction file, so it is a row in both inventories
 * — while `get-file-detail` is addressed by the path alone and answers with
 * the first variant its fixed order reaches. Requiring `settings/config` here
 * would turn this page into a dead end for exactly the files two of this
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

// Where focus sits: the frame bounds this page and holds its heading focus
// (`DetailPage.vue`), and the guards below ask that focus to rescue itself.
const page = useTemplateRef<DetailPageControls>('page');

const pageOwnership = usePageOwnership();

// The effect that keeps the open subject the one the URL names
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
  focusHeading: () => page.value?.focusHeading(),
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
    ? 'This settings or configuration file could not be loaded.'
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
    return 'Loading a settings or configuration file';
  }
  if (detailState.value === 'stale' || owner.value === null) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Settings or configuration file could not be loaded';
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
    class="aci-settings-detail"
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
    :subject-resolved="owner !== null"
    missing-text="Nothing in the current scan sits at this link's path."
    :failure-text="detailFailure"
    loading-text="Loading this settings or configuration file…"
    :subject="openDetail"
    @retry="request.retryOpen()"
  >
    <!-- eslint-disable-next-line vue/no-template-shadow -- same value, same name, never null -->
    <template #default="{ subject: openDetail }">
      <!-- What this customization is, on one line: how the file read, which
           products recognize the document and where they document reading it, and
           the command that opens the file. Restated from the row so the page
           and the list agree (FR-007); no product is quoted for what it would
           decide, because existence is what an admission proves (FR-009). -->
      <DetailAttributes
        :file="openDetail.file"
        :recognitions="recognitions"
        :source="openSource"
        states-byte-order-mark
      />

      <SourceRootNote :text="sourceRootText" />

      <!-- The readability guard is the narrowing this file's own union asks
           for and never a branch with a second outcome: a settings recognition
           exists only for a readable file, so this page is reached with
           nothing else. The viewer colours by the path's own extension: a
           `.codex/config.toml` takes the `toml` grammar shiki bundles
           (`source-languages.ts`), which colours a TOML document's
           `key = value` lines, quoted strings, numbers, and `#` comments — its
           table headers and dates it classifies too, and the chosen themes
           leave those in the text colour (`syntax-highlighting.ts`). Colouring
           is tokenizing rather than rendering, so nothing here can mark the
           document invalid (FR-033). -->
      <SourceViewer
        v-if="isReadableFile(openDetail.file)"
        panel-label="Source"
        :source-text="openDetail.file.sourceText"
        :source-relative-path="openDetail.file.sourceRelativePath"
      />
    </template>
  </DetailPage>
</template>

<style scoped></style>
