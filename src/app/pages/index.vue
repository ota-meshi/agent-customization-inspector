<script setup lang="ts">
// The Repository inventory route (T071). It renders the committed generation:
// the Repository header with its escaped, inert root label, the scan status
// and rescan controls, the filters, the Codex SKILL list, and the diagnostics
// that belong to no single row.
//
// The root label is the one presentation value that must not be mistaken for
// a path. `SourceBoundary.displayRoot` is a one-way escaping of the selected
// root: it grants no read authority, is not a `SourceRelativePath`, and is
// never used as a navigation or read locator (FR-002). It is therefore
// rendered in its own labelled field, visually and semantically separate from
// the Source-relative item paths in the list below, with a note stating what
// it is.
//
// The session view state is injected rather than created: the shell owns the
// one RPC connection and the one adopted snapshot, and a second view state
// would race the first for the same request tokens.
import { computed, inject, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DiagnosticList from '../components/diagnostics/DiagnosticList.vue';
import InventoryFilters from '../components/inventory/InventoryFilters.vue';
import InventoryKindTabs from '../components/inventory/InventoryKindTabs.vue';
import InventoryList from '../components/inventory/InventoryList.vue';
import UnclassifiedList from '../components/inventory/UnclassifiedList.vue';
import ScanProgress from '../components/inventory/ScanProgress.vue';
import { SESSION_VIEW_STATE } from '../session/view-state';
import { useInventoryFilters } from '../composables/filters';
import {
  SOURCE_BOUNDARY_ORIGIN_TEXT,
  isCustomizationKind,
  type CustomizationKind,
  type SupportedTool,
} from '../../shared/entities';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering this route; its absence is
  // a wiring bug, and failing loudly beats rendering an inventory-shaped page
  // with no session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const snapshot = sessionViewState.snapshot;

// The filter fields are this page's own state, so the template binds them with
// `v-model` directly and the composable returns only what it derives.
const sourceId = ref<string | null>(null);
const tool = ref<SupportedTool | null>(null);
const pathQuery = ref('');

const route = useRoute();
const router = useRouter();

/**
 * The kind read out of `?kind=`, or null for anything the closed order does
 * not name. The URL is presentation state, never a locator: an unknown value
 * simply leaves the default tab in view.
 */
function kindFromQuery(value: unknown): CustomizationKind | null {
  return isCustomizationKind(value) ? value : null;
}

// Kind is navigation, and navigation belongs in the URL: the tab is
// initialized from `?kind=` and every explicit tab selection is written back,
// so a detail page's back link and the browser's own Back both restore the
// tab the user actually left — the kind order's default would otherwise
// swallow it. `replace` rather than `push`: switching tabs must not stack
// history entries the Back button then has to unwind.
//
// What the query holds is this selection, never `filters.activeKind`. The two
// differ on purpose: a kind the current inventory does not offer stays the
// reader's choice while the view falls back to the first available one, so
// the choice returns by itself when a later commit offers that kind again
// (`filters.ts`). Writing the fallback here would put a derived value in the
// selection's own storage, where the two could then disagree — and a reader
// who has chosen nothing has chosen nothing, so the query stays absent and
// the default is resolved against whatever inventory is committed then.
const kind = ref<CustomizationKind | null>(kindFromQuery(route.query.kind));

/** Selects a kind tab: the page state and the URL move together. */
function selectKind(selected: CustomizationKind): void {
  kind.value = selected;
  void router.replace({ query: { ...route.query, kind: selected } });
}
const filters = useInventoryFilters(snapshot, { sourceId, tool, kind, pathQuery });

// What the two selects display is the selection actually applied, while what
// they write is the raw choice. A generation that no longer publishes the
// selected Source or tool renders no `<option>` for it, so a control bound to
// the raw choice would sit blank while the rows were unfiltered and the "clear
// filters" affordance stayed away — three surfaces disagreeing about one state.
// The write still goes to the raw ref, so the choice comes back on its own when
// a later generation offers that option again, exactly as the kind tab does.
const selectedSourceId = computed({
  get: () => filters.effectiveSourceId.value,
  set: (value: string | null) => {
    sourceId.value = value;
  },
});
const selectedTool = computed({
  get: () => filters.effectiveTool.value,
  set: (value: SupportedTool | null) => {
    tool.value = value;
  },
});

/** The page's own heading, the landmark focus recovery returns to. */
const inventoryHeading = ref<HTMLHeadingElement | null>(null);

// A snapshot swap can unmount the very element that held keyboard focus — a
// row the new generation no longer publishes, or the last kind's tab — and
// focus then falls to the document body (WCAG 2.4.3). Whether a given element
// survives cannot be known before the patch, so recovery is checked after it:
// if the swap left focus on the body, it moves to this page's heading.
watch(snapshot, async () => {
  await nextTick();
  if (document.activeElement === document.body) {
    inventoryHeading.value?.focus();
  }
});

/**
 * How many rows the filters admit in the kind currently in view. It is the
 * count that kind's tab already carries rather than a second derivation of it,
 * and it counts rows rather than files, because a row is what the user sees and
 * a skill row may stand for several files.
 */
const matchCount = computed(() => {
  const kindInView = filters.activeKind.value;
  return kindInView === null ? 0 : (filters.kindCounts.value.get(kindInView) ?? 0);
});

/**
 * How many rows the kind in view has before any filter. The summary compares
 * like with like: a skill row may stand for several files, so counting rows
 * against published files would read "2 of 3" for an inventory that lost
 * nothing. Each kind answers from its own inventory (data-model.md
 * § Inventory unit).
 */
const totalRowCount = computed(() => {
  switch (filters.activeKind.value) {
    case 'instructions':
      return snapshot.value?.instructions.length ?? 0;
    case 'skill':
      return snapshot.value?.skills.length ?? 0;
    case 'MCP':
      return snapshot.value?.mcp.length ?? 0;
    default:
      return 0;
  }
});

/**
 * Returns the filter fields to the same neutral values they were declared with.
 * `kind` is not among them: it is the tab in view, and clearing the filters
 * must not navigate the user somewhere else.
 */
function clearFilters(): void {
  sourceId.value = null;
  tool.value = null;
  pathQuery.value = '';
}

/** The one Repository Source; Global Sources arrive with the Global phases. */
const repositorySource = computed(
  () => snapshot.value?.sources.find((source) => source.kind === 'repository') ?? null,
);

const staleFailure = computed(() => {
  const sourceId = repositorySource.value?.sourceId;
  return snapshot.value?.staleFailures.find((entry) => entry.sourceId === sourceId) ?? null;
});

// A stale overlay explains itself with either the failed request's real error
// message or a retained Diagnostic; only the message variant has text of its
// own, and the Diagnostic variant is already rendered by the diagnostic list.
const staleFailureMessage = computed(() =>
  staleFailure.value?.failureRef.kind === 'error' ? staleFailure.value.failureRef.message : null,
);
</script>

<template>
  <div v-if="snapshot" class="aci-inventory-page">
    <h2 ref="inventoryHeading" tabindex="-1">Repository</h2>
    <template v-if="repositorySource">
      <dl class="aci-definition-grid">
        <dt>Selected root</dt>
        <dd class="aci-inventory-page__display-root">
          {{ repositorySource.boundary.displayRoot }}
          ({{ SOURCE_BOUNDARY_ORIGIN_TEXT[repositorySource.boundary.origin] }})
        </dd>
      </dl>
      <p class="aci-note">
        This label is an escaped presentation of the selected root. It is not a path you can open
        and grants no read access.
      </p>

      <ScanProgress
        :source="repositorySource"
        :active-scan-request-id="sessionViewState.activeScanRequestId.value"
        :requesting="sessionViewState.rescanState.value === 'requesting'"
        :rejection="sessionViewState.rescanRejection.value"
        :stale-failure="staleFailure"
        :stale-failure-message="staleFailureMessage"
        @rescan="sessionViewState.requestRescan()"
        @refresh="sessionViewState.refresh()"
      />
    </template>

    <h2>Customization files</h2>
    <InventoryFilters
      v-model:source-id="selectedSourceId"
      v-model:tool="selectedTool"
      v-model:path-query="pathQuery"
      :available-sources="filters.availableSources.value"
      :available-tools="filters.availableTools.value"
      :match-count="matchCount"
      :total-count="totalRowCount"
      :narrowed="filters.isNarrowed.value"
      @clear="clearFilters"
    />
    <InventoryKindTabs
      :kinds="filters.availableKinds.value"
      :active-kind="filters.activeKind.value"
      :counts="filters.kindCounts.value"
      @select="selectKind($event)"
    />
    <InventoryList
      :kind="filters.activeKind.value"
      :instruction-rows="filters.instructionRows.value"
      :skill-rows="filters.skillRows.value"
      :mcp-rows="filters.mcpRows.value"
      :files-by-path="filters.filesByPath.value"
      :mcp-carrier-paths="filters.mcpCarrierPaths.value"
      :total-count="totalRowCount"
      :diagnostics="snapshot.diagnostics"
    />

    <template v-if="filters.unrecognizedRows.value.length > 0">
      <h3>Files in no kind</h3>
      <p class="aci-note">
        Files an inspection rule admitted whose bytes this scan could not use, so no kind tab can
        list them. Each row states what happened — a read that failed outright, or bytes that were
        read and turned out to be binary. A file that only ships inside a customization's own
        directory is not here: it belongs to that customization's row, and its own row above says
        what happened to it.
      </p>
      <!-- Outside every kind tab: these files are in no kind's inventory, so
           no kind presentation applies to them. -->
      <UnclassifiedList
        :files="filters.unrecognizedRows.value"
        :diagnostics="snapshot.diagnostics"
      />
    </template>

    <h2>Diagnostics</h2>
    <DiagnosticList :diagnostics="snapshot.diagnostics" />
  </div>
</template>

<style scoped>
/* An escaped root label has no break opportunities of its own; without this the
   shell scrolls sideways. It is not a `.aci-path`: the label is a presentation
   of a root, not a path anything can open. */
.aci-inventory-page__display-root {
  font-family: ui-monospace, monospace;
  overflow-wrap: anywhere;
}
</style>
