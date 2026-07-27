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
import { computed, inject, ref } from 'vue';
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
const kind = ref<CustomizationKind | null>(null);
const pathQuery = ref('');
const filters = useInventoryFilters(snapshot, { sourceId, tool, kind, pathQuery });

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
 * nothing.
 */
const totalRowCount = computed(() =>
  filters.activeKind.value === 'skill' ? (snapshot.value?.skills.length ?? 0) : 0,
);

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
  return (
    snapshot.value?.staleFailures.find((entry) => entry.sourceId === sourceId) ?? null
  );
});

// A stale overlay explains itself with either the failed request's real error
// message or a retained Diagnostic; only the message variant has text of its
// own, and the Diagnostic variant is already rendered by the diagnostic list.
const staleFailureMessage = computed(() =>
  staleFailure.value?.failureRef.kind === 'error' ? staleFailure.value.failureRef.message : null,
);
</script>

<template>
  <div v-if="snapshot">
    <h2>Repository</h2>
    <template v-if="repositorySource">
      <dl class="aci-source-summary">
        <dt>Selected root</dt>
        <dd class="aci-display-root">
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
      v-model:source-id="sourceId"
      v-model:tool="tool"
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
      @select="kind = $event"
    />
    <InventoryList
      :kind="filters.activeKind.value"
      :skill-rows="filters.skillRows.value"
      :files-by-id="filters.filesById.value"
      :total-count="totalRowCount"
      :diagnostics="snapshot.diagnostics"
    />

    <template v-if="filters.unrecognizedRows.value.length > 0">
      <h3>Files in no kind</h3>
      <p class="aci-note">
        These were admitted by an inspection rule, but nothing recognized them as a
        customization, so no kind tab can list them. Each row states why — a read that failed
        outright, or bytes that were read and turned out to be binary.
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
