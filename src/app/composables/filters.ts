// Inventory filtering for the Repository header (T070). This is a genuine Vue
// composable — it derives computed views from reactive inputs — which is why it
// lives here rather than beside the plain session factories in
// `src/app/session/`.
//
// The filter fields belong to the caller. A page declares them as its own
// `ref`s and binds them with `v-model` directly, so this module writes nothing:
// its whole surface is read-only derivation. Resetting the fields is the
// caller's business — the neutral values already live in its `ref`
// initializers, so a `clear` here would only duplicate them.
//
// A row's unit is decided by its kind, not by the file (data-model.md
// § Inventory unit), so each kind's rows are derived separately from that
// kind's own inventory and no shared row type is imposed on all of them. A
// filter is applied to whatever identifies that kind's row: for a skill, the
// definitions behind one declared name.
//
// A selection the current commit no longer offers is simply not applied, rather
// than cleared. That keeps FR-030 exact — a failed rescan cannot discard the
// user's work, because nothing is ever written — and it makes the filter
// reapply on its own if a later commit offers the value again, which erasing it
// could not do.
//
// Filtering is a view over the committed snapshot and never a request: no
// filter value reaches the host, and no filter can widen what was scanned.
import { computed, type ComputedRef, type Ref } from 'vue';
import type {
  CustomizationFileSummaryDto,
  SessionSnapshot,
  SkillInventoryEntryDto,
  SourceDto,
} from '../../shared/api-types';
import {
  CUSTOMIZATION_KIND_ORDER,
  SUPPORTED_TOOL_ORDER,
  type CustomizationKind,
  type SupportedTool,
} from '../../shared/entities';

/**
 * The filter fields the caller owns. They are passed in rather than returned so
 * a page can declare them as its own `ref`s and bind them with `v-model`
 * directly, and so the composable's own surface is derivation only.
 */
export interface InventoryFilterSelection {
  /** Selected Source, or null for every Source. */
  readonly sourceId: Ref<string | null>;
  /** Selected recognizing tool, or null for every tool. */
  readonly tool: Ref<SupportedTool | null>;
  /**
   * The kind tab the user chose, or null before they have chosen one. Kind is
   * navigation rather than a filter: each kind renders differently, so exactly
   * one is ever in view and there is no "all kinds" state.
   */
  readonly kind: Ref<CustomizationKind | null>;
  /** Case-insensitive Source-relative-path substring; empty matches every path. */
  readonly pathQuery: Ref<string>;
}

/** What the selection derives from the committed snapshot. */
export interface InventoryFilterView {
  /** The Sources the current generation published, in snapshot order. */
  readonly availableSources: ComputedRef<readonly SourceDto[]>;
  /**
   * Every published file by ID. A kind's row names its files by `fileId` and
   * repeats none of their facts, so this is what resolves one back to its path.
   * It is derived here because the rows derived here are what need it.
   */
  readonly filesById: ComputedRef<ReadonlyMap<string, CustomizationFileSummaryDto>>;
  /** The tools the current inventory actually recognizes, in the closed tool order. */
  readonly availableTools: ComputedRef<readonly SupportedTool[]>;
  /** The kinds the current inventory actually recognizes, in the closed kind order. */
  readonly availableKinds: ComputedRef<readonly CustomizationKind[]>;
  /**
   * The kind actually in view: the user's choice while it is still offered, and
   * otherwise the first available one. Derived rather than written back, so a
   * choice survives a commit that temporarily drops it.
   */
  readonly activeKind: ComputedRef<CustomizationKind | null>;
  /**
   * How many rows each available kind would show, with every other filter
   * applied but not the kind itself — otherwise each tab but the active one
   * would read zero.
   */
  readonly kindCounts: ComputedRef<ReadonlyMap<CustomizationKind, number>>;
  /**
   * The skill rows that pass every active filter, in snapshot order. A row is
   * one declared name; a filter keeps the definitions it matches and drops a
   * row only when none is left, so a narrowed row states what still matches
   * rather than everything the name has.
   */
  readonly skillRows: ComputedRef<readonly SkillInventoryEntryDto[]>;
  /**
   * Files that pass the filters but appear in no kind's inventory, in snapshot
   * order — a file whose bytes were never accepted has no kind, so no kind tab
   * can show it. They are listed apart rather than dropped: these are exactly
   * the rows carrying a file-confined diagnostic (FR-028), and a scan that says
   * "partial" has to be able to say which file.
   */
  readonly unrecognizedRows: ComputedRef<readonly CustomizationFileSummaryDto[]>;
  /**
   * True while a filter narrows the inventory — drives the "clear" affordance.
   * The kind tab is not a filter and never counts here: clearing the filters
   * must not navigate the user off the kind they are looking at.
   */
  readonly isNarrowed: ComputedRef<boolean>;
}

/**
 * Derives the inventory views from a reactive session snapshot and the
 * caller's filter fields. Construction performs no I/O and issues no request.
 */
export function useInventoryFilters(
  snapshot: Ref<SessionSnapshot | null>,
  selection: InventoryFilterSelection,
): InventoryFilterView {
  const { sourceId, tool, kind, pathQuery } = selection;

  const availableSources = computed(() => snapshot.value?.sources ?? []);
  const filesById = computed(
    () => new Map((snapshot.value?.files ?? []).map((file) => [file.fileId, file])),
  );

  const availableTools = computed(() => {
    const present = new Set(
      (snapshot.value?.skills ?? []).flatMap((entry) =>
        entry.definitions.flatMap((definition) => definition.tools),
      ),
    );
    return SUPPORTED_TOOL_ORDER.filter((candidate) => present.has(candidate));
  });
  const availableKinds = computed(() => {
    // One entry per kind whose inventory the snapshot publishes; a kind appears
    // only once its recognizer phase ships an inventory of its own.
    const present = new Set<CustomizationKind>(
      (snapshot.value?.skills ?? []).length > 0 ? ['skill'] : [],
    );
    return CUSTOMIZATION_KIND_ORDER.filter((candidate) => present.has(candidate));
  });

  // Only a selection the current inventory actually offers is applied. The rows
  // and `isNarrowed` read these rather than the raw fields, so the view never
  // claims to be narrowed by an option the user cannot see.
  const effectiveSourceId = computed(() =>
    sourceId.value !== null &&
    availableSources.value.some((source) => source.sourceId === sourceId.value)
      ? sourceId.value
      : null,
  );
  const effectiveTool = computed(() =>
    tool.value !== null && availableTools.value.includes(tool.value) ? tool.value : null,
  );
  // The kind in view: the chosen tab while it is still offered, otherwise the
  // first available one so the page always shows something rather than an
  // apologetic blank. Falling back instead of writing means the user's choice
  // comes back on its own when a later commit offers that kind again.
  const activeKind = computed<CustomizationKind | null>(() => {
    if (kind.value !== null && availableKinds.value.includes(kind.value)) {
      return kind.value;
    }
    return availableKinds.value[0] ?? null;
  });

  /**
   * The trimmed, case-folded path query; empty matches every path. Folding is
   * `toLowerCase`, not the locale-aware form: a Source-relative Path is not
   * locale text, and in a Turkish locale `I` folds to a dotless `ı`, so an ASCII
   * path would stop matching the ASCII the user typed.
   *
   * Normalized to NFC first, because published paths are (FR-024). A macOS
   * path pasted in NFD is the same path the list shows, and without this it
   * would match nothing.
   */
  const query = computed(() => pathQuery.value.normalize('NFC').trim().toLowerCase());

  /** Whether a published file passes the Source and path filters. */
  function fileMatches(fileId: string): boolean {
    const file = filesById.value.get(fileId);
    if (file === undefined) {
      return false;
    }
    if (effectiveSourceId.value !== null && file.sourceId !== effectiveSourceId.value) {
      return false;
    }
    return query.value === '' || file.sourceRelativePath.toLowerCase().includes(query.value);
  }

  /**
   * The skill entries that survive every filter, each reduced to the
   * definitions that matched. A name with no matching definition is not a row:
   * showing it would claim a match the inventory does not have.
   */
  const skillRows = computed<readonly SkillInventoryEntryDto[]>(() =>
    (snapshot.value?.skills ?? []).flatMap((entry) => {
      const definitions = entry.definitions.filter(
        (definition) =>
          fileMatches(definition.fileId) &&
          (effectiveTool.value === null || definition.tools.includes(effectiveTool.value)),
      );
      if (definitions.length === 0) {
        return [];
      }
      // A narrowed row resolves nothing: the resolution statement describes the
      // definitions actually shown, so one surviving definition states none.
      return [
        {
          ...entry,
          definitions,
          sameNameResolutions: definitions.length > 1 ? entry.sameNameResolutions : [],
        },
      ];
    }),
  );

  const kindCounts = computed(() => {
    const counts = new Map<CustomizationKind, number>();
    for (const candidate of availableKinds.value) {
      // Every kind's count is that kind's own row count with the other filters
      // applied, which is what selecting the tab would show.
      counts.set(candidate, candidate === 'skill' ? skillRows.value.length : 0);
    }
    return counts as ReadonlyMap<CustomizationKind, number>;
  });

  const unrecognizedRows = computed(() => {
    // The union of every kind's inventory, which is one kind so far. A kind
    // shipping its own inventory adds itself here, or its files would be
    // reported as unrecognized while its own tab lists them.
    const recognized = new Set(
      (snapshot.value?.skills ?? []).flatMap((entry) =>
        entry.definitions.map((definition) => definition.fileId),
      ),
    );
    return (snapshot.value?.files ?? []).filter(
      (file) =>
        !recognized.has(file.fileId) &&
        fileMatches(file.fileId) &&
        // A file in no kind's inventory was recognized by no product, so no
        // tool selection can match it. Showing it under one would contradict
        // the filter the user set.
        effectiveTool.value === null,
    );
  });

  const isNarrowed = computed(
    () => effectiveSourceId.value !== null || effectiveTool.value !== null || query.value !== '',
  );

  return {
    availableSources,
    filesById,
    availableTools,
    availableKinds,
    activeKind,
    kindCounts,
    skillRows,
    unrecognizedRows,
    isNarrowed,
  };
}
