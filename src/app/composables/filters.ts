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
import { computed, type ComputedRef, type Ref } from 'vue';
import type {
  CustomizationFileSummaryDto,
  InstructionInventoryEntryDto,
  McpInventoryEntryDto,
  SessionSnapshot,
  SkillInventoryEntryDto,
  SourceDto,
} from '../../shared/api-types';
import {
  CUSTOMIZATION_KIND_ORDER,
  SUPPORTED_TOOL_ORDER,
  pathPresentationLabel,
  type CustomizationKind,
  type SupportedTool,
} from '../../shared/entities';
import { facesSameNameCollision, skillCollisionGates } from '../../shared/skill-naming';

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

/**
 * What the caller's selection derives from the committed snapshot. The whole
 * derivation pipeline lives in the constructor, so how each published view
 * follows from the snapshot and the selection is readable in one place;
 * construction performs no I/O and issues no request.
 */
export class InventoryFilterView {
  /** The Sources the current generation published, in snapshot order. */
  public readonly availableSources: ComputedRef<readonly SourceDto[]>;

  /** The tools the current inventory actually recognizes, in the closed tool order. */
  public readonly availableTools: ComputedRef<readonly SupportedTool[]>;

  /** The kinds the current inventory actually recognizes, in the closed kind order. */
  public readonly availableKinds: ComputedRef<readonly CustomizationKind[]>;

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
  public readonly instructionRows: ComputedRef<readonly InstructionInventoryEntryDto[]>;

  /**
   * The skill rows that pass every active filter, in snapshot order. A row is
   * one resolved name; a filter keeps the definitions it matches and drops a
   * row only when none is left, so a narrowed row states what still matches
   * rather than everything the name has.
   */
  public readonly skillRows: ComputedRef<readonly SkillInventoryEntryDto[]>;

  /**
   * The MCP rows that pass every active filter, in snapshot order. A row is
   * one declared server name (data-model.md § Inventory unit); a filter keeps
   * the declarations it matches — by their carrier's path and recognizing
   * tool — and drops a row only when none is left, so a narrowed row states
   * what still matches rather than everything the name has, exactly as the
   * skill rows do.
   */
  public readonly mcpRows: ComputedRef<readonly McpInventoryEntryDto[]>;

  /**
   * Admitted candidates that pass the filters but appear in no kind's
   * inventory, in snapshot order — a candidate whose bytes were never accepted
   * gains no recognition, so no kind tab can show it. They are listed apart
   * rather than dropped: a scan that says "partial" has to be able to say which
   * file (FR-028).
   *
   * A file that is only a companion is never here, whatever it carries: FR-003
   * gives an accompanying file no inventory row of its own. Its diagnostic is
   * stated inside the row of the skill whose directory holds it, and its own
   * source is one selection away in that skill's tree.
   */
  public readonly unrecognizedRows: ComputedRef<readonly CustomizationFileSummaryDto[]>;

  /**
   * The Source selection the rows are actually filtered by: the caller's choice
   * while the current generation still offers it, otherwise null. Published
   * because the control has to display it — an option the generation dropped
   * has no `<option>` to render, so a select bound to the raw choice would go
   * blank while the rows were unfiltered.
   */
  public readonly effectiveSourceId: ComputedRef<string | null>;

  /** The tool selection the rows are actually filtered by; see {@link effectiveSourceId}. */
  public readonly effectiveTool: ComputedRef<SupportedTool | null>;

  /**
   * Every published file by its Source-relative Path — the file's identity
   * (FR-030). A kind's row names its files by path and repeats none of their
   * facts, and a definition's census publishes paths, so this one lookup is
   * how a row reaches the file behind either.
   */
  public readonly filesByPath: ComputedRef<ReadonlyMap<string, CustomizationFileSummaryDto>>;

  /**
   * Every path with an MCP recognition in the committed generation, from the
   * unfiltered inventory — named rows and the no-name row alike. A carrier's
   * `FileDetail` is withheld by contract (FR-007), so a surface that links a
   * file to a source-serving detail — an instruction row whose file is also
   * a carrier, through a Codex configured fallback — routes it to the
   * carrier's own MCP view instead. Derived from the snapshot rather than
   * the filtered rows, so a tool or path filter cannot change where a link
   * points.
   */
  public readonly mcpCarrierPaths: ComputedRef<ReadonlySet<string>>;

  /**
   * True while a filter narrows the inventory — drives the "clear" affordance.
   * The kind tab is not a filter and never counts here: clearing the filters
   * must not navigate the user off the kind they are looking at.
   */
  public readonly isNarrowed: ComputedRef<boolean>;

  /** Derives every view above from the snapshot and the caller's selection. */
  public constructor(snapshot: Ref<SessionSnapshot | null>, selection: InventoryFilterSelection) {
    const { sourceId, tool, kind, pathQuery } = selection;

    this.availableSources = computed(() => snapshot.value?.sources ?? []);
    this.filesByPath = computed(
      () => new Map((snapshot.value?.files ?? []).map((file) => [file.sourceRelativePath, file])),
    );
    this.mcpCarrierPaths = computed(
      () =>
        new Set(
          (snapshot.value?.mcp ?? []).flatMap((entry) =>
            entry.declarations.map((declaration) => declaration.sourceRelativePath),
          ),
        ),
    );

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
      ]);
      return CUSTOMIZATION_KIND_ORDER.filter((candidate) => present.has(candidate));
    });

    // Only a selection the current inventory actually offers is applied. The rows
    // and `isNarrowed` read these rather than the raw fields, so the view never
    // claims to be narrowed by an option the user cannot see.
    const effectiveSourceId = computed(() =>
      sourceId.value !== null &&
      this.availableSources.value.some((source) => source.sourceId === sourceId.value)
        ? sourceId.value
        : null,
    );
    const effectiveTool = computed(() =>
      tool.value !== null && this.availableTools.value.includes(tool.value) ? tool.value : null,
    );
    this.effectiveSourceId = effectiveSourceId;
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
     * The trimmed, case-folded path query; empty matches every path. Folding is
     * `toLowerCase`, not the locale-aware form: a Source-relative Path is not
     * locale text, and in a Turkish locale `I` folds to a dotless `ı`, so an ASCII
     * path would stop matching the ASCII the user typed.
     *
     * No Unicode normalization on either side: a published path is the exact
     * raw entry names (FR-024), and the query matches the spelling the list
     * shows.
     */
    const query = computed(() => pathQuery.value.trim().toLowerCase());

    /** Whether a published file passes the Source and path filters. */
    const fileMatches = (sourceRelativePath: string): boolean => {
      const file = this.filesByPath.value.get(sourceRelativePath);
      if (file === undefined) {
        return false;
      }
      if (effectiveSourceId.value !== null && file.sourceId !== effectiveSourceId.value) {
        return false;
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
    this.instructionRows = computed<readonly InstructionInventoryEntryDto[]>(() =>
      (snapshot.value?.instructions ?? []).flatMap((entry) => {
        const files = entry.files.flatMap((file) => {
          if (!fileMatches(file.sourceRelativePath)) {
            return [];
          }
          const recognitions =
            effectiveTool.value === null
              ? file.recognitions
              : file.recognitions.filter((recognition) => recognition.tool === effectiveTool.value);
          return recognitions.length === 0 ? [] : [{ ...file, recognitions }];
        });
        return files.length === 0 ? [] : [{ ...entry, files }];
      }),
    );

    /**
     * The skill entries that survive every filter, each reduced to the
     * definitions that matched. A name with no matching definition is not a row:
     * showing it would claim a match the inventory does not have.
     */
    this.skillRows = computed<readonly SkillInventoryEntryDto[]>(() => {
      const filtered = (snapshot.value?.skills ?? []).flatMap((entry) => {
        const definitions = entry.definitions.filter(
          (definition) =>
            fileMatches(definition.sourceRelativePath) &&
            (effectiveTool.value === null || definition.tool === effectiveTool.value),
        );
        return definitions.length === 0 ? [] : [{ entry, definitions }];
      });
      // The same per-tool collision machinery the projection applied,
      // through the shared assembly (skill-naming.ts) so the two surfaces
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
    this.mcpRows = computed<readonly McpInventoryEntryDto[]>(() =>
      (snapshot.value?.mcp ?? []).flatMap((entry) => {
        const declarations = entry.declarations.filter(
          (declaration) =>
            fileMatches(declaration.sourceRelativePath) &&
            (effectiveTool.value === null || declaration.tool === effectiveTool.value),
        );
        return declarations.length === 0 ? [] : [{ ...entry, declarations }];
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
            ? this.instructionRows.value.length
            : candidate === 'skill'
              ? this.skillRows.value.length
              : candidate === 'MCP'
                ? this.mcpRows.value.length
                : 0,
        );
      }
      return counts;
    });

    this.unrecognizedRows = computed(() => {
      // The union of every kind's inventory. A kind shipping its own
      // inventory adds itself here, or its files would be reported as
      // unrecognized while its own tab lists them.
      const recognized = new Set([
        ...(snapshot.value?.instructions ?? []).flatMap((entry) =>
          entry.files.map((file) => file.sourceRelativePath),
        ),
        ...(snapshot.value?.skills ?? []).flatMap((entry) =>
          entry.definitions.map((definition) => definition.sourceRelativePath),
        ),
        ...(snapshot.value?.mcp ?? []).flatMap((entry) =>
          entry.declarations.map((declaration) => declaration.sourceRelativePath),
        ),
      ]);
      // A companion belongs to the customization whose directory holds it, and
      // that customization already has a row — so a companion is excluded here
      // even when it carries a diagnostic. FR-003 is explicit that an
      // accompanying file acquires no inventory row of its own, and the row it
      // belongs to states the diagnostic instead: `SkillRow` resolves the
      // census files' diagnostics beside the definition, which is what keeps a
      // `partial` generation able to say which file (FR-028).
      const companions = new Set(
        (snapshot.value?.skills ?? []).flatMap((entry) =>
          entry.definitions.flatMap((definition) => definition.companionFiles),
        ),
      );
      return (snapshot.value?.files ?? []).filter(
        (file) =>
          !recognized.has(file.sourceRelativePath) &&
          !companions.has(file.sourceRelativePath) &&
          fileMatches(file.sourceRelativePath) &&
          // A file in no kind's inventory was recognized by no product, so no
          // tool selection can match it. Showing it under one would contradict
          // the filter the user set.
          effectiveTool.value === null,
      );
    });

    this.isNarrowed = computed(
      () => effectiveSourceId.value !== null || effectiveTool.value !== null || query.value !== '',
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
