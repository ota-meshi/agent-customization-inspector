// Inventory filtering for the Repository header (T070). It derives computed
// views from reactive inputs, which is why it lives here rather than beside
// the session classes in `src/app/session/`: pages reach it through the
// `useInventoryFilters` composable, per Vue idiom, and the derivation itself
// is `InventoryFilterView`'s constructor.
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
// definitions behind one resolved row name.
//
// A selection the current commit no longer offers is simply not applied, rather
// than cleared. That keeps FR-030 exact — a failed rescan cannot discard the
// user's work, because nothing is ever written — and it makes the filter
// reapply on its own if a later commit offers the value again, which erasing it
// could not do.
//
// Filtering is a view over the committed snapshot and never a request: no
// filter value reaches the host, and no filter can widen what was scanned.
import { ApplicabilityRange } from '../components/applicability-range';
import { AuthoredName } from '../components/authored-name';
import { computed, type ComputedRef, type Ref } from 'vue';
import type {
  AgentInventoryEntryDto,
  PromptInventoryEntryDto,
  CustomizationFileSummaryDto,
  InstructionInventoryEntryDto,
  HookInventoryEntryDto,
  McpInventoryEntryDto,
  PermissionsInventoryEntryDto,
  OutputStyleInventoryEntryDto,
  PluginInventoryEntryDto,
  RuleInventoryEntryDto,
  SessionSnapshot,
  SettingsInventoryEntryDto,
  SkillInventoryEntryDto,
  SourceKind,
} from '../../shared/api-types';
import {
  UNNAMED_ROW_TEXT,
  fileIdentityKey,
  CUSTOMIZATION_KIND_ORDER,
  SUPPORTED_TOOL_ORDER,
  pathPresentationLabel,
  type CustomizationKind,
  type SupportedTool,
} from '../../shared/entities';
import { facesSameNameCollision, skillCollisionGates } from '../../shared/skill-collision';

/**
 * The two Source families in the order the filter offers them: the repository
 * a reader launched in, then the personal setup they opted into. Fixed here
 * rather than taken from the snapshot, so the option order does not move when a
 * Global commit lands.
 */
const SOURCE_KIND_ORDER: readonly SourceKind[] = ['repository', 'global'];

/**
 * The filter fields the caller owns. They are passed in rather than returned so
 * a page can declare them as its own `ref`s and bind them with `v-model`
 * directly, and so the composable's own surface is derivation only.
 */
export interface InventoryFilterSelection {
  /**
   * Selected Source family, or null for every Source (FR-006). The family
   * rather than one option per Source: a per-member option asks what the tool
   * filter beside it already answers, and one family is a question with one
   * answer. The selection rides in the inventory's URL as the family's own
   * word, never as a Source ID, which belongs to the launch that minted it.
   */
  readonly source: Ref<SourceKind | null>;
  /** Selected recognizing tool, or null for every tool. */
  readonly tool: Ref<SupportedTool | null>;
  /**
   * The kind tab the user chose, or null before they have chosen one. Kind is
   * navigation rather than a filter: each kind renders differently, so exactly
   * one is ever in view and there is no "all kinds" state.
   */
  readonly kind: Ref<CustomizationKind | null>;
  /**
   * The one search over names and paths (FR-006): a case-insensitive
   * substring, empty matching everything. One field rather than two because a
   * name and the path carrying it are largely the same characters here — a
   * skill's invocation name is its directory's name — so two fields would
   * return the same rows while asking the reader which to type into.
   */
  readonly searchQuery: Ref<string>;
}

/**
 * The instruction rows one applicability range's files are listed under: the
 * rows sharing that range, one per Source that holds files governed by it.
 *
 * A presentation group, not a row unit. A published row is still one range of
 * one Source (data-model.md § Inventory unit) — each states its own Source
 * and carries its own files. What the group adds is that a reader looking for
 * what governs `**` finds one place for it instead of one heading per Source;
 * the family blocks the list item renders come from the shared grouping every
 * sibling row uses (`SourceFamilyBlocks.vue`).
 */
export interface InstructionRangeGroup {
  /**
   * The range every row in the group governs, or null for the group of rows
   * whose files declare none a row can be keyed by (FR-027).
   */
  readonly applicabilityRange: string | null;
  /**
   * The rows governing it, in family-major order — the repository's rows
   * first, then the consented homes' — and within a family in the order the
   * snapshot publishes its Sources, so the shared family grouping renders the
   * repository block first.
   */
  readonly rows: readonly NarrowedInventoryRow<InstructionInventoryEntryDto>[];
  /**
   * Every file identity the group publishes — drawn from the unnarrowed
   * snapshot in the same family-major order, while `rows` above holds what
   * the current narrowing left. The group-level counterpart of
   * {@link NarrowedInventoryRow.rowFileIdentities}, and for the same reason:
   * the per-block comparison entries are derived from these, so a narrowing
   * that drops one home's whole row does not hide the entry to a comparison
   * the block can still make (FR-011).
   */
  readonly fileIdentities: readonly InventoryFileIdentity[];
}

/**
 * One file's identity inside an inventory grouping: the Source that published
 * it and its Source-relative Path (FR-030). What a comparison entry pairs —
 * the instruction blocks' ({@link InstructionRangeGroup.fileIdentities}) and
 * the name-keyed rows' ({@link NarrowedInventoryRow.rowFileIdentities}) alike.
 */
export interface InventoryFileIdentity {
  /** The publishing Source's opaque ID. */
  readonly sourceId: string;
  /** The file's path below that Source's root. */
  readonly sourceRelativePath: string;
}

/**
 * One inventory row as this page renders it: the row the snapshot published,
 * narrowed to the members the active filters matched, plus every file identity
 * the row's own members name — the set no filter narrows.
 *
 * The second is what a row-owned comparison is built from. A comparison
 * surface belongs to the row rather than to this narrowed view: its pickers
 * offer the row's every file (FR-011), so the entry link that opens one names
 * the row's own first two files. Built from the narrowed members instead, one
 * row's link would carry a different URL under every narrowing — the inventory
 * return point matches the followed link by its href, so it would find no link
 * to restore when the reader comes back through a page's own inventory link,
 * which lands on the unnarrowed list (T1122) — and a narrowing that leaves one
 * member matching would hide the entry to a comparison the row can still make.
 *
 * Only the kinds whose rows offer a comparison carry it. For instructions the
 * entry sits one level up, on the family block
 * ({@link InstructionRangeGroup.fileIdentities}).
 */
export type NarrowedInventoryRow<Row> = Row & {
  /**
   * Every file identity this row's own members name — Source and path, both
   * halves because two Sources can hold one spelling (FR-030) — in the
   * snapshot's published order and without repetition.
   */
  readonly rowFileIdentities: readonly InventoryFileIdentity[];
};

/**
 * Every file identity one row's members name; see
 * {@link NarrowedInventoryRow.rowFileIdentities}. One helper for every kind,
 * because each kind's member — a declaration, a definition, a carrier — names
 * its file the same way. Deduplicated by the whole identity: a row lists one
 * member per `(file, tool)`, so one file two products read is one identity.
 */
function rowFileIdentitiesOf(
  members: readonly { readonly sourceId: string; readonly sourceRelativePath: string }[],
): readonly InventoryFileIdentity[] {
  const identities = new Map<string, InventoryFileIdentity>();
  for (const member of members) {
    identities.set(fileIdentityKey(member.sourceId, member.sourceRelativePath), {
      sourceId: member.sourceId,
      sourceRelativePath: member.sourceRelativePath,
    });
  }
  return [...identities.values()];
}

/**
 * What the caller's selection derives from the committed snapshot. The whole
 * derivation pipeline lives in the constructor, so how each published view
 * follows from the snapshot and the selection is readable in one place;
 * construction performs no I/O and issues no request.
 */
export class InventoryFilterView {
  /** The Source families the current generation published, in the fixed order. */
  public readonly availableSourceKinds: ComputedRef<readonly SourceKind[]>;

  /** The tools the current inventory actually recognizes, in the closed tool order. */
  public readonly availableTools: ComputedRef<readonly SupportedTool[]>;

  /** The kinds the current inventory actually recognizes, in the closed kind order. */
  public readonly availableKinds: ComputedRef<readonly CustomizationKind[]>;

  /**
   * The products whose marks the rows on screen actually draw, in the closed
   * tool order — the kind in view, narrowed by every active filter.
   *
   * Its own derivation rather than {@link availableTools}, which is the whole
   * inventory's and is what the tool filter offers: a filter offers an
   * operation, and a legend explains what is on the page. Drawn from the
   * inventory's tools, a rule list carried a Codex mark no rule row shows, and
   * a key naming a mark the map does not have reads as a mark the reader has
   * not found yet.
   */
  public readonly shownTools: ComputedRef<readonly SupportedTool[]>;

  /**
   * The kind actually in view: the user's choice while it is still offered, and
   * otherwise the first available one. Derived rather than written back, so a
   * choice survives a commit that temporarily drops it.
   */
  public readonly activeKind: ComputedRef<CustomizationKind | null>;

  /**
   * How many rows each available kind would show, with every other filter
   * applied but not the kind itself — otherwise each tab but the active one
   * would read zero.
   */
  public readonly kindCounts: ComputedRef<ReadonlyMap<CustomizationKind, number>>;

  /**
   * The instruction rows that pass every active filter, in snapshot order. A
   * row is one recognized file (data-model.md § Inventory unit); a tool
   * filter keeps the recognizing tools it matches and drops the row only when
   * none is left, so a narrowed row states what still matches.
   */
  public readonly instructionRows: ComputedRef<
    readonly NarrowedInventoryRow<InstructionInventoryEntryDto>[]
  >;

  /**
   * The instruction rows the list renders, grouped by the range they govern
   * ({@link InstructionRangeGroup}), in the order the ranges first appear.
   *
   * The list's items are these groups, so the counts beside it are group
   * counts: what "showing 3 of 5" states has to be what a reader can count on
   * the screen.
   */
  public readonly instructionRangeGroups: ComputedRef<readonly InstructionRangeGroup[]>;

  /**
   * How many groups the committed generation publishes before any filter — the
   * "of" in the row summary. Derived from the same grouping as
   * {@link instructionRangeGroups} so the two cannot disagree about what an
   * item is.
   */
  public readonly instructionRangeGroupTotal: ComputedRef<number>;

  /**
   * The skill rows that pass every active filter, in snapshot order. A row is
   * one resolved name; a filter keeps the definitions it matches and drops a
   * row only when none is left, so a narrowed row states what still matches
   * rather than everything the name has.
   */
  public readonly skillRows: ComputedRef<readonly NarrowedInventoryRow<SkillInventoryEntryDto>[]>;

  /**
   * The MCP rows that pass every active filter, in snapshot order. A row is
   * one declared server name (data-model.md § Inventory unit); a filter keeps
   * the declarations it matches — by their carrier's path and recognizing
   * tool — and drops a row only when none is left, so a narrowed row states
   * what still matches rather than everything the name has, exactly as the
   * skill rows do.
   */
  public readonly mcpRows: ComputedRef<readonly NarrowedInventoryRow<McpInventoryEntryDto>[]>;

  /**
   * The custom-agent rows that pass every active filter, in snapshot order. A
   * row is one agent name the admitting rules resolve (data-model.md
   * § Inventory unit); a filter
   * keeps the definitions it matches and drops a row only when none is left,
   * so a narrowed row states what still matches rather than every file the
   * name has, exactly as the MCP rows do.
   */
  public readonly agentRows: ComputedRef<readonly NarrowedInventoryRow<AgentInventoryEntryDto>[]>;

  /**
   * The command rows that pass every active filter, in snapshot order. A row
   * is one name a reader invokes (data-model.md § Inventory unit); a filter
   * keeps the definitions it matches and drops a row only when none is left,
   * so a narrowed row states what still matches rather than every file the
   * name has.
   */
  public readonly promptRows: ComputedRef<readonly NarrowedInventoryRow<PromptInventoryEntryDto>[]>;

  /**
   * The rule rows that pass every active filter, in snapshot order. A row is
   * one recognized rule file (data-model.md § Inventory unit); a tool filter
   * keeps the recognizing tools it matches and drops the row only when none
   * is left, so a narrowed row states what still matches.
   */
  public readonly ruleRows: ComputedRef<readonly RuleInventoryEntryDto[]>;

  /**
   * The permission-policy rows that pass every active filter, in snapshot
   * order. A row is one declared policy, named by the path of the file that
   * declares it (data-model.md § Inventory unit), and the tool filter narrows
   * it by the same rule the other path-identified rows follow.
   */
  public readonly permissionsRows: ComputedRef<readonly PermissionsInventoryEntryDto[]>;

  /**
   * The hook event rows that survive every filter, each reduced to the
   * declarations that matched.
   */
  public readonly hookRows: ComputedRef<readonly NarrowedInventoryRow<HookInventoryEntryDto>[]>;

  /**
   * The plugin rows that pass every active filter, in snapshot order. A row is
   * one declared plugin name (data-model.md § Inventory unit); a filter keeps
   * the carriers it matches and drops the row only when none is left, so a
   * narrowed row states what still matches rather than every carrier the name
   * has, exactly as the MCP rows do.
   */
  public readonly pluginRows: ComputedRef<readonly NarrowedInventoryRow<PluginInventoryEntryDto>[]>;

  /**
   * The output-style rows that pass every active filter, in snapshot order. A
   * row is one style name a tool selects (data-model.md § Inventory unit); a
   * filter keeps the definitions it matches and drops the row only when none
   * is left, so a narrowed row states what still matches rather than every
   * file the name has.
   */
  public readonly outputStyleRows: ComputedRef<readonly OutputStyleInventoryEntryDto[]>;

  /**
   * The settings-and-configuration rows that pass every active filter, in
   * snapshot order. A row is one recognized settings or configuration file
   * (data-model.md § Inventory unit), and the tool filter narrows it by the
   * same rule the other path-identified rows follow.
   */
  public readonly settingsRows: ComputedRef<readonly SettingsInventoryEntryDto[]>;

  /**
   * Admitted candidates that pass the Source and path filters but appear in no
   * kind's inventory, in snapshot order — a candidate whose bytes were never
   * accepted gains no recognition, so no kind tab can show it. They are listed
   * apart rather than dropped: a scan that says "partial" has to be able to say
   * which file (FR-028).
   *
   * The tool selection is not one of the filters applied here, because no tool
   * recognized any of these files; the page says a tool filter is applied
   * rather than listing them under a tool none of them belongs to.
   *
   * A file that is only a companion is never here, whatever it carries: FR-003
   * gives an accompanying file no inventory row of its own. Its diagnostic is
   * stated inside the row of the skill whose directory holds it, and its own
   * source is one selection away in that skill's tree.
   */
  public readonly unrecognizedRows: ComputedRef<readonly CustomizationFileSummaryDto[]>;

  /**
   * How many admitted candidates appear in no kind's inventory before any
   * filter narrows them, which is what the result summary compares the visible
   * rows against ({@link unrecognizedRows}).
   */
  public readonly unrecognizedTotal: ComputedRef<number>;

  /**
   * The Source selection the rows are actually filtered by: the caller's choice
   * while the current generation still offers it, otherwise null. Published
   * because the control has to display it — an option the generation dropped
   * has no `<option>` to render, so a select bound to the raw choice would go
   * blank while the rows were unfiltered.
   */
  public readonly effectiveSource: ComputedRef<SourceKind | null>;

  /** The tool selection the rows are actually filtered by; see {@link effectiveSource}. */
  public readonly effectiveTool: ComputedRef<SupportedTool | null>;

  /**
   * Every published file by its Source and then its Source-relative Path —
   * both halves of the file's identity (FR-030). A kind's row names its files
   * by path and repeats none of their facts, and a definition's census
   * publishes paths, so this lookup is how a row reaches the file behind
   * either.
   *
   * Two levels rather than one, because a consented Global home and the
   * selected repository can hold the same Source-relative Path: a single
   * path-keyed map answers with whichever the snapshot listed first, which is
   * one file's facts shown under another's row.
   */
  public readonly filesBySource: ComputedRef<
    ReadonlyMap<string, ReadonlyMap<string, CustomizationFileSummaryDto>>
  >;

  /**
   * True while a filter narrows the inventory — drives the "clear" affordance.
   * The kind tab is not a filter and never counts here: clearing the filters
   * must not navigate the user off the kind they are looking at.
   */
  public readonly isNarrowed: ComputedRef<boolean>;

  /** Derives every view above from the snapshot and the caller's selection. */
  public constructor(snapshot: Ref<SessionSnapshot | null>, selection: InventoryFilterSelection) {
    const { source, tool, kind, searchQuery } = selection;

    // The Source families the current generation published, in the fixed order
    // rather than in the snapshot's: the Repository, then the consented homes
    // as one (FR-006). A family rather than one option per Source, because a
    // per-member option asks what the tool filter beside it already answers,
    // and because one family is a question with one answer (T1003).
    this.availableSourceKinds = computed(() => {
      const published = new Set((snapshot.value?.sources ?? []).map((source) => source.kind));
      return SOURCE_KIND_ORDER.filter((candidate) => published.has(candidate));
    });
    // Which family each published Source belongs to, so a file's own
    // `sourceId` resolves to the selection's vocabulary.
    const kindById = computed(() => {
      const byId = new Map<string, SourceKind>();
      for (const published of snapshot.value?.sources ?? []) {
        byId.set(published.sourceId, published.kind);
      }
      return byId;
    });
    this.filesBySource = computed(() => {
      const bySource = new Map<string, Map<string, CustomizationFileSummaryDto>>();
      for (const file of snapshot.value?.files ?? []) {
        let byPath = bySource.get(file.sourceId);
        if (byPath === undefined) {
          byPath = new Map();
          bySource.set(file.sourceId, byPath);
        }
        byPath.set(file.sourceRelativePath, file);
      }
      return bySource;
    });
    // One extractor per kind, keyed by the closed union so a kind whose rows
    // nobody read the tools from cannot compile (AGENTS.md § User-visible copy
    // policy makes the same argument for a label table). Each reads the rows
    // this view already narrowed, which is what makes the legend follow the
    // list rather than the snapshot.
    const shownToolsByKind: Readonly<Record<CustomizationKind, () => readonly SupportedTool[]>> = {
      instructions: () =>
        this.instructionRangeGroups.value.flatMap((group) =>
          group.rows.flatMap((row) =>
            row.files.flatMap((file) => file.recognitions.map((recognition) => recognition.tool)),
          ),
        ),
      skill: () =>
        this.skillRows.value.flatMap((row) => row.definitions.map((definition) => definition.tool)),
      MCP: () =>
        this.mcpRows.value.flatMap((row) =>
          row.declarations.map((declaration) => declaration.tool),
        ),
      agent: () =>
        this.agentRows.value.flatMap((row) => row.definitions.map((definition) => definition.tool)),
      'prompt/command': () =>
        this.promptRows.value.flatMap((row) =>
          row.definitions.map((definition) => definition.tool),
        ),
      rule: () =>
        this.ruleRows.value.flatMap((row) =>
          row.recognitions.map((recognition) => recognition.tool),
        ),
      permissions: () =>
        this.permissionsRows.value.flatMap((row) =>
          row.recognitions.map((recognition) => recognition.tool),
        ),
      hook: () =>
        this.hookRows.value.flatMap((row) =>
          row.declarations.map((declaration) => declaration.tool),
        ),
      plugin: () =>
        this.pluginRows.value.flatMap((row) => row.carriers.map((carrier) => carrier.tool)),
      // No inventory of its own, so no rows and no marks: a sibling metadata
      // file belongs to the skill whose directory holds it, and that skill's
      // row is where it appears (data-model.md § Inventory unit).
      'skill metadata': () => [],
      'output style': () =>
        this.outputStyleRows.value.flatMap((row) =>
          row.definitions.map((definition) => definition.tool),
        ),
      'settings/config': () =>
        this.settingsRows.value.flatMap((row) =>
          row.recognitions.map((recognition) => recognition.tool),
        ),
    };
    this.shownTools = computed(() => {
      const kindInView = this.activeKind.value;
      if (kindInView === null) {
        return [];
      }
      const present = new Set(shownToolsByKind[kindInView]());
      return SUPPORTED_TOOL_ORDER.filter((candidate) => present.has(candidate));
    });
    this.availableTools = computed(() => {
      const present = new Set([
        ...(snapshot.value?.instructions ?? []).flatMap((entry) =>
          entry.files.flatMap((file) => file.recognitions.map((recognition) => recognition.tool)),
        ),
        ...(snapshot.value?.skills ?? []).flatMap((entry) =>
          entry.definitions.map((definition) => definition.tool),
        ),
        ...(snapshot.value?.mcp ?? []).flatMap((entry) =>
          entry.declarations.map((declaration) => declaration.tool),
        ),
        ...(snapshot.value?.agents ?? []).flatMap((entry) =>
          entry.definitions.map((definition) => definition.tool),
        ),
        ...(snapshot.value?.prompts ?? []).flatMap((entry) =>
          entry.definitions.map((definition) => definition.tool),
        ),
        ...(snapshot.value?.rules ?? []).flatMap((entry) =>
          entry.recognitions.map((recognition) => recognition.tool),
        ),
        ...(snapshot.value?.permissions ?? []).flatMap((entry) =>
          entry.recognitions.map((recognition) => recognition.tool),
        ),
        ...(snapshot.value?.hooks ?? []).flatMap((entry) =>
          entry.declarations.map((declaration) => declaration.tool),
        ),
        ...(snapshot.value?.plugins ?? []).flatMap((entry) =>
          entry.carriers.map((carrier) => carrier.tool),
        ),
        ...(snapshot.value?.outputStyles ?? []).flatMap((entry) =>
          entry.definitions.map((definition) => definition.tool),
        ),
        ...(snapshot.value?.settings ?? []).flatMap((entry) =>
          entry.recognitions.map((recognition) => recognition.tool),
        ),
      ]);
      return SUPPORTED_TOOL_ORDER.filter((candidate) => present.has(candidate));
    });
    this.availableKinds = computed(() => {
      // One entry per kind whose inventory the snapshot publishes; a kind appears
      // only once its recognizer phase ships an inventory of its own.
      const present = new Set<CustomizationKind>([
        ...((snapshot.value?.instructions ?? []).length > 0 ? (['instructions'] as const) : []),
        ...((snapshot.value?.skills ?? []).length > 0 ? (['skill'] as const) : []),
        ...((snapshot.value?.mcp ?? []).length > 0 ? (['MCP'] as const) : []),
        ...((snapshot.value?.agents ?? []).length > 0 ? (['agent'] as const) : []),
        ...((snapshot.value?.prompts ?? []).length > 0 ? (['prompt/command'] as const) : []),
        ...((snapshot.value?.rules ?? []).length > 0 ? (['rule'] as const) : []),
        ...((snapshot.value?.permissions ?? []).length > 0 ? (['permissions'] as const) : []),
        ...((snapshot.value?.hooks ?? []).length > 0 ? (['hook'] as const) : []),
        ...((snapshot.value?.plugins ?? []).length > 0 ? (['plugin'] as const) : []),
        ...((snapshot.value?.outputStyles ?? []).length > 0 ? (['output style'] as const) : []),
        ...((snapshot.value?.settings ?? []).length > 0 ? (['settings/config'] as const) : []),
      ]);
      return CUSTOMIZATION_KIND_ORDER.filter((candidate) => present.has(candidate));
    });

    // Only a selection the current inventory actually offers is applied. The rows
    // and `isNarrowed` read these rather than the raw fields, so the view never
    // claims to be narrowed by an option the user cannot see.
    const effectiveSource = computed(() =>
      source.value !== null && this.availableSourceKinds.value.includes(source.value)
        ? source.value
        : null,
    );
    const effectiveTool = computed(() =>
      tool.value !== null && this.availableTools.value.includes(tool.value) ? tool.value : null,
    );
    this.effectiveSource = effectiveSource;
    this.effectiveTool = effectiveTool;
    // The kind in view: the chosen tab while it is still offered, otherwise the
    // first available one so the page always shows something rather than an
    // apologetic blank. Falling back instead of writing means the user's choice
    // comes back on its own when a later commit offers that kind again.
    this.activeKind = computed<CustomizationKind | null>(() => {
      if (kind.value !== null && this.availableKinds.value.includes(kind.value)) {
        return kind.value;
      }
      return this.availableKinds.value[0] ?? null;
    });

    /**
     * The case-folded search text; empty matches everything. Folding is
     * `toLowerCase`, not the locale-aware form: a Source-relative Path is not
     * locale text, and in a Turkish locale `I` folds to a dotless `ı`, so an ASCII
     * path would stop matching the ASCII the user typed.
     *
     * No Unicode normalization on either side, and no trimming: a published
     * path is the exact raw entry names (FR-024), an entry name can begin or
     * end in whitespace, and a query trimmed of the very characters that
     * distinguish such a name could never narrow the list down to it.
     */
    const query = computed(() => searchQuery.value.toLowerCase());

    /**
     * Whether the search text matches a row's own name (FR-006). The caller
     * passes every spelling a reader can see of it, because a row is found by
     * what that row displays: a name escaped for display would otherwise match
     * nothing, and a row displaying this product's words for a name the file
     * did not declare would match neither those words nor anything else.
     *
     * Nothing is read as this product's own note here — each spelling stands
     * for its own row, so a query that two rows both display returns both,
     * each keeping its own identity (`authored-name.ts`
     * § visibleSpellings).
     *
     * Empty for the kinds that carry no name and for the one row per kind
     * whose name is not known: there is nothing to match, so those rows narrow
     * by their files' paths alone.
     */
    const nameMatches = (spellings: readonly string[]): boolean =>
      query.value !== '' &&
      spellings.some((spelling) => spelling.toLowerCase().includes(query.value));

    /**
     * Whether a published file passes the Source and path filters, resolved
     * by the file's whole identity (FR-030): every kind's row member states
     * its own `sourceId`, because the path alone names no file once two
     * Sources can hold it.
     */
    const fileMatches = (
      sourceRelativePath: string,
      sourceId: string,
      rowNameMatched = false,
    ): boolean => {
      const file = this.filesBySource.value.get(sourceId)?.get(sourceRelativePath);
      if (file === undefined) {
        return false;
      }
      if (
        effectiveSource.value !== null &&
        kindById.value.get(file.sourceId) !== effectiveSource.value
      ) {
        return false;
      }
      // A row whose own name matched keeps every one of its files: the reader
      // asked for that name, and answering with the subset whose paths happen
      // to spell it too would hide the copies that make the row worth opening
      // — the `.agents/` and `.claude/` pair of one skill most of all
      // (FR-006). The Source filter above still applies, because that is a
      // question about where a file is rather than about what it is called.
      if (rowNameMatched) {
        return true;
      }
      // Matched against the same spelling the list renders
      // ({@link pathPresentationLabel}), so typing or pasting what the screen
      // shows always matches — control characters included, and a name built
      // only from invisible code points included too: the row spells such a
      // name out, and matching the escaped form instead would leave the text
      // on the screen matching nothing.
      return (
        query.value === '' ||
        pathPresentationLabel(file.sourceRelativePath).toLowerCase().includes(query.value)
      );
    };

    /**
     * The instruction entries that survive every filter, each reduced to the
     * files that matched and each of those to the recognitions that matched. A
     * file with no matching recognition is not listed and a range with no
     * listed file is not a row: showing either would claim a match the
     * inventory does not have.
     *
     * A recognition is kept or dropped whole, surfaces included: the tool
     * filter selects a product, and a product's recognition of a file is one
     * fact however many of its surfaces read the file.
     */
    this.instructionRows = computed<readonly NarrowedInventoryRow<InstructionInventoryEntryDto>[]>(
      () =>
        (snapshot.value?.instructions ?? []).flatMap((entry) => {
          // An instructions row is named by the range it governs, so the range
          // is what a search matches it on — spelled the way the row renders it
          // (`applicabilityRangePresentation`), never the raw glob.
          const named = nameMatches(
            new ApplicabilityRange(entry.applicabilityRange).visibleSpellings,
          );
          const files = entry.files.flatMap((file) => {
            // The row's own Source, so a same-path file in the other Source
            // cannot decide whether this one is shown (FR-030).
            if (!fileMatches(file.sourceRelativePath, entry.sourceId, named)) {
              return [];
            }
            const recognitions =
              effectiveTool.value === null
                ? file.recognitions
                : file.recognitions.filter(
                    (recognition) => recognition.tool === effectiveTool.value,
                  );
            return recognitions.length === 0 ? [] : [{ ...file, recognitions }];
          });
          return files.length === 0
            ? []
            : [
                {
                  ...entry,
                  files,
                  rowFileIdentities: rowFileIdentitiesOf(
                    entry.files.map((file) => ({
                      sourceId: entry.sourceId,
                      sourceRelativePath: file.sourceRelativePath,
                    })),
                  ),
                },
              ];
        }),
    );

    /**
     * The published Source order as a rank, so a group lists the repository
     * before a consented home. Taken from the snapshot's own `sources` rather
     * than from the order the rows arrive in: the order a reader is shown is
     * the order the product states its Sources in, and a projection's emission
     * order is not that statement.
     */
    const sourceRank = computed(() => {
      const rank = new Map<string, number>();
      for (const [index, source] of (snapshot.value?.sources ?? []).entries()) {
        rank.set(source.sourceId, index);
      }
      return rank;
    });
    const familyOf = (sourceId: string): SourceKind => kindById.value.get(sourceId) ?? 'repository';
    /**
     * The family-major order every range group publishes its rows and
     * identities in — the repository's before the consented homes', and
     * within a family the published Source order — so the shared family
     * grouping renders the repository block first. The fixed family order is
     * written here because this is its one reader; a family added to
     * `SourceKind` fails to compile at the label table instead
     * (`api-text.ts` § SOURCE_KIND_TEXT).
     */
    const familyMajorCompare = (left: string, right: string): number => {
      const familyRank = (sourceId: string): number =>
        familyOf(sourceId) === 'repository' ? 0 : 1;
      return (
        familyRank(left) - familyRank(right) ||
        (sourceRank.value.get(left) ?? 0) - (sourceRank.value.get(right) ?? 0)
      );
    };
    /**
     * Every file identity a range group publishes, from the unnarrowed
     * snapshot in the family-major order
     * ({@link InstructionRangeGroup.fileIdentities}).
     */
    const groupFileIdentities = (
      applicabilityRange: string | null,
    ): readonly InventoryFileIdentity[] =>
      (snapshot.value?.instructions ?? [])
        .filter((entry) => entry.applicabilityRange === applicabilityRange)
        .toSorted((left, right) => familyMajorCompare(left.sourceId, right.sourceId))
        .flatMap((entry) =>
          entry.files.map((file) => ({
            sourceId: entry.sourceId,
            sourceRelativePath: file.sourceRelativePath,
          })),
        );
    /**
     * Groups instruction rows by the range they govern, each group's rows in
     * the family-major order ({@link InstructionRangeGroup}).
     */
    const groupRows = (
      rows: readonly NarrowedInventoryRow<InstructionInventoryEntryDto>[],
    ): readonly InstructionRangeGroup[] =>
      [...Map.groupBy(rows, (row) => row.applicabilityRange).entries()].map(
        ([applicabilityRange, grouped]) => ({
          applicabilityRange,
          rows: grouped.toSorted((left, right) =>
            familyMajorCompare(left.sourceId, right.sourceId),
          ),
          fileIdentities: groupFileIdentities(applicabilityRange),
        }),
      );
    this.instructionRangeGroups = computed(() => groupRows(this.instructionRows.value));
    this.instructionRangeGroupTotal = computed(
      () =>
        Map.groupBy(snapshot.value?.instructions ?? [], (entry) => entry.applicabilityRange).size,
    );

    /**
     * The skill entries that survive every filter, each reduced to the
     * definitions that matched. A name with no matching definition is not a row:
     * showing it would claim a match the inventory does not have.
     */
    this.skillRows = computed<readonly NarrowedInventoryRow<SkillInventoryEntryDto>[]>(() => {
      const filtered = (snapshot.value?.skills ?? []).flatMap((entry) => {
        const named = nameMatches(new AuthoredName(entry.name).visibleSpellings);
        const definitions = entry.definitions.filter(
          (definition) =>
            fileMatches(definition.sourceRelativePath, definition.sourceId, named) &&
            (effectiveTool.value === null || definition.tool === effectiveTool.value),
        );
        return definitions.length === 0 ? [] : [{ entry, definitions }];
      });
      // The same per-tool collision machinery the projection applied,
      // through the shared assembly (skill-collision.ts) so the two surfaces
      // cannot drift — rebuilt here because the population is this view's
      // own: a gate can span rows — Claude's does — and a filter can hide
      // one side of a clash, so the statement goes with the definitions it
      // described.
      const collisionGates = skillCollisionGates(
        filtered.flatMap(({ definitions }) => definitions),
      );
      // A resolution statement describes the definitions actually shown, and
      // it answers what one tool does when *it* faces the collision its own
      // naming policy defines.
      return filtered.map(({ entry, definitions }) => ({
        ...entry,
        definitions,
        rowFileIdentities: rowFileIdentitiesOf(entry.definitions),
        sameNameResolutions: entry.sameNameResolutions.filter((resolution) =>
          facesSameNameCollision(collisionGates, resolution.tool, definitions),
        ),
      }));
    });

    /**
     * The MCP name rows that survive every filter, each reduced to the
     * declarations that matched. A name with no matching declaration is not a
     * row: showing it would claim a match the inventory does not have.
     */
    this.mcpRows = computed<readonly NarrowedInventoryRow<McpInventoryEntryDto>[]>(() =>
      (snapshot.value?.mcp ?? []).flatMap((entry) => {
        const named = nameMatches(
          entry.name === null
            ? [UNNAMED_ROW_TEXT.MCP!]
            : new AuthoredName(entry.name).visibleSpellings,
        );
        const declarations = entry.declarations.filter(
          (declaration) =>
            fileMatches(declaration.sourceRelativePath, declaration.sourceId, named) &&
            (effectiveTool.value === null || declaration.tool === effectiveTool.value),
        );
        return declarations.length === 0
          ? []
          : [
              {
                ...entry,
                declarations,
                rowFileIdentities: rowFileIdentitiesOf(entry.declarations),
              },
            ];
      }),
    );

    /**
     * The custom-agent entries that survive every filter, each reduced to the
     * definitions that matched. A name with no matching definition is not a
     * row: showing it would claim a match the inventory does not have. The
     * null-named row narrows by the same two questions — it is a row of files
     * like any other, and only its heading differs.
     */
    this.agentRows = computed<readonly NarrowedInventoryRow<AgentInventoryEntryDto>[]>(() =>
      (snapshot.value?.agents ?? []).flatMap((entry) => {
        const named = nameMatches(
          entry.name === null
            ? [UNNAMED_ROW_TEXT.agent!]
            : new AuthoredName(entry.name).visibleSpellings,
        );
        const definitions = entry.definitions.filter(
          (definition) =>
            fileMatches(definition.sourceRelativePath, definition.sourceId, named) &&
            (effectiveTool.value === null || definition.tool === effectiveTool.value),
        );
        return definitions.length === 0
          ? []
          : [{ ...entry, definitions, rowFileIdentities: rowFileIdentitiesOf(entry.definitions) }];
      }),
    );

    /**
     * The command entries that survive every filter, each reduced to the
     * definitions that matched. A name with no matching definition is not a
     * row: showing it would claim a match the inventory does not have.
     */
    this.promptRows = computed(() =>
      (snapshot.value?.prompts ?? []).flatMap((entry) => {
        const named = nameMatches(new AuthoredName(entry.name).visibleSpellings);
        const definitions = entry.definitions.filter(
          (definition) =>
            fileMatches(definition.sourceRelativePath, definition.sourceId, named) &&
            (effectiveTool.value === null || definition.tool === effectiveTool.value),
        );
        return definitions.length === 0
          ? []
          : [{ ...entry, definitions, rowFileIdentities: rowFileIdentitiesOf(entry.definitions) }];
      }),
    );

    /**
     * The rule files that survive every filter, each reduced to the
     * recognitions that matched. A file with no matching recognition is not a
     * row: showing it would claim a match the inventory does not have.
     *
     * A recognition is kept or dropped whole, surfaces included, exactly as
     * an instruction file's are: the tool filter selects a product, and a
     * product's recognition of a file is one fact however many of its
     * surfaces read the file.
     */
    this.ruleRows = computed(() =>
      (snapshot.value?.rules ?? []).flatMap((entry) => {
        if (!fileMatches(entry.sourceRelativePath, entry.sourceId)) {
          return [];
        }
        const recognitions =
          effectiveTool.value === null
            ? entry.recognitions
            : entry.recognitions.filter((recognition) => recognition.tool === effectiveTool.value);
        return recognitions.length === 0 ? [] : [{ ...entry, recognitions }];
      }),
    );

    /**
     * The declared policies that survive every filter, each reduced to the
     * recognitions that matched, by the same two questions the rules filter
     * asks of its own rows.
     *
     * Written out rather than shared with the rules filter above: the two rows
     * are different subjects — a rule file, and a policy a file declares — so
     * the first fact one of them gains that the other has no answer for would
     * break a shared filter, and the duplication is four lines.
     */
    this.permissionsRows = computed(() =>
      (snapshot.value?.permissions ?? []).flatMap((entry) => {
        if (!fileMatches(entry.sourceRelativePath, entry.sourceId)) {
          return [];
        }
        const recognitions =
          effectiveTool.value === null
            ? entry.recognitions
            : entry.recognitions.filter((recognition) => recognition.tool === effectiveTool.value);
        return recognitions.length === 0 ? [] : [{ ...entry, recognitions }];
      }),
    );

    /**
     * The hook rows that survive every filter, each reduced to the
     * declarations that matched, by the two questions every carrier-grouped
     * row asks: does the file match the path filter, and is its recognizing
     * tool the selected one. An event with no matching declaration is not a
     * row: showing it would claim a match the inventory does not have.
     */
    this.hookRows = computed(() =>
      (snapshot.value?.hooks ?? []).flatMap((entry) => {
        const named = nameMatches(
          entry.event === null
            ? [UNNAMED_ROW_TEXT.hook!]
            : new AuthoredName(entry.event).visibleSpellings,
        );
        const declarations = entry.declarations.filter(
          (declaration) =>
            fileMatches(declaration.sourceRelativePath, declaration.sourceId, named) &&
            (effectiveTool.value === null || declaration.tool === effectiveTool.value),
        );
        return declarations.length === 0
          ? []
          : [
              {
                ...entry,
                declarations,
                rowFileIdentities: rowFileIdentitiesOf(entry.declarations),
              },
            ];
      }),
    );

    /**
     * The plugin rows that survive every filter, each reduced to the carriers
     * that matched: the same two questions every carrier-grouped row asks —
     * does the file match the path filter, and is its recognizing tool the
     * selected one.
     */
    this.pluginRows = computed(() =>
      (snapshot.value?.plugins ?? []).flatMap((entry) => {
        const named = nameMatches(
          entry.name === null
            ? [UNNAMED_ROW_TEXT.plugin!]
            : new AuthoredName(entry.name).visibleSpellings,
        );
        const carriers = entry.carriers.filter(
          (carrier) =>
            fileMatches(carrier.sourceRelativePath, carrier.sourceId, named) &&
            (effectiveTool.value === null || carrier.tool === effectiveTool.value),
        );
        return carriers.length === 0
          ? []
          : [{ ...entry, carriers, rowFileIdentities: rowFileIdentitiesOf(entry.carriers) }];
      }),
    );

    /**
     * The output styles that survive every filter, each reduced to the
     * definitions that matched, by the same two questions the prompts filter
     * asks of its own rows: this kind's row is a name and its definitions, so
     * the filter narrows the definitions and keeps a row only while one is
     * left.
     */
    this.outputStyleRows = computed(() =>
      (snapshot.value?.outputStyles ?? []).flatMap((entry) => {
        const named = nameMatches(new AuthoredName(entry.name).visibleSpellings);
        const definitions = entry.definitions.filter(
          (definition) =>
            fileMatches(definition.sourceRelativePath, definition.sourceId, named) &&
            (effectiveTool.value === null || definition.tool === effectiveTool.value),
        );
        return definitions.length === 0 ? [] : [{ ...entry, definitions }];
      }),
    );

    /**
     * The settings and configuration files that survive every filter, each
     * reduced to the recognitions that matched, by the same two questions the
     * rules filter asks of its own rows.
     *
     * Written out rather than shared with the two filters above: the three
     * rows are different subjects — a rule file, a policy a file declares,
     * and the file a product reads its settings from — so the first fact one
     * of them gains that the others have no answer for would break a shared
     * filter, and the duplication is four lines.
     */
    this.settingsRows = computed(() =>
      (snapshot.value?.settings ?? []).flatMap((entry) => {
        if (!fileMatches(entry.sourceRelativePath, entry.sourceId)) {
          return [];
        }
        const recognitions =
          effectiveTool.value === null
            ? entry.recognitions
            : entry.recognitions.filter((recognition) => recognition.tool === effectiveTool.value);
        return recognitions.length === 0 ? [] : [{ ...entry, recognitions }];
      }),
    );

    this.kindCounts = computed(() => {
      const counts = new Map<CustomizationKind, number>();
      for (const candidate of this.availableKinds.value) {
        // Every kind's count is that kind's own row count with the other filters
        // applied, which is what selecting the tab would show.
        counts.set(
          candidate,
          candidate === 'instructions'
            ? this.instructionRangeGroups.value.length
            : candidate === 'skill'
              ? this.skillRows.value.length
              : candidate === 'MCP'
                ? this.mcpRows.value.length
                : candidate === 'agent'
                  ? this.agentRows.value.length
                  : candidate === 'prompt/command'
                    ? this.promptRows.value.length
                    : candidate === 'rule'
                      ? this.ruleRows.value.length
                      : candidate === 'permissions'
                        ? this.permissionsRows.value.length
                        : candidate === 'hook'
                          ? this.hookRows.value.length
                          : candidate === 'plugin'
                            ? this.pluginRows.value.length
                            : candidate === 'output style'
                              ? this.outputStyleRows.value.length
                              : candidate === 'settings/config'
                                ? this.settingsRows.value.length
                                : 0,
        );
      }
      return counts;
    });

    // Every admitted candidate no kind lists, before the filters narrow them:
    // the two published views below are this one walk seen twice, so the rows
    // and the total the summary compares them against cannot disagree.
    const unrecognizedCandidates = computed(() => {
      // Paths already listed by a kind, per Source. Keyed by Source because a
      // path listed in one says nothing about the same path in another: a
      // repository `AGENTS.md` with an instruction row does not account for a
      // consented home's binary `AGENTS.md`, which is a published file no kind
      // lists and whose diagnostic is the only statement a `partial` generation
      // has about it (FR-028, FR-030).
      const listed = new Map<string, Set<string>>();
      const listPath = (sourceId: string, sourceRelativePath: string): void => {
        let paths = listed.get(sourceId);
        if (paths === undefined) {
          paths = new Set();
          listed.set(sourceId, paths);
        }
        paths.add(sourceRelativePath);
      };
      // Every kind's row member names the Source that lists it: the
      // file-unit rows on the row itself, the definition-, declaration-, and
      // carrier-grouped kinds on each member (FR-030). A kind shipping its
      // own inventory adds itself here, or its files would be reported as
      // unrecognized while its own tab lists them.
      for (const entry of snapshot.value?.instructions ?? []) {
        for (const file of entry.files) {
          listPath(entry.sourceId, file.sourceRelativePath);
        }
      }
      for (const entry of snapshot.value?.skills ?? []) {
        for (const definition of entry.definitions) {
          listPath(definition.sourceId, definition.sourceRelativePath);
          // A companion belongs to the customization whose directory holds
          // it, and that customization already has a row — so a companion is
          // excluded here even when it carries a diagnostic. FR-003 is
          // explicit that an accompanying file acquires no inventory row of
          // its own, and the row it belongs to states the diagnostic instead:
          // `SkillRow` resolves the census files' diagnostics beside the
          // definition, which is what keeps a `partial` generation able to
          // say which file (FR-028). The census is the definition's own
          // Source's — its paths are relative to the same root.
          for (const companion of definition.companionFiles) {
            listPath(definition.sourceId, companion);
          }
        }
      }
      for (const entry of snapshot.value?.mcp ?? []) {
        for (const declaration of entry.declarations) {
          listPath(declaration.sourceId, declaration.sourceRelativePath);
        }
      }
      for (const entry of snapshot.value?.agents ?? []) {
        for (const definition of entry.definitions) {
          listPath(definition.sourceId, definition.sourceRelativePath);
        }
      }
      for (const entry of snapshot.value?.hooks ?? []) {
        for (const declaration of entry.declarations) {
          listPath(declaration.sourceId, declaration.sourceRelativePath);
        }
      }
      for (const entry of snapshot.value?.plugins ?? []) {
        for (const carrier of entry.carriers) {
          listPath(carrier.sourceId, carrier.sourceRelativePath);
          // A plugin's own files belong to the plugin's row, which already
          // has them: the row is one plugin, and the files it ships are its
          // own — paths of the carrier's Source.
          for (const file of carrier.files) {
            listPath(carrier.sourceId, file);
          }
        }
      }
      for (const entry of snapshot.value?.settings ?? []) {
        listPath(entry.sourceId, entry.sourceRelativePath);
      }
      for (const entry of snapshot.value?.prompts ?? []) {
        for (const definition of entry.definitions) {
          listPath(definition.sourceId, definition.sourceRelativePath);
        }
      }
      for (const entry of snapshot.value?.rules ?? []) {
        listPath(entry.sourceId, entry.sourceRelativePath);
      }
      for (const entry of snapshot.value?.permissions ?? []) {
        listPath(entry.sourceId, entry.sourceRelativePath);
      }
      for (const entry of snapshot.value?.outputStyles ?? []) {
        for (const definition of entry.definitions) {
          listPath(definition.sourceId, definition.sourceRelativePath);
        }
      }
      return (snapshot.value?.files ?? []).filter(
        (file) => listed.get(file.sourceId)?.has(file.sourceRelativePath) !== true,
      );
    });
    this.unrecognizedTotal = computed(() => unrecognizedCandidates.value.length);
    // The tool selection is deliberately not consulted. A file here was
    // recognized by no product, so no tool selection can match it, and
    // emptying the list under one would take the only statement a `partial`
    // generation has about that file off the page (FR-028); the control is not
    // offered on this list at all (`pages/index.vue`). The Source selection
    // does apply, because such a file belongs to a Source like any other.
    this.unrecognizedRows = computed(() =>
      unrecognizedCandidates.value.filter((file) =>
        // The file's own Source, never the default: a Global file resolved
        // against the repository's index is a file the list drops entirely,
        // taking its diagnostic with it (FR-028, FR-030).
        fileMatches(file.sourceRelativePath, file.sourceId),
      ),
    );

    this.isNarrowed = computed(
      () => effectiveSource.value !== null || effectiveTool.value !== null || query.value !== '',
    );
  }
}

/**
 * The composable a page calls in its setup, per Vue idiom; the view itself is
 * the class above, so the derivation stays readable in one constructor.
 */
export function useInventoryFilters(
  snapshot: Ref<SessionSnapshot | null>,
  selection: InventoryFilterSelection,
): InventoryFilterView {
  return new InventoryFilterView(snapshot, selection);
}
