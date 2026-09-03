<script setup lang="ts">
// One row of the plugin inventory (T762). The kind's row unit is one resolved
// plugin name (data-model.md § Inventory unit), so the row is headed by that
// name and lists, under it, every carrier that resolves it: a catalog entry
// offering the plugin, or the plugin's own manifest
// (`api-types.ts` § PluginCarrierDto.carrier).
//
// The name is the admitting rule's answer, exactly as a skill row's invocation
// name is. Codex addresses a catalog's offering as `plugin@marketplace`, so one
// plugin name two catalogs offer is two rows and each ships the files of the
// plugin root its own entry names. Another product's plugin phase resolves its
// own names its own way, and one whose client reads a manifest at a fixed path
// lists that manifest as the carrier it is.
//
// Each carrier says which kind of carrier it is, because the two establish
// different things: a manifest is the plugin's own declaration of itself,
// while a catalog entry is a table saying which plugin comes from which
// source. Neither says the plugin is installed, enabled, trusted, or loaded —
// installation and enablement are User state this product never reads
// (FR-009).
//
// The one row whose name is null closes the list: the carriers that resolve no
// plugin name at all — a catalog listing nothing, and a carrier whose
// extraction failed, whose own diagnostic says the names are unknown rather
// than absent (FR-028).
//
// A row shows what was declared and where, never what a declaration says. The
// declared values — the source a catalog entry names — and the files the plugin
// ships are served by the carrier's own detail, one file at a time (FR-027).
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RecognitionMarks from '../RecognitionMarks.vue';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
import { pluginCarrierDetailRoute } from '../../plugin-detail-route';
import { familyComparisonPairsOf, type ComparisonSide } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { pluginComparisonRouteFor } from '../../../composables/plugin-comparison';
import { PLUGIN_CARRIER_TEXT } from '../../../../shared/api-text';
import {
  SUPPORTED_TOOL_ORDER,
  escapeControlCharacters,
  fileIdentityKey,
  accessiblePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  PluginInventoryEntryDto,
  SerializedDiagnostic,
  SourceKind,
} from '../../../../shared/api-types';
import type { NarrowedInventoryRow } from '../../../composables/filters';
import { AuthoredName } from '../../authored-name';

const props = defineProps<{
  /** The committed plugin entry to render: one declared plugin name, or the null row. */
  entry: NarrowedInventoryRow<PluginInventoryEntryDto>;
  /** The generation's diagnostics, resolved per carrier by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
  /**
   * The generation's files by Source and path, for resolving each carrier's
   * shipped-file census paths to the published read outcomes
   * ({@link affectedShippedFiles}).
   */
  filesBySource: ReadonlyMap<string, ReadonlyMap<string, CustomizationFileSummaryDto>>;
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The declared name this row is headed by, as every surface of the row needs
 * it — what is drawn, whether those are the file's characters, and what the
 * links announce ({@link AuthoredName}). Null for the no-name row, whose heading is fixed copy.
 */
const name = computed(() =>
  props.entry.name === null ? null : new AuthoredName(props.entry.name),
);

/**
 * The comparable identities of this row as route sides, in the row's own
 * order — the set no filter narrows
 * ({@link NarrowedInventoryRow.rowFileIdentities}).
 */
const comparableSides = computed<readonly ComparisonSide[]>(() => {
  // The row's own carrier identities — the set no filter narrows
  // ({@link NarrowedInventoryRow.rowFileIdentities}), already one entry per
  // carrier however many products recognize it, with a same-path carrier in
  // another Source a distinct one (FR-030).
  const sides = props.entry.rowFileIdentities.map((identity) => ({
    source: sessionSources.selectorOf(identity.sourceId),
    sourceRelativePath: identity.sourceRelativePath,
  }));
  return sides;
});

/**
 * Each family block's comparison entry — that family's first two comparable
 * identities, for the blocks that hold a pair (FR-011): a block's comparison
 * is that family's, and a pair never spans two families
 * (contracts/http-api.md § Host requirements #5), so a row whose blocks each
 * hold one member offers no entry — exactly as an instruction range's blocks
 * do. The comparison surface's own pickers take over from there
 * (`detail-route.ts` § familyComparisonPairsOf).
 */
/**
 * The comparison entry the row's own name line carries: the one family's
 * route, where the session holds one Source and so no family line exists to
 * close (`SourceFamilyBlocks.vue`).
 */
const headCompareRoute = computed(() => {
  const routes = [...blockCompareRoutes.value.values()];
  // Exactly when the row draws no family line to close: the entry lives on one
  // of the two lines and never on neither, so both read the one rule
  // (`session-sources.ts` § familyLineShownFor).
  const headed = sessionSources.familyLineShownFor(carrierRows.value);
  return headed || routes.length !== 1 ? null : routes[0]!;
});

const blockCompareRoutes = computed(() => {
  const routes = new Map<SourceKind, ReturnType<typeof pluginComparisonRouteFor>>();
  const name = props.entry.name;
  if (name === null) {
    // The closing no-name row: its carriers resolve no shared name to pair.
    return routes;
  }
  for (const [kind, [first, second]] of familyComparisonPairsOf(comparableSides.value)) {
    routes.set(kind, pluginComparisonRouteFor(kind, name, first, second));
  }
  return routes;
});

/**
 * How many files this plugin ships: the carriers' own lists together, counted
 * where the row states them. Each carrier publishes what its offering reached
 * (`api-types.ts` § PluginCarrierDto.files), and two carriers naming one
 * directory reach the same files, so the union is the plugin's whole
 * directory.
 */
const shippedFileCount = computed(
  () =>
    new Set(
      // Deduplicated by whole identity, never by path alone (FR-030): two
      // consented homes can hold one Source-relative Path, and counting
      // those as one file would understate what the plugin ships.
      props.entry.carriers.flatMap((carrier) =>
        carrier.files.map((path) => fileIdentityKey(carrier.sourceId, path)),
      ),
    ).size,
);

/**
 * The files that carry this plugin, one line each, with every product that
 * reads that file stated on it.
 *
 * Grouped by the file rather than published as the wire does. A
 * `PluginCarrierDto` is one `(file, tool)` pair — its `tool` is the recognition
 * the carrier is — so a catalog three products read arrives as three carriers
 * of one file, and listing them as published put the same path on three lines.
 * A row's line is a file wherever this product lists one, and its count says
 * how many files (FR-007).
 *
 * What differs per product is where the line goes: a plugin's detail is that
 * product's own reading of the carrier, so each mark opens its own and the
 * path opens nothing. Every other kind has one detail per file and keeps the
 * path as the link (`RecognitionMarks.vue`).
 */
const carrierRows = computed(() => {
  // Grouped by the file's whole identity — Source and Source-relative Path
  // (FR-030): a consented home's carrier and a same-path carrier elsewhere are
  // two files however identical their spelling. U+0000 joins the halves
  // because no Source ID contains it.
  const byFile = Map.groupBy(props.entry.carriers, (carrier) =>
    fileIdentityKey(carrier.sourceId, carrier.sourceRelativePath),
  );
  return [...byFile.values()].map((carriers) => {
    const { sourceId, sourceRelativePath } = carriers[0]!;
    const pathAccessibleText = accessiblePresentationLabel(sourceRelativePath);
    return {
      key: fileIdentityKey(sourceId, sourceRelativePath),
      /** The member's Source: what the family blocks and its home badge derive from. */
      sourceId,
      /**
       * The carrier's path through the shared label rule rather than plain
       * escaping ({@link pathPresentationLabel}): a name built only from
       * whitespace or default-ignorable code points draws nothing, and this
       * line is what says which file the declarations are in.
       */
      pathText: pathPresentationLabel(sourceRelativePath),
      /**
       * What this file is to the plugin — its manifest, or a catalog listing
       * it. The form is the file's, so the first carrier answers for it: a
       * file is one form whichever product read it.
       */
      carrierText: PLUGIN_CARRIER_TEXT[carriers[0]!.carrier],
      /**
       * The file's own detail, opened at the reading of the first product in
       * the closed tool order that recognizes it. The path is the link here as
       * it is in every other kind's list, because this list shows no
       * per-product difference — which product's reading a page answers for
       * changes the shipped-file count on the detail, and that is where the
       * other readings are reached from (`plugins/detail`). A reader who
       * learned to press the path in ten lists presses it in the eleventh.
       */
      detailRoute: pluginCarrierDetailRoute(
        sourceRelativePath,
        SUPPORTED_TOOL_ORDER.find((tool) => carriers.some((carrier) => carrier.tool === tool)) ??
          carriers[0]!.tool,
        props.entry.name,
        null,
        sessionSources.selectorOf(sourceId),
      ),
      /**
       * What a screen reader announces the path link as: the file and the
       * plugin it is a carrier of, since one carrier declares several and the
       * row's own name is what tells this link from the others (WCAG 2.4.4).
       * No product is named — the link opens the file, and the marks beside it
       * state what recognized it.
       */
      pathAccessibleText: sessionSources.qualifiedLinkName(
        `${pathAccessibleText}${name.value === null ? '' : `: ${name.value.accessibleText}`}`,
        sourceId,
      ),
      /**
       * Each product that reads the file, with the surfaces its admission
       * rests on. Marks rather than links: what the list shows of this file
       * does not vary by product ({@link RecognitionMarks}).
       */
      recognitions: carriers.map((carrier) => ({
        tool: carrier.tool,
        surfaces: carrier.surfaces,
      })),
      /**
       * The kind's extraction diagnostics for this file, deduplicated: one
       * extraction per `(file, kind)` means every carrier of one file points
       * at the same record (FR-028).
       */
      diagnosticIds: [...new Set(carriers.flatMap((carrier) => carrier.diagnosticIds))],
      /**
       * The census paths this file's offerings reached, for
       * {@link affectedShippedFiles}. Deduplicated across the products, which
       * name the same root and so reach the same files.
       */
      files: [...new Set(carriers.flatMap((carrier) => carrier.files))],
    };
  });
});

/**
 * The shipped files of one carrier that carry a diagnostic, each with the
 * presentation form of its path.
 *
 * A shipped file gets no inventory row of its own (FR-003), so a failed read
 * inside the plugin's directory would otherwise be visible nowhere on this
 * page — the generation would say `partial` with nothing naming the cause
 * (FR-028). It is stated here, inside the row of the plugin whose directory
 * holds it, exactly as a skill row states its companions (`SkillRow.vue`
 * § affectedCompanions).
 */
function affectedShippedFiles(carrier: {
  readonly sourceId: string;
  readonly files: readonly string[];
}): readonly { path: string; diagnosticIds: readonly string[] }[] {
  // The census paths are the carrier's Source's, so they resolve under that
  // Source alone (FR-030). The row's own carriers are excluded: a carrier
  // sits inside the root it names, so its file diagnostic would otherwise
  // render twice — once on its carrier line and again here as a shipped
  // file of itself.
  const carrierKeys = new Set(
    props.entry.carriers.map((entryCarrier) =>
      fileIdentityKey(entryCarrier.sourceId, entryCarrier.sourceRelativePath),
    ),
  );
  const sourceFiles = props.filesBySource.get(carrier.sourceId);
  return carrier.files.flatMap((sourceRelativePath) => {
    const published = sourceFiles?.get(sourceRelativePath);
    return published === undefined ||
      published.diagnosticIds.length === 0 ||
      carrierKeys.has(fileIdentityKey(carrier.sourceId, sourceRelativePath))
      ? []
      : [
          {
            path: escapeControlCharacters(sourceRelativePath),
            diagnosticIds: published.diagnosticIds,
          },
        ];
  });
}
</script>

<template>
  <li class="aci-item">
    <!-- The declared plugin name heads the row — the row's own identity, in
         the spelling its carrier wrote (FR-007). The no-name row gets plain
         copy about the name alone, because that is the only thing missing in
         either case it holds: an entry that declared no name, whose own
         declaration is listed below it, and a carrier whose declarations could
         not be read, whose diagnostic says so beside it (FR-028). Copy denying
         the declarations would contradict the ones on the row. -->
    <p class="aci-row-head">
      <span
        v-if="name !== null"
        class="aci-row-head__name"
        :class="name.isAuthored ? 'aci-authored-text' : 'aci-muted'"
        >{{ name.text }}</span
      >
      <span v-else class="aci-row-head__name">No plugin name resolved</span>
      <span class="aci-row-head__count"
        >{{ carrierRows.length }} {{ carrierRows.length === 1 ? 'file' : 'files' }}</span
      >
      <!-- The comparison entry, where this row has one family and so no family
           line of its own to close (`SourceFamilyBlocks.vue`). -->
      <span v-if="headCompareRoute" class="aci-row-head__end">
        <NuxtLink
          :to="headCompareRoute"
          :aria-label="`Compare this plugin with another copy: ${name?.accessibleText ?? ''}`"
          >Compare</NuxtLink
        >
      </span>
    </p>

    <!-- The carriers resolving this name, each linking to its own detail. The
         path is the link because it is what tells two carriers apart, and the
         accessible name adds the row's subject so links of several rows never
         announce identically (WCAG 2.4.6; label-in-name keeps the visible path
         as the prefix). What the file is to the plugin stands beside the path,
         because a plugin declaration lives in a file that is not its own, and
         the recognizing product is drawn by its mark with the surfaces that
         recognition rests on; naming a surface never claims it loaded the file
         (FR-009). -->
    <!-- One block per Source family (`SourceFamilyBlocks.vue`), each member
         rendered by this row. -->
    <SourceFamilyBlocks :members="carrierRows" :member-key="(carrier) => carrier.key">
      <template #member="{ member: carrier }">
        <div class="aci-row-file">
          <span class="aci-row-file__path">
            <SourceHomeBadge :source-id="carrier.sourceId" />
            <NuxtLink
              :to="carrier.detailRoute"
              class="aci-path aci-authored-text"
              :aria-label="carrier.pathAccessibleText"
              >{{ carrier.pathText }}</NuxtLink
            >
            <span class="aci-carrier-kind">{{ carrier.carrierText }}</span>
            <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />
            <!-- Shipped files whose read kept a diagnostic, named by path so
                 the reader knows which file to open — the skill row's companion
                 rule ({@link affectedShippedFiles}). -->
            <template v-for="shipped in affectedShippedFiles(carrier)" :key="shipped.path">
              <span class="aci-path aci-authored-text">{{ shipped.path }}</span>
              <RowDiagnostics :diagnostic-ids="shipped.diagnosticIds" :diagnostics="diagnostics" />
            </template>
          </span>
          <RecognitionMarks :recognitions="carrier.recognitions" />
          <span class="aci-row-file__end" />
        </div>
      </template>

      <!-- The block's own comparison entry (FR-011): the family is where a
           pair of this row's members lives, so each block that holds two
           comparable identities offers its own — the instruction blocks'
           shape. The accessible name carries the row's identity always, and
           the family where two blocks each offer one (WCAG 2.4.6). -->
      <template #entry="{ block }">
        <NuxtLink
          v-if="blockCompareRoutes.get(block.kind)"
          :to="blockCompareRoutes.get(block.kind)!"
          :aria-label="`Compare this plugin with another copy: ${name?.accessibleText ?? ''}${
            block.familyText !== null ? ` (${block.familyText})` : ''
          }`"
          >Compare</NuxtLink
        >
      </template>
    </SourceFamilyBlocks>

    <!-- What the plugin ships, stated as a count rather than listed: the files
         are the plugin's content, and the offering's own detail is where they
         are read. Stated even so, because the scan read them and a file the
         scan read is a file the reader can account for.

         `Ships` rather than a second `N files`: the head above already counts
         this row's own files — the carriers that declare the plugin, the same
         count every name-headed row states — and two counts of different things
         in the same word, one line apart, read as one number contradicting
         itself. -->
    <p v-if="shippedFileCount > 0" class="aci-row-note">
      Ships {{ shippedFileCount }} {{ shippedFileCount === 1 ? 'file' : 'files' }}
    </p>
  </li>
</template>
