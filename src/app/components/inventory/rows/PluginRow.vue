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
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceRootLine from '../SourceRootLine.vue';
import { pluginCarrierDetailRoute } from '../../plugin-detail-route';
import { familyComparisonPairsOf, type ComparisonSide } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { pluginComparisonRouteFor } from '../../../composables/plugin-comparison';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import { PLUGIN_CARRIER_TEXT } from '../../../../shared/api-text';
import {
  escapeControlCharacters,
  fileIdentityKey,
  SUPPORTED_TOOL_TEXT,
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
 * The row's heading text: the declared name through the shared label rule, so
 * a name built only from invisible code points still identifies its row
 * ({@link pathPresentationLabel}). Null for the no-name row, whose heading is
 * fixed copy. An authored empty name — strict JSON accepts `""` — gets its own
 * note, because the label rule has no characters to spell out and the row
 * would otherwise be headed by nothing.
 */
const nameText = computed(() =>
  props.entry.name === null
    ? null
    : props.entry.name === ''
      ? '(empty name)'
      : pathPresentationLabel(props.entry.name),
);

/** Whether {@link nameText} is the authored spelling rather than this product's note. */
const nameIsAuthored = computed(() => props.entry.name !== null && props.entry.name !== '');

/**
 * The row's name as accessible-name text: the single-line label rule, because
 * an accessible name is flattened and authored whitespace a drawn label
 * legitimately renders would collapse (WCAG 2.4.4).
 */
const nameAccessibleText = computed(() =>
  props.entry.name === null ? null : accessiblePresentationLabel(props.entry.name),
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

const carrierRows = computed(() =>
  props.entry.carriers.map((carrier) => ({
    /**
     * The tool leads the key so the pair cannot collide: a tool is a closed
     * enum with no space or U+0000 in it, and the carrier's Source joins the
     * halves because a consented home's carrier and a same-path carrier
     * elsewhere are two files (FR-030).
     */
    key: carrier.tool + '\u0000' + fileIdentityKey(carrier.sourceId, carrier.sourceRelativePath),
    /** The member's Source: what the family blocks and its directory line derive from. */
    sourceId: carrier.sourceId,
    /**
     * The carrier's path through the shared label rule rather than plain
     * escaping ({@link pathPresentationLabel}): a name built only from
     * whitespace or default-ignorable code points draws nothing, and this line
     * is what says which file the declaration is in.
     */
    pathText: pathPresentationLabel(carrier.sourceRelativePath),
    /** The link's accessible name; see {@link nameAccessibleText} for the rule. */
    pathAccessibleText: accessiblePresentationLabel(carrier.sourceRelativePath),
    /** What this file is to the plugin — its manifest, or a catalog listing it. */
    carrierText: PLUGIN_CARRIER_TEXT[carrier.carrier],
    toolText: SUPPORTED_TOOL_TEXT[carrier.tool],
    surfacesText: carrier.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', '),
    /**
     * The carrier's own detail, addressed by the file's path with the name
     * this row is headed by: a catalog carries every plugin it lists, so the
     * detail needs to know which of them the reader followed (FR-030). The
     * null row's carriers name no plugin, so their detail is the file's alone.
     */
    detailRoute: pluginCarrierDetailRoute(
      carrier.sourceRelativePath,
      carrier.tool,
      props.entry.name,
      null,
      sessionSources.selectorOf(carrier.sourceId),
    ),
    /** The kind's extraction diagnostics for this file (FR-028). */
    diagnosticIds: carrier.diagnosticIds,
    /** The census paths this carrier's offering reached, for {@link affectedShippedFiles}. */
    files: carrier.files,
  })),
);

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
    <p
      v-if="nameText !== null"
      class="aci-plugin-row__name"
      :class="nameIsAuthored ? 'aci-authored-text' : 'aci-muted'"
    >
      {{ nameText }}
    </p>
    <p v-else class="aci-plugin-row__name">No plugin name resolved</p>

    <!-- The carriers resolving this name, each linking to its own detail. The
         path is the link because it is what tells two carriers apart, and the
         accessible name adds the row's subject so links of several rows never
         announce identically (WCAG 2.4.6; label-in-name keeps the visible path
         as the prefix). What the file is to the plugin, which product
         recognizes it, and the surfaces that recognition rests on follow the
         link; naming a surface never claims it loaded the file (FR-009). -->
    <!-- One block per Source family (`SourceFamilyBlocks.vue`), each member
         rendered by this row. -->
    <SourceFamilyBlocks
      :members="carrierRows"
      :member-key="(carrier) => carrier.key"
      :entry-kinds="[...blockCompareRoutes.keys()]"
    >
      <template #member="{ member: carrier }">
        <p class="aci-plugin-row__owner">
          <NuxtLink
            :to="carrier.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="
              sessionSources.qualifiedLinkName(
                nameAccessibleText === null
                  ? carrier.pathAccessibleText
                  : `${carrier.pathAccessibleText}: ${nameAccessibleText}`,
                carrier.sourceId,
              )
            "
            >{{ carrier.pathText }}</NuxtLink
          >
          <span class="aci-plugin-row__carrier aci-muted">{{ carrier.carrierText }}</span>
          <span class="aci-plugin-row__tool aci-muted"
            >{{ carrier.toolText }}
            <span class="aci-plugin-row__surfaces">{{ carrier.surfacesText }}</span></span
          >
        </p>

        <SourceRootLine :source-id="carrier.sourceId" />
        <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />

        <!-- Shipped files whose read kept a diagnostic, named by path so the
             reader knows which file to open — the skill row's companion rule
             ({@link affectedShippedFiles}). -->
        <ul
          v-if="affectedShippedFiles(carrier).length > 0"
          class="aci-plugin-row__shipped-file-diagnostics"
          role="list"
        >
          <li v-for="shipped in affectedShippedFiles(carrier)" :key="shipped.path">
            <span class="aci-path aci-authored-text">{{ shipped.path }}</span>
            <RowDiagnostics :diagnostic-ids="shipped.diagnosticIds" :diagnostics="diagnostics" />
          </li>
        </ul>
      </template>

      <!-- The block's own comparison entry (FR-011): the family is where a
           pair of this row's members lives, so each block that holds two
           comparable identities offers its own — the instruction blocks'
           shape. The accessible name carries the row's identity always, and
           the family where two blocks each offer one (WCAG 2.4.6). -->
      <template #entry="{ block }">
        <p v-if="blockCompareRoutes.get(block.kind)" class="aci-plugin-row__compare">
          <NuxtLink
            :to="blockCompareRoutes.get(block.kind)!"
            :aria-label="`Compare this plugin with another copy: ${nameAccessibleText ?? ''}${
              blockCompareRoutes.size > 1 && block.familyText !== null
                ? ` (${block.familyText})`
                : ''
            }`"
            >Compare this plugin</NuxtLink
          >
        </p>
      </template>
    </SourceFamilyBlocks>

    <!-- What the plugin ships, stated as a count rather than listed: the files
         are the plugin's content, and the offering's own detail is where they
         are read. Stated even so, because the scan read them and a file the
         scan read is a file the reader can account for. -->
    <p v-if="shippedFileCount > 0" class="aci-note">
      {{ shippedFileCount }} file(s) in this plugin
    </p>
  </li>
</template>

<style scoped>
/* The comparison entry sits last, under everything the row states: it is a
   step out of the inventory rather than one of the row's own facts. */
.aci-plugin-row__compare {
  margin: 0.35rem 0 0;
}

/* The name leads the row, as every name-headed row's does: it is what a reader
   looks for, and the carriers that resolve it follow underneath. */
.aci-plugin-row__name {
  font-weight: 600;
  margin: 0;
}

.aci-plugin-row__owner {
  margin: 0;
}

.aci-plugin-row__carrier,
.aci-plugin-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-plugin-row__carrier::before,
.aci-plugin-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

.aci-plugin-row__surfaces {
  font-size: 0.85em;
}

.aci-plugin-row__surfaces::before {
  content: '(';
}

.aci-plugin-row__surfaces::after {
  content: ')';
}
</style>
