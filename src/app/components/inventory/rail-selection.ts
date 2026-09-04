// What the inventory rail can put in the main panel (T1152, FR-030).
//
// The rail lists three groups, and only two of them select a panel. The Source
// families at the top are routes — a Source's own state is a surface of its
// own, not a list of files — while everything below them selects what the
// panel beside the rail shows: one of the closed customization kinds, or the
// files no kind lists.
//
// Membership follows one test. A list of files is a rail entry, whatever its
// heading; a Source's state is a route. That is what puts `Files in no kind`
// here rather than below the inventory, where it used to sit behind a
// disclosure and a heading a reader reached by scrolling past sixty rows — and
// what kept a Source's own diagnostics out: they list no file, they are a
// Source's state, and each Source's own surface is where they are stated.
import { CUSTOMIZATION_KIND_TEXT, type CustomizationKind } from '../../../shared/entities';

/**
 * The panel the rail selects that is not a customization kind. Kept as its own
 * union rather than widened into `CustomizationKind`: it is not a kind a rule
 * recognizes, and a kind catalog that named it would be a second copy of the
 * shipped catalog with an extra member (data-model.md § Inventory unit). One
 * member today, and a union because what it is stays true of it: a later list
 * that is no kind's inventory joins it here.
 */
export type NonKindSelection =
  /** Files an inspection rule admitted that no kind tab lists. */
  'files-in-no-kind';

/** Everything the rail can put in the panel: a recognized kind, or the one list that is no kind's. */
export type InventorySelection = CustomizationKind | NonKindSelection;

/**
 * The closed presentation order of {@link NonKindSelection}, which is also the
 * order the rail renders it in.
 *
 * Typed as a non-empty tuple, because the inventory's default selection is its
 * first entry: a generation that recognized no kind still has this one, so
 * there is always an entry to select (`pages/index.vue` § activeSelection).
 */
export const NON_KIND_SELECTION_ORDER: readonly [NonKindSelection, ...NonKindSelection[]] = [
  'files-in-no-kind',
];

/**
 * What each rail entry is called. One table over the whole union rather than
 * one per group: a member added to either half cannot compile without its
 * label, and no caller has to ask which half a selection came from to find its
 * text (AGENTS.md § User-visible copy policy).
 */
/**
 * What one row of each rail entry is, singular and plural, for the heading that
 * counts them. A row's unit is decided by its kind rather than by the file it
 * was found in (data-model.md § Inventory unit), so a heading counting `rows`
 * named the container instead of the thing: a skill row is one invocation name
 * and a hook row is one declared event, and neither is a row to the reader
 * looking at it.
 *
 * One table over the whole union, for the reason {@link INVENTORY_SELECTION_TEXT}
 * is one (AGENTS.md § User-visible copy policy).
 */
export const INVENTORY_SELECTION_UNIT_TEXT: Readonly<
  Record<InventorySelection, { readonly one: string; readonly many: string }>
> = {
  /** One applicability range, however many files it governs. */
  instructions: { one: 'applicability range', many: 'applicability ranges' },
  /** One invocation name, as one product resolves it. */
  skill: { one: 'name', many: 'names' },
  /** One declared server name, however many carriers declare it. */
  MCP: { one: 'server', many: 'servers' },
  /** One agent name. */
  agent: { one: 'name', many: 'names' },
  /** One invocation name. */
  'prompt/command': { one: 'name', many: 'names' },
  /** One file: a rule is the file that carries it. */
  rule: { one: 'file', many: 'files' },
  /** One file: a permission policy is the file that carries it. */
  permissions: { one: 'file', many: 'files' },
  /** One declared event, however many carriers declare it. */
  hook: { one: 'event', many: 'events' },
  /** One declared plugin name. */
  plugin: { one: 'plugin', many: 'plugins' },
  /** One output-style definition. */
  'output style': { one: 'definition', many: 'definitions' },
  /** One sibling metadata file. */
  'skill metadata': { one: 'file', many: 'files' },
  /** One file: a settings document is the file that carries it. */
  'settings/config': { one: 'file', many: 'files' },
  /** One file an inspection rule admitted that no kind lists. */
  'files-in-no-kind': { one: 'file', many: 'files' },
};

export const INVENTORY_SELECTION_TEXT: Readonly<Record<InventorySelection, string>> = {
  ...CUSTOMIZATION_KIND_TEXT,
  /** The heading the list of rule-admitted, kind-less files carries. */
  'files-in-no-kind': 'Files in no kind',
};
