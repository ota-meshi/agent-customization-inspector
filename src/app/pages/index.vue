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
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import DiagnosticList from '../components/diagnostics/DiagnosticList.vue';
import InventoryFilters from '../components/inventory/InventoryFilters.vue';
import InventoryKindTabs from '../components/inventory/InventoryKindTabs.vue';
import InventoryList from '../components/inventory/InventoryList.vue';
import UnclassifiedList from '../components/inventory/UnclassifiedList.vue';
import ScanProgress from '../components/inventory/ScanProgress.vue';
import { SESSION_VIEW_STATE } from '../session/view-state';
import { recordInventoryReturnPoint } from '../router.options';
import { useInventoryFilters } from '../composables/filters';
import {
  SOURCE_BOUNDARY_ORIGIN_TEXT,
  isCustomizationKind,
  isSupportedTool,
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

/**
 * The tool read out of `?tool=`, or null for anything the closed catalog does
 * not name — the same rule as {@link kindFromQuery}, for the same reason.
 */
function toolFromQuery(value: unknown): SupportedTool | null {
  return isSupportedTool(value) ? value : null;
}

/**
 * The text a query parameter carries, or null when it is absent, empty, or
 * repeated. None of the three is a selection the controls can make, and the
 * fields already start at the neutral value an empty one would set.
 */
function queryText(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

// What the reader has narrowed the inventory to is navigation, and navigation
// belongs in the URL: every selection is initialized from the query and
// written back to it, so a detail page's back link, the browser's own Back, a
// reload, and a pasted link all render the list that was being read rather
// than the whole inventory. `replace` rather than `push`: narrowing must not
// stack history entries the Back button then has to unwind, and the path field
// would stack one per keystroke.
//
// What the query holds is these selections, never the values the view falls
// back to (`filters.activeKind`, `filters.effectiveSourceId`,
// `filters.effectiveTool`). The two differ on purpose: a kind, Source, or tool
// the current inventory does not offer stays the reader's choice while the
// view falls back, so the choice returns by itself when a later commit offers
// it again (`filters.ts`). Writing the fallback here would put a derived value
// in the selection's own storage, where the two could then disagree — and a
// reader who has chosen nothing has chosen nothing, so the parameter stays
// absent and the default is resolved against whatever inventory is committed
// then.
const sourceId = ref<string | null>(queryText(route.query.source));
const tool = ref<SupportedTool | null>(toolFromQuery(route.query.tool));
const pathQuery = ref(queryText(route.query.path) ?? '');
const kind = ref<CustomizationKind | null>(kindFromQuery(route.query.kind));

watch([sourceId, tool, pathQuery, kind], () => {
  void router.replace({
    query: {
      ...route.query,
      source: sourceId.value ?? undefined,
      tool: tool.value ?? undefined,
      path: pathQuery.value === '' ? undefined : pathQuery.value,
      kind: kind.value ?? undefined,
    },
  });
});

// Where the reader is when they leave, so that coming back puts them there
// rather than at the top of a list they would have to find their place in
// again. A leave guard runs before anything moves: the row they followed is
// still rendered and the document is still scrolled where they left it, and
// the route being navigated to is what names that row's link. Restoring the
// point is the router's, together with the focus that belongs beside it
// (router.options.ts).
onBeforeRouteLeave((to) => {
  recordInventoryReturnPoint(to.fullPath);
});

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
 *
 * A table keyed by the closed kind union rather than a switch with a default
 * branch: a kind whose inventory ships without an entry here cannot compile,
 * where a default would have summarized it as "of 0" (AGENTS.md § User-visible
 * copy policy makes the same argument for a label table).
 */
const totalRowCount = computed<number>(() => {
  const kind = filters.activeKind.value;
  const committed = snapshot.value;
  if (kind === null || committed === null) {
    // No kind in view, or nothing committed yet: the summary has no rows to
    // compare against.
    return 0;
  }
  const totals: Readonly<Record<CustomizationKind, number>> = {
    instructions: committed.instructions.length,
    skill: committed.skills.length,
    MCP: committed.mcp.length,
    agent: committed.agents.length,
    'prompt/command': committed.prompts.length,
    rule: committed.rules.length,
    permissions: committed.permissions.length,
    hook: committed.hooks.length,
    plugin: committed.plugins.length,
    // No inventory of its own: a sibling metadata file belongs to the skill
    // whose directory holds it, and that skill's row is where it appears
    // (data-model.md § Inventory unit).
    'skill metadata': 0,
    'output style': committed.outputStyles.length,
    'settings/config': committed.settings.length,
  };
  return totals[kind];
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

/**
 * How many of this Source's committed files kept a file-confined diagnostic —
 * which is what a `partial` status reports (FR-028). The scan status states it,
 * because the status is where a reader asks what "Partial" means and the causes
 * themselves are spread across the rows of the files that carry them.
 *
 * Counted from the published files rather than from `snapshot.diagnostics`: a
 * diagnostic is referenced by the file it belongs to, and one file may hold
 * several, so counting records would report a number no list on this page has.
 */
const diagnosticFileCount = computed(() => {
  const sourceId = repositorySource.value?.sourceId;
  let count = 0;
  for (const file of snapshot.value?.files ?? []) {
    if (file.sourceId === sourceId && file.diagnosticIds.length > 0) {
      count += 1;
    }
  }
  return count;
});

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
        :diagnostic-file-count="diagnosticFileCount"
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
    <!-- The rail carries what decides which rows are on screen — the kind in
         view and the filters that narrow it — and the rows take the rest of the
         width, because a row is a path and a path is what needs the room. -->
    <div class="aci-inventory-page__browse">
      <div class="aci-inventory-page__rail">
        <!-- The kind list is the part of the rail that gives way when the rail
             is taller than the viewport, which is what keeps the filters below
             it on screen. It is wrapped rather than styled through the
             component, because how tall it may grow is the rail's decision
             rather than the list's. -->
        <div class="aci-inventory-page__kinds">
          <InventoryKindTabs
            :kinds="filters.availableKinds.value"
            :active-kind="filters.activeKind.value"
            :counts="filters.kindCounts.value"
            @select="kind = $event"
          />
        </div>
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
      </div>
      <InventoryList
        :kind="filters.activeKind.value"
        :instruction-rows="filters.instructionRows.value"
        :skill-rows="filters.skillRows.value"
        :mcp-rows="filters.mcpRows.value"
        :agent-rows="filters.agentRows.value"
        :prompt-rows="filters.promptRows.value"
        :rule-rows="filters.ruleRows.value"
        :permissions-rows="filters.permissionsRows.value"
        :hook-rows="filters.hookRows.value"
        :plugin-rows="filters.pluginRows.value"
        :output-style-rows="filters.outputStyleRows.value"
        :settings-rows="filters.settingsRows.value"
        :files-by-path="filters.filesByPath.value"
        :total-count="totalRowCount"
        :diagnostics="snapshot.diagnostics"
      />
    </div>

    <!-- Outside every kind tab: these files are in no kind's inventory, so no
         kind presentation applies to them. It is a disclosure rather than a
         standing section because its membership rule is absence: any repository
         holding one unreadable, binary, or nothing-declaring candidate has it,
         so as a standing section it sat open under whatever kind tab was being
         read, on every visit, whether or not the reader was looking for it. The
         count stays on the closed summary, and the scan status states how many
         files kept a diagnostic (`ScanProgress.vue`), so a `partial` generation
         still says which file it was (FR-028) at the cost of one interaction. -->
    <details v-if="filters.unrecognizedRows.value.length > 0" class="aci-inventory-page__no-kind">
      <summary>
        <h3 class="aci-inventory-page__no-kind-heading">
          Files in no kind
          <span class="aci-inventory-page__no-kind-count">{{
            filters.unrecognizedRows.value.length
          }}</span>
        </h3>
      </summary>
      <p class="aci-note">
        Files an inspection rule admitted that no kind tab lists. Each row states its own read
        outcome, and a file that was read and held nothing the kind that admitted it publishes is
        here too. A file that only ships inside a customization's own directory is not: it belongs
        to that customization's row, and its own row above says what happened to it.
      </p>
      <!-- The note explains why a tool filter changes nothing here; it does
           not replace the rows. These files are listed under no tool at all,
           so a filter has nothing to narrow — and the count in the heading
           above would otherwise name rows the body no longer shows, taking
           each file's path and its detail link with them. -->
      <p v-if="filters.effectiveTool.value !== null" class="aci-note">
        A tool filter is applied. No tool recognized these files, so none of them is listed under
        one, and the list below is unchanged.
      </p>
      <UnclassifiedList
        :files="filters.unrecognizedRows.value"
        :diagnostics="snapshot.diagnostics"
      />
    </details>

    <h2>Diagnostics</h2>
    <DiagnosticList :diagnostics="snapshot.diagnostics" />
  </div>
</template>

<style scoped>
/* The kind rail and the rows it selects, side by side: the rail is as wide as
   the longest kind label needs and no wider, and the rows take the rest.
   `align-items: start` is what lets the rail be shorter than the rows and
   stick, rather than being stretched to the panel's height. */
.aci-inventory-page__browse {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
  align-items: start;
  margin-block-start: 1rem;
}

/* The rail stays on screen while the rows scroll past it, so choosing another
   kind never means scrolling back up a long inventory. Its own scrollbar is
   the last resort, for a viewport so short that even the filters do not fit;
   what normally absorbs a rail taller than the viewport is the kind list
   inside it. */
.aci-inventory-page__rail {
  position: sticky;
  top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-block-size: calc(100dvh - 1.5rem);
  overflow-y: auto;
}

/* Everything in the rail keeps its own height, so a short viewport never
   squeezes the filters into an overflowing box. */
.aci-inventory-page__rail > * {
  flex: none;
}

/* The exception, and the reason the rail rarely scrolls: the kind list takes
   the height that is left and scrolls within it. The filters stay on screen
   whatever the viewport, because the control that clears them appears only
   while a filter is applied — a control that arrives already scrolled out of
   the rail is one the reader never learns is there. It keeps a few kinds
   visible rather than collapsing to nothing on a very short viewport; below
   that the rail's own scrollbar takes over. */
.aci-inventory-page__kinds {
  flex: 1 1 auto;
  min-block-size: 6rem;
  overflow-y: auto;
}

/* One column below the two-column threshold: a rail beside the rows would
   leave neither enough width to read, so the kinds and filters go back above
   the rows and stop sticking — a sticky rail on a short viewport is a rail
   that covers the rows it selects. */
@media (width < 48rem) {
  .aci-inventory-page__browse {
    grid-template-columns: minmax(0, 1fr);
  }

  .aci-inventory-page__rail {
    position: static;
    max-block-size: none;
    overflow-y: visible;
  }

  /* Nothing to give way to: the rail is as tall as it needs, above the rows. */
  .aci-inventory-page__kinds {
    min-block-size: 0;
    overflow-y: visible;
  }
}

/* An escaped root label has no break opportunities of its own; without this the
   shell scrolls sideways. It is not a `.aci-path`: the label is a presentation
   of a root, not a path anything can open. */
.aci-inventory-page__display-root {
  font-family: ui-monospace, monospace;
  overflow-wrap: anywhere;
}

/* Drawn as a box of its own, like the panels above it: closed, it is one line
   between the kind panel and the diagnostics, and a border is what says the
   line is a section rather than a stray heading. */
.aci-inventory-page__no-kind {
  border: 1px solid var(--aci-border);
  border-radius: 0.5rem;
  margin: 1rem 0;
  padding: 0.5rem 0.75rem;
}

.aci-inventory-page__no-kind summary {
  cursor: pointer;
}

/* The heading sits inside the summary so the section keeps its place in the
   document outline while the summary stays the one control that opens it. It is
   set inline at panel-heading size: as a block it would wrap under the
   disclosure marker and draw its own margins inside the summary. */
.aci-inventory-page__no-kind-heading {
  display: inline;
  font-size: 1rem;
}

/* The same muted count the kind tabs carry, so the closed line says how many
   files are behind it without the reader opening it. */
.aci-inventory-page__no-kind-count {
  color: var(--aci-muted);
  font-variant-numeric: tabular-nums;
  margin-left: 0.4rem;
}
</style>
