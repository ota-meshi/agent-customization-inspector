<script setup lang="ts">
// The inventory route (T071, reworked by T1153). It renders the committed
// generation and starts at the list: the rail, the two filters, and the rows
// of whichever entry the rail has selected.
//
// It states no Source's root, status, or generation. Those are facts about a
// Source rather than an inventory of files, so each Source family has a
// surface of its own — `pages/repository.vue` and `pages/global-consent.vue` —
// and the rail states each family's status beside the way there, so a reader
// still learns from this page that a scan came back partial (FR-002, FR-030).
// A panel here would have spent the top of every visit on values that answer a
// question asked once, and the personal-setup panel duplicated the consent
// page outright.
//
// `Files in no kind` and `Diagnostics` are rail entries rather than sections
// appended below the rows. Both are lists of files, which is the whole test for
// what belongs in the rail; as sections they sat past sixty rows of whatever
// kind was in view, and moved every time the reader changed kinds.
//
// The session view state is injected rather than created: the shell owns the
// one RPC connection and the one adopted snapshot, and a second view state
// would race the first for the same request tokens.
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import type { SourceKind } from '../../shared/api-types';
import { GLOBAL_MEMBER_TEXT } from '../../shared/api-text';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import DiagnosticList from '../components/diagnostics/DiagnosticList.vue';
import InventoryFilters from '../components/inventory/InventoryFilters.vue';
import InventoryRail from '../components/inventory/InventoryRail.vue';
import InventoryList from '../components/inventory/InventoryList.vue';
import ToolLegend from '../components/inventory/ToolLegend.vue';
import UnclassifiedList from '../components/inventory/UnclassifiedList.vue';
import { useSessionViewState } from '../composables/session-view-state';
import { recordInventoryReturnPoint } from '../router.options';
import { useInventoryFilters } from '../composables/filters';
import {
  INVENTORY_SELECTION_TEXT,
  INVENTORY_SELECTION_UNIT_TEXT,
  type InventorySelection,
} from '../components/inventory/rail-selection';
import { inventoryPanelId } from '../components/inventory/panel-ids';
import {
  CLEARED_INVENTORY_QUERY,
  useInventoryFilterState,
} from '../composables/inventory-filter-state';
import {
  SOURCE_STATUS_TEXT,
  type CustomizationKind,
  type SupportedTool,
} from '../../shared/entities';

const sessionViewState = useSessionViewState();

const snapshot = sessionViewState.snapshot;

const route = useRoute();
const router = useRouter();

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
// The narrowing the shell provides, which the bar's search field writes into
// as well (`composables/inventory-filter-state.ts`). This route is the only
// writer of the query the four values ride in, which is what keeps the two
// surfaces from racing over one URL.
const inventoryFilters = useInventoryFilterState();
const {
  source: sourceFilter,
  tool,
  selection,
  searchQuery,
  kind,
  nonKindSelection,
} = inventoryFilters;

// The URL decides on every arrival, its absence included: a link back to the
// unfiltered inventory is a link to the unfiltered inventory, and the bar's
// field follows because it reads the same value. A search typed on another
// route reaches this page in the query it was pushed with, so nothing is lost
// by letting the URL win here. The narrowing outlives this page now that the
// shell holds it, so arriving adopts the query rather than declaring the
// values: what the reader last narrowed to is not what a fresh link asks for.
inventoryFilters.adopt(route.query);

/** Whether this history entry's filters predate the last purge. */
function queryPredatesPurge(): boolean {
  if (!inventoryFilters.namedIn(route.query)) {
    return false;
  }
  const state = window.history.state as { aciFilterGeneration?: unknown } | null;
  // An entry carrying no stamp is a fresh arrival — a typed or shared URL —
  // whose filters are the reader's own ask; the selection watcher stamps it on
  // the first write. A stamp this page load never issued belongs to an earlier
  // load, which a reload is, and is likewise the reader's own ask. Only a
  // stamp this load issued and then replaced marks an entry the purge left
  // behind.
  if (state === null) {
    return false;
  }
  return sessionViewState.filterGenerationPredatesPurge(state.aciFilterGeneration);
}

/** Strips a pre-purge entry's filters, restamping it in the current generation. */
function dropPrePurgeQuery(): void {
  void router.replace({
    query: { ...route.query, ...CLEARED_INVENTORY_QUERY },
    state: { aciFilterGeneration: sessionViewState.filterGeneration() },
  });
}

watch(inventoryFilters.query, (query) => {
  void router.replace({
    query: { ...route.query, ...query },
    state: { aciFilterGeneration: sessionViewState.filterGeneration() },
  });
});

if (queryPredatesPurge()) {
  // Mounted straight onto a pre-purge entry — Back into a page the purge had
  // already unmounted: the narrowing goes the same way the unmount path below
  // sends it. Every other arrival is left as it is: a stamp this load never
  // issued is already read as pre-purge once a purge has happened, so there
  // is nothing an arrival could restamp that would change a later answer.
  dropPrePurgeQuery();
}

onBeforeUnmount(() => {
  // A purge unmounts this page by moving the view off `inspection` — the
  // shell renders it only there — and the filter query is that purged view's
  // client state: the path text is an authored path fragment (FR-027), and
  // the recovery contract starts the next inventory at the default filters
  // (data-model.md § RecoveryViewState), so the parameters go with the view.
  // An ordinary navigation keeps them — the view is still `inspection`, and
  // returning restores the reader's narrowing.
  if (sessionViewState.view.value !== 'inspection') {
    void router.replace({ query: { ...route.query, ...CLEARED_INVENTORY_QUERY } });
  }
});

// The reverse half of the synchronization above: this page can be re-entered
// at another of its own history entries without a mount — a detail page's
// back link wrote the unfiltered entry, and the browser's history menu jumps
// straight to the narrowed one — and such a step changes only `route.query`.
// Without reading it back, the URL would show the narrowed list while the
// controls and the rows stayed on whatever this mount initialized from.
// Guarded to this page's own route: the leave to a detail route also changes
// the query, and syncing from it would first blank the selections and then
// write them over the destination's own query through the watcher above.
watch(
  () => route.fullPath,
  () => {
    if (route.path !== '/') {
      return;
    }
    if (queryPredatesPurge()) {
      // Back onto an entry written before the purge: the recovery contract
      // starts this inventory at the defaults, so the stale narrowing is
      // dropped rather than synchronized (the replace re-runs this watcher).
      dropPrePurgeQuery();
      return;
    }
    inventoryFilters.adopt(route.query);
  },
);

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

/**
 * How many rows the entry in view holds, and what they are in that entry's own
 * unit (`rail-selection.ts` § INVENTORY_SELECTION_UNIT_TEXT) — or null where
 * there is no entry, which is a generation that recognized no kind at all.
 *
 * Null rather than a stand-in: counting one entry while the heading names
 * another is what a fallback did here, and a session with one source-level
 * diagnostic then read "Customization files · 1 diagnostic" over a list saying
 * no customization file was recognized.
 */
/**
 * The unit the entry in view counts its rows by, for the filter row's own
 * announcement — the same table the heading's count reads, so the sentence a
 * reader hears and the words beside it cannot part. `files` where there is no
 * entry, which is a generation that recognized no kind and lists nothing.
 */
const selectionUnit = computed(() =>
  activeSelection.value === null
    ? { one: 'file', many: 'files' }
    : INVENTORY_SELECTION_UNIT_TEXT[activeSelection.value],
);

const selectionSummary = computed<{ readonly count: number; readonly unit: string } | null>(() => {
  const selection = activeSelection.value;
  if (selection === null) {
    return null;
  }
  const count = railCounts.value.get(selection) ?? 0;
  const unit = INVENTORY_SELECTION_UNIT_TEXT[selection];
  return { count, unit: count === 1 ? unit.one : unit.many };
});

const filters = useInventoryFilters(snapshot, { source: sourceFilter, tool, kind, searchQuery });

// What the two selects display is the selection actually applied, while what
// they write is the raw choice. A generation that no longer publishes the
// selected Source or tool renders no `<option>` for it, so a control bound to
// the raw choice would sit blank while the rows were unfiltered and the "clear
// filters" affordance stayed away — three surfaces disagreeing about one state.
// The write still goes to the raw ref, so the choice comes back on its own when
// a later generation offers that option again, exactly as the kind tab does.
const selectedSource = computed({
  get: () => filters.effectiveSource.value,
  set: (value: SourceKind | null) => {
    sourceFilter.value = value;
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
 * How many rows each rail entry would show: the kind counts the filters
 * already derive, plus the two lists that are no kind's inventory. One map
 * rather than a count per entry, because the rail renders one column of them
 * and a second derivation of the same numbers could disagree with the rows.
 *
 * Both non-kind entries carry the Source narrowing the rows themselves carry,
 * so the number beside an entry is the number of rows behind it.
 */
const railCounts = computed<ReadonlyMap<InventorySelection, number>>(() => {
  const counts = new Map<InventorySelection, number>(filters.kindCounts.value);
  counts.set('files-in-no-kind', filters.unrecognizedRows.value.length);
  counts.set('diagnostics', filters.sourceScopedDiagnostics.value.length);
  return counts;
});

/**
 * The entry in view: the two non-kind panels when one of them is chosen, and
 * otherwise the kind the list is actually rendering.
 *
 * Derived from what is on screen rather than from the raw choice, because the
 * two part company: a commit that takes the last row of the chosen kind away
 * leaves that kind out of `availableKinds`, and the filters fall back to the
 * first kind that is left (`filters.ts` § activeKind). Read from the raw
 * choice, the heading, the count, and the rail's selected entry would then all
 * name a kind whose rows are not the ones below them — and the rail, which
 * renders no tab for a kind that is gone, would mark none of its tabs selected
 * and leave every one of them out of the tab order (WCAG 2.4.3, 4.1.2).
 *
 * The raw choice is still what the URL carries ({@link InventoryFilterState}),
 * so it comes back on its own when a later commit offers that kind again.
 */
const activeSelection = computed<InventorySelection | null>(
  () => nonKindSelection.value ?? filters.activeKind.value,
);

/**
 * How many rows the filters admit in the kind currently in view. It is the
 * count that kind's tab already carries rather than a second derivation of it,
 * and it counts rows rather than files, because a row is what the user sees and
 * a skill row may stand for several files.
 */
const matchCount = computed(() => {
  if (nonKindSelection.value !== null) {
    return railCounts.value.get(nonKindSelection.value) ?? 0;
  }
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
  if (nonKindSelection.value !== null) {
    // The two lists that belong to no kind have their own unnarrowed
    // populations (`filters.ts`), which is what their summary compares the
    // visible rows against.
    return nonKindSelection.value === 'files-in-no-kind'
      ? filters.unrecognizedTotal.value
      : filters.sourceScopedDiagnosticTotal.value;
  }
  const kind = filters.activeKind.value;
  const committed = snapshot.value;
  if (kind === null || committed === null) {
    // No kind in view, or nothing committed yet: the summary has no rows to
    // compare against.
    return 0;
  }
  const totals: Readonly<Record<CustomizationKind, number>> = {
    // The list's items are ranges, not rows: a range the repository and a
    // consented home both govern is one item holding two rows
    // (`filters.ts` § InstructionRangeGroup), so counting rows here would
    // promise more items than the page shows.
    instructions: filters.instructionRangeGroupTotal.value,
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
 * Returns the filter fields to the neutral values the narrowing starts at.
 * The rail selection is not among them: it is the tab in view, and clearing
 * the filters must not navigate the user somewhere else — which is what
 * separates this control from the purge's own reset
 * (`composables/inventory-filter-state.ts` § clear).
 */
function clearFilters(): void {
  sourceFilter.value = null;
  tool.value = null;
  searchQuery.value = '';
}

/** The filter row, which owns where focus settles once a clear has rendered. */
const filterControls = useTemplateRef<InstanceType<typeof InventoryFilters>>('filterControls');

/**
 * Clears from the empty result's own button, which unmounts with the box it
 * sits in: focus then settles where the filter row's own button settles it, so
 * one command does not leave a keyboard user in two places (WCAG 2.4.3).
 */
async function clearFiltersFromEmptyResult(): Promise<void> {
  clearFilters();
  await filterControls.value?.settleOnSummary();
}

/**
 * The consented Global Sources, in the fixed tool order the snapshot publishes
 * them in. Empty until a confirmation's batch commits: an admitted tool whose
 * scan has not finished is a control rather than a Source, so nothing
 * provisional appears here (data-model.md § GlobalEnableOperation).
 */
const globalSources = computed(
  () => snapshot.value?.sources.filter((source) => source.kind === 'global') ?? [],
);

/**
 * The one sentence the panel's live region announces: which tools' personal
 * directories have been read, and how each ended.
 *
 * Named tools rather than a count, because that is what a reader needs to know
 * without looking — and no root, because a root belongs in the labelled field
 * below where it is stated as the escaped presentation it is (FR-002).
 */
const globalSourcesAnnouncement = computed(() =>
  globalSources.value.length === 0
    ? ''
    : `Your personal setup was inspected: ${globalSources.value
        .map(
          (source) =>
            `${source.member === null ? 'Unknown member' : GLOBAL_MEMBER_TEXT[source.member]} ${SOURCE_STATUS_TEXT[
              source.status
            ].toLowerCase()}`,
        )
        .join(', ')}.`,
);
</script>

<template>
  <div v-if="snapshot" class="aci-inventory-page">
    <!-- The consented homes announce their arrival, which is otherwise a
         silent change on this page: the panel that used to state them is the
         personal setup's own surface now, and a reader who is here when a
         confirmation's batch commits would learn nothing (WCAG 4.1.3,
         W3C ARIA22; the same rule the shell's own two regions follow). One
         sentence rather than a list, which read atomically would announce every
         member again on every change. Mounted from the first render with
         nothing in it, because a live region added together with its text is
         not announced. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ globalSourcesAnnouncement }}
    </p>

    <!-- The rail carries what decides which rows are on screen — the entry in
         view, each Source family's status beside the way to its own surface —
         and the rows take the rest of the width, because a row is a path and a
         path is what needs the room. -->
    <div class="aci-inventory-page__browse">
      <div class="aci-inventory-page__rail">
        <!-- The entry list is the part of the rail that gives way when the rail
             is taller than the viewport, which is what keeps the filters below
             it on screen. It is wrapped rather than styled through the
             component, because how tall it may grow is the rail's decision
             rather than the list's. -->
        <div class="aci-inventory-page__entries">
          <InventoryRail
            :kinds="filters.availableKinds.value"
            :active-selection="activeSelection"
            :counts="railCounts"
            :sources="snapshot.sources"
            @select="selection = $event"
          />
        </div>
      </div>

      <!-- `data-aci-inventory-rows` scopes the return-point machinery to row
           links: this holds every row, while the rail beside it is chrome —
           its Source entries leave the inventory entirely, so leaving through
           one records no point and coming back lands at the ordinary top of
           the page (router.options.ts § renderedLinks). -->
      <div class="aci-inventory-page__panel" data-aci-inventory-rows>
        <!-- The list's own heading row: what is in view, how many rows it
             holds, and the selects that narrow it. They are here rather than in
             the rail because what they narrow is the list beside them; the rail
             answers which list is in view at all. The Source select is offered
             on every list, the two that belong to no kind included — a file no
             kind lists still belongs to a Source, and so does a Source-level
             diagnostic. The Tool select is not offered there: no product
             recognized a file in no kind, and a Source-level diagnostic is not
             tied to a product (FR-006). -->
        <div class="aci-inventory-page__head">
          <h2 ref="inventoryHeading" class="aci-inventory-page__title" tabindex="-1">
            {{
              activeSelection === null
                ? 'Customization files'
                : INVENTORY_SELECTION_TEXT[activeSelection]
            }}
          </h2>
          <!-- Counted in the unit the kind's own rows are, not in rows: a row's
               unit is decided by its kind (data-model.md § Inventory unit), so
               `rows` named the container where the rows themselves say `2
               files` about a name (`rail-selection.ts`
               § INVENTORY_SELECTION_UNIT_TEXT). -->
          <span v-if="selectionSummary !== null" class="aci-inventory-page__count"
            >{{ selectionSummary.count }} {{ selectionSummary.unit }}</span
          >
          <InventoryFilters
            ref="filterControls"
            v-model:source="selectedSource"
            v-model:tool="selectedTool"
            :available-source-kinds="filters.availableSourceKinds.value"
            :available-tools="nonKindSelection === null ? filters.availableTools.value : []"
            :match-count="matchCount"
            :total-count="totalRowCount"
            :unit="selectionUnit"
            :narrowed="filters.isNarrowed.value"
            @clear="clearFilters"
          />
        </div>

        <!-- What each vendor mark names, once for the list rather than on
             every row (`ToolLegend.vue`). Its entries are the products the
             rows on screen actually draw (`filters.ts` § shownTools), not the
             inventory's: a key naming a mark the list does not have reads as a
             mark the reader has not found yet — a rule list carried a Codex
             entry that no rule row shows. An empty list draws no marks and so
             gets no key, which follows from the same derivation rather than
             from a rule of its own. -->
        <ToolLegend v-if="nonKindSelection === null" :tools="filters.shownTools.value" />
        <!-- Files an inspection rule admitted that no kind lists. Its own panel
           rather than a disclosure below the rows: its membership rule is
           absence, so any repository holding one unreadable, binary, or
           nothing-declaring candidate has it, and as a section it sat open
           under whatever kind was being read, on every visit (FR-028). -->
        <section
          v-if="nonKindSelection === 'files-in-no-kind'"
          :id="inventoryPanelId('files-in-no-kind')"
          role="tabpanel"
          :aria-label="INVENTORY_SELECTION_TEXT['files-in-no-kind']"
        >
          <p class="aci-note">
            Files an inspection rule admitted that no kind lists. Each row states its own read
            outcome, and a file that was read and held nothing the kind that admitted it publishes
            is here too. A file that only ships inside a customization's own directory is not: it
            belongs to that customization's row, and its own row above says what happened to it.
          </p>
          <UnclassifiedList
            :files="filters.unrecognizedRows.value"
            :diagnostics="snapshot.diagnostics"
          />
        </section>

        <!-- Diagnostics that belong to a Source rather than to one of its files.
           A file's own diagnostic is stated on that file's row, which is where
           a reader meets the file it is about (FR-028). -->
        <section
          v-else-if="nonKindSelection === 'diagnostics'"
          :id="inventoryPanelId('diagnostics')"
          role="tabpanel"
          :aria-label="INVENTORY_SELECTION_TEXT.diagnostics"
        >
          <!-- Only what the heading cannot say. The rail item and this heading
               both name the unit, so a note opening on the same qualifier would
               state it twice on one screen; what is left is the question a
               reader arrives with, having seen a count of zero beside a Source
               that kept diagnostics of its own. `A file's own` draws the
               contrast by itself, so it needs no preface. -->
          <p class="aci-note">A file's own diagnostic is stated on that file's row.</p>
          <DiagnosticList
            :diagnostics="filters.sourceScopedDiagnostics.value"
            :sources="snapshot.sources"
          />
        </section>

        <InventoryList
          v-else
          :narrowed="filters.isNarrowed.value"
          :kind="filters.activeKind.value"
          :instruction-range-groups="filters.instructionRangeGroups.value"
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
          :files-by-source="filters.filesBySource.value"
          :total-count="totalRowCount"
          :diagnostics="snapshot.diagnostics"
          @clear="clearFiltersFromEmptyResult"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The rail and the panel it selects, side by side: the rail is as wide as the
   longest entry label needs and no wider, and the rows take the rest. The
   columns stretch to the taller of them, which is what gives the rail's
   surface the height of the list beside it; what stays on screen while that
   list scrolls is the entries inside it, not the surface. */
.aci-inventory-page__browse {
  display: grid;
  /* No gap: the rail's own trailing edge is what separates the two, and the
     space after it belongs to the panel's padding — a gap would set the line
     adrift in the middle of it. */
  gap: 0;
  grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
  /* Flush against the bar: the rail's surface continues the bar's, so ground
     between them would cut one panel into two. What the rail needs above its
     first entry is its own top padding, which is drawn whether or not the page
     is scrolled. */
  margin-block-start: 0;
}

/* The rail stays on screen while the rows scroll past it, so choosing another
   kind never means scrolling back up a long inventory. Its own scrollbar is
   the last resort, for a viewport so short that even the filters do not fit;
   what normally absorbs a rail taller than the viewport is the kind list
   inside it. */
/* The rail's surface, which is the whole column beside the rows: the grid
   stretches it, so the panel that continues the bar's runs to the foot of the
   list rather than stopping where the entries happen to end — a surface that
   stopped there would read as a sidebar cut off half way down. Its horizontal
   padding lives on the entries instead, so a selected one is a full-width band,
   which an inset item with a leading edge could not be. */
.aci-inventory-page__rail {
  background: var(--aci-surface-raised);
  border-inline-end: 1px solid var(--aci-line);
}

/* The entries are what sticks, inside that surface. Splitting the two is what
   lets the panel be as tall as the rows while the list stays on screen: one
   element cannot both stretch to the grid's height and stop at the viewport's.
   It sticks just below the bar, which sticks to the top of the document itself
   (`App.vue`) — a list that stopped at the viewport's top would slide under the
   bar and lose its first entries — and scrolls within its own height when the
   kinds outrun the viewport. */
.aci-inventory-page__entries {
  max-block-size: calc(100dvh - var(--aci-sticky-bar));
  overflow-y: auto;
  padding-block: 0.75rem;
  position: sticky;
  top: var(--aci-sticky-bar);
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
    /* Above the rows rather than beside them, so the edge that separated the
       two columns becomes the line under the rail. */
    border-block-end: 1px solid var(--aci-line);
    border-inline-end: 0;
  }

  .aci-inventory-page__panel {
    padding-inline-start: 1.25rem;
  }

  /* Nothing to stick to and nothing to give way to: the rail is as tall as it
     needs, above the rows. */
  .aci-inventory-page__entries {
    max-block-size: none;
    overflow-y: visible;
    position: static;
  }
}

/* The column beside the rail, whichever entry is selected. `min-width: 0` is
   what lets a path with no break opportunities wrap inside it rather than
   widening the grid track (WCAG 1.4.10). */
/* The column beside the rail carries the inset `.aci-route` gives every other
   surface (main.css), because this page takes none: the space after the rail's
   edge is this column's rather than a grid gap — a gap would put the line in
   the middle of the space instead of at its start — and the space under the
   bar is this column's too, where the rail wants none. */
.aci-inventory-page__panel {
  min-width: 0;
  /* The bottom space is this column's rather than the shell's: inside the grid
     row it stretches the rail's column with it, so the sticky list's
     containing block grows too. Below the shell it would be space the document
     scrolls through with the rail already held at its end (`App.vue`
     § .aci-app). */
  padding: 0.75rem 1.25rem 2rem 1rem;
}

/* What is in view at the start of the row, and the controls that narrow it at
   the end. Baseline-aligned so the title, the count, and the selects sit on
   one line, and wrapping so a narrow viewport drops the controls under the
   title rather than scrolling the page sideways (WCAG 1.4.10). */
.aci-inventory-page__head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  margin-block-end: 0.5rem;
}

.aci-inventory-page__title {
  font-size: 0.9375rem;
  margin: 0;
}

/* The heading takes programmatic focus when a snapshot swap leaves focus on the
   body, so its ring is explicit rather than dependent on a browser's
   :focus-visible heuristic. */
.aci-inventory-page__title:focus {
  outline: 2px solid var(--aci-accent);
  outline-offset: 2px;
}

.aci-inventory-page__count {
  color: var(--aci-muted);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
</style>
