// Everything the reader has narrowed the inventory to, held in one place and
// reached through provide/inject (T070, T1154, FR-006).
//
// Two surfaces ask this question and neither is the other's parent: the search
// field is in the shell's bar, which every route renders, and the Source, tool,
// and kind controls are the inventory route's. A prop cannot cross that, so the
// state is provided once by the shell and injected by both — the same wiring
// the session itself uses (`composables/session-view-state.ts`).
//
// One writer per value is what keeps them from racing. This module holds the
// values; the inventory route mirrors them to and from the URL, which is what
// keeps the narrowing navigable — the browser's Back, a reload, and a pasted
// link all render the list that was being read. The bar only sets the search
// text, and asks the router for the inventory when the reader is somewhere
// else. Were both surfaces to write the query, a `router.replace` spreading
// the current query would be reading a snapshot the other writer may already
// have replaced, and a reader who clears the filters and immediately types
// would lose one of the two.
//
// Provided by `App.vue` rather than kept in a module-level ref: a module ref
// is one value for the whole document, which is what the shell already is, but
// it is reachable from anywhere and owned by nothing — the loud inject failure
// below is what says which component is responsible for creating it, and it is
// what lets a test render a surface against a state it constructed itself.
import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import {
  NON_KIND_SELECTION_ORDER,
  type InventorySelection,
  type NonKindSelection,
} from '../components/inventory/rail-selection';
import {
  isCustomizationKind,
  isSupportedTool,
  type CustomizationKind,
  type SupportedTool,
} from '../../shared/entities';
import type { SourceKind } from '../../shared/api-types';

/**
 * The parameter each narrowing value rides in. Written once here because five
 * places used to spell the same four names — the write, the two strips, the
 * read-back, and the test for whether a history entry carries any of them — and
 * a name added to one of them and not the others is a narrowing that writes but
 * never comes back.
 */
const QUERY_KEYS = {
  /** {@link InventoryFilterState.source}. */
  source: 'source',
  /** {@link InventoryFilterState.tool}. */
  tool: 'tool',
  /** {@link InventoryFilterState.searchQuery}. */
  searchQuery: 'q',
  /** {@link InventoryFilterState.selection}. */
  selection: 'kind',
} as const;

/**
 * The rail entry a query names, or null for anything the closed catalogs do
 * not. The URL is presentation state, never a locator: an unknown value simply
 * leaves the default entry in view.
 *
 * One parameter for both halves of the union, because both answer the same
 * question — which panel is beside the rail — and a second parameter would let
 * a link name two.
 */
function selectionFromQuery(value: unknown): InventorySelection | null {
  if (isCustomizationKind(value)) {
    return value;
  }
  for (const candidate of NON_KIND_SELECTION_ORDER) {
    if (value === candidate) {
      return candidate;
    }
  }
  return null;
}

/**
 * The Source family a query names, or null for anything the label table does
 * not — the same rule as {@link selectionFromQuery}, for the same reason. The
 * Source's launch-stable selector is what rides in the URL rather than a Source
 * ID: an ID belongs to one launch, so a kept link would name nothing after the
 * next one (`detail-route.ts` § sourceSelectorOf).
 */
function sourceFromQuery(value: unknown): SourceKind | null {
  return value === 'repository' || value === 'global' ? value : null;
}

/**
 * The tool a query names, or null for anything the closed catalog does not —
 * the same rule as {@link selectionFromQuery}, for the same reason.
 */
function toolFromQuery(value: unknown): SupportedTool | null {
  return isSupportedTool(value) ? value : null;
}

/**
 * The text a query parameter carries, or the empty string when it is absent,
 * empty, or repeated. None of the three is a selection the controls can make,
 * and empty is the neutral value an absent parameter means.
 */
function textFromQuery(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * What the reader has narrowed the inventory to: the four values the controls
 * set, and the two the selection decides between. Every decision about what
 * they narrow is the filter view's (`composables/filters.ts`); this is where
 * the values are kept, and it satisfies that composable's own
 * `InventoryFilterSelection` so the view is derived straight from it.
 *
 * A class whose constructor is the one place the values come into being
 * (AGENTS.md § Class and interface policy).
 */
export class InventoryFilterState {
  /**
   * Selected Source family, or null for every Source (FR-006). The family
   * rather than one option per Source: a per-member option asks what the tool
   * filter beside it already answers.
   */
  public readonly source: Ref<SourceKind | null>;

  /** Selected recognizing tool, or null for every tool. */
  public readonly tool: Ref<SupportedTool | null>;

  /**
   * The rail entry in view: a kind, the panel that is no kind's inventory, or
   * null before the reader has chosen. Navigation rather than a filter — each
   * entry renders differently, so exactly one is ever in view and there is no
   * "all kinds" state.
   */
  public readonly selection: Ref<InventorySelection | null>;

  /**
   * The one search over names and paths (FR-006): a case-insensitive
   * substring, empty matching everything. One field rather than two because a
   * name and the path carrying it are largely the same characters here — a
   * skill's invocation name is its directory's name — so two fields would
   * return the same rows while asking the reader which to type into.
   *
   * Cleared with the rest of the client's inspection state by the shared purge
   * ({@link clear}): the text is an authored path fragment, so it goes with the
   * session it was typed against (FR-027).
   */
  public readonly searchQuery: Ref<string>;

  /**
   * The kind the filters narrow, which is the selection only while the
   * selection is one. No kind is in view on the list that is no kind's
   * inventory, so nothing there narrows by kind.
   */
  public readonly kind: ComputedRef<CustomizationKind | null>;

  /**
   * The selection when it is the non-kind panel, else null. The
   * closed-catalog predicate is what narrows: excluding every kind from the
   * union leaves exactly that panel, so nothing here asserts a type
   * (AGENTS.md § Class and interface policy).
   */
  public readonly nonKindSelection: ComputedRef<NonKindSelection | null>;

  /**
   * The four parameters as the router takes them, each `undefined` at its
   * neutral value so an unnarrowed inventory carries no query of its own.
   * Spread over the route's other parameters by whichever surface writes them.
   */
  public readonly query: ComputedRef<LocationQueryRaw>;

  /** Starts every value at the neutral one, which is the unnarrowed inventory. */
  public constructor() {
    this.source = ref<SourceKind | null>(null);
    this.tool = ref<SupportedTool | null>(null);
    this.selection = ref<InventorySelection | null>(null);
    this.searchQuery = ref('');
    this.kind = computed<CustomizationKind | null>(() =>
      this.selection.value !== null && isCustomizationKind(this.selection.value)
        ? this.selection.value
        : null,
    );
    this.nonKindSelection = computed<NonKindSelection | null>(() =>
      this.selection.value === null || isCustomizationKind(this.selection.value)
        ? null
        : this.selection.value,
    );
    this.query = computed<LocationQueryRaw>(() => ({
      [QUERY_KEYS.source]: this.source.value ?? undefined,
      [QUERY_KEYS.tool]: this.tool.value ?? undefined,
      [QUERY_KEYS.searchQuery]: this.searchQuery.value === '' ? undefined : this.searchQuery.value,
      [QUERY_KEYS.selection]: this.selection.value ?? undefined,
    }));
  }

  /**
   * Takes the narrowing a route query names, its absence included: a link to
   * the unfiltered inventory is a link to the unfiltered inventory, so a
   * parameter that is not there sets its value back to neutral rather than
   * leaving what the reader last chose.
   */
  public adopt(query: LocationQuery): void {
    this.source.value = sourceFromQuery(query[QUERY_KEYS.source]);
    this.tool.value = toolFromQuery(query[QUERY_KEYS.tool]);
    this.searchQuery.value = textFromQuery(query[QUERY_KEYS.searchQuery]);
    this.selection.value = selectionFromQuery(query[QUERY_KEYS.selection]);
  }

  /**
   * Whether a route query carries any of the four, whatever their values.
   * The question a history entry is asked before its narrowing is dropped: an
   * entry naming none of them has nothing to drop (`pages/index.vue`).
   */
  public namedIn(query: LocationQuery): boolean {
    return Object.values(QUERY_KEYS).some((key) => query[key] !== undefined);
  }

  /**
   * Returns every value to the unnarrowed inventory, which the shared
   * client-data purge registers as one of its owners (`App.vue`).
   *
   * Registered there rather than cleared where the inventory unmounts, because
   * the narrowing outlives that page: the bar keeps the search text while the
   * reader is on a Source surface, and a purge that arrived while the inventory
   * was not mounted would otherwise leave an authored path fragment from the
   * purged session in a control the next session renders (FR-027).
   */
  public clear(): void {
    this.source.value = null;
    this.tool.value = null;
    this.selection.value = null;
    this.searchQuery.value = '';
  }
}

/**
 * The four parameters as `undefined`, for a surface stripping this narrowing
 * out of a route query it is otherwise keeping. A literal rather than
 * {@link InventoryFilterState.query} read after a {@link
 * InventoryFilterState.clear}, because a strip happens on a history entry whose
 * narrowing is not the state's current one — the entry is being left, not
 * rewritten.
 */
export const CLEARED_INVENTORY_QUERY: LocationQueryRaw = {
  [QUERY_KEYS.source]: undefined,
  [QUERY_KEYS.tool]: undefined,
  [QUERY_KEYS.searchQuery]: undefined,
  [QUERY_KEYS.selection]: undefined,
};

/**
 * How the shell hands the inventory's narrowing to the surfaces that read it.
 * Keyed by a symbol rather than a string so nothing else can supply it by
 * accident.
 */
export const INVENTORY_FILTER_STATE: InjectionKey<InventoryFilterState> =
  Symbol('inventory-filter-state');

/**
 * Creates the one narrowing state and provides it to everything the shell
 * renders, returning it so the shell can bind its own search field to it.
 * Called by `App.vue` before any route renders.
 */
export function provideInventoryFilterState(): InventoryFilterState {
  const state = new InventoryFilterState();
  provide(INVENTORY_FILTER_STATE, state);
  return state;
}

/**
 * The narrowing state the shell provides. The shell always provides it before
 * rendering a route, so its absence is a wiring bug: failing loudly here beats
 * rendering a control that narrows nothing.
 */
export function useInventoryFilterState(): InventoryFilterState {
  const state = inject(INVENTORY_FILTER_STATE);
  if (state === undefined) {
    throw new Error('the inventory filter state was not provided by the shell');
  }
  return state;
}
