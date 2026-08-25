<script setup lang="ts">
// One row of the plugin inventory (T762). The kind's row unit is one resolved
// plugin name (data-model.md § Inventory unit), so the row is headed by that
// name and lists, under it, the declarations of the offering — today always a
// catalog entry, since every shipped rule admits a catalog.
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
import { pluginCarrierDetailRoute } from '../../plugin-detail-route';
import { pluginComparisonRouteFor } from '../../../composables/plugin-comparison';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import { PLUGIN_CARRIER_TEXT } from '../../../../shared/api-text';
import {
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import type { PluginInventoryEntryDto, SerializedDiagnostic } from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed plugin entry to render: one declared plugin name, or the null row. */
  entry: PluginInventoryEntryDto;
  /** The generation's diagnostics, resolved per carrier by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

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
  props.entry.name === null ? null : inlinePresentationLabel(props.entry.name),
);

/**
 * Where this row's comparison opens, or null when it has none: a comparison
 * needs one plugin name declared in two distinct files, and the row's first
 * two carrier paths are the pair the link names. The compare route's own
 * pickers take over from there — they hold this row's every carrier, so the
 * reader steps to any other pair on the comparison itself instead of
 * composing one here. One file that several products recognize is one carrier
 * of the row, so a row whose carriers are all that file offers no comparison:
 * the two sides would be the same document. The no-name row links none: its
 * carriers resolve no plugin a comparison would be about.
 */
const compareRoute = computed(() => {
  if (props.entry.name === null) {
    return null;
  }
  const name = props.entry.name;
  const [first, second] = new Set(
    props.entry.carriers.map((carrier) => carrier.sourceRelativePath),
  );
  return first !== undefined && second !== undefined
    ? pluginComparisonRouteFor(name, first, second)
    : null;
});

/**
 * How many files this plugin ships: the carriers' own lists together, counted
 * where the row states them. Each carrier publishes what its offering reached
 * (`api-types.ts` § PluginCarrierDto.files), and two carriers naming one
 * directory reach the same files, so the union is the plugin's whole
 * directory.
 */
const shippedFileCount = computed(
  () => new Set(props.entry.carriers.flatMap((carrier) => carrier.files)).size,
);

const carrierRows = computed(() =>
  props.entry.carriers.map((carrier) => ({
    /**
     * The tool leads the key so the pair cannot collide: a tool is a closed
     * enum with no space in it, so one space after it separates the two halves
     * whatever the path contains.
     */
    key: `${carrier.tool} ${carrier.sourceRelativePath}`,
    /**
     * The carrier's path through the shared label rule rather than plain
     * escaping ({@link pathPresentationLabel}): a name built only from
     * whitespace or default-ignorable code points draws nothing, and this line
     * is what says which file the declaration is in.
     */
    pathText: pathPresentationLabel(carrier.sourceRelativePath),
    /** The link's accessible name; see {@link nameAccessibleText} for the rule. */
    pathAccessibleText: inlinePresentationLabel(carrier.sourceRelativePath),
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
    ),
    /** The kind's extraction diagnostics for this file (FR-028). */
    diagnosticIds: carrier.diagnosticIds,
  })),
);
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
    <ul class="aci-plugin-row__carriers" role="list">
      <li v-for="carrier in carrierRows" :key="carrier.key">
        <p class="aci-plugin-row__owner">
          <NuxtLink
            :to="carrier.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="
              nameAccessibleText === null
                ? carrier.pathAccessibleText
                : `${carrier.pathAccessibleText}: ${nameAccessibleText}`
            "
            >{{ carrier.pathText }}</NuxtLink
          >
          <span class="aci-plugin-row__carrier aci-muted">{{ carrier.carrierText }}</span>
          <span class="aci-plugin-row__tool aci-muted"
            >{{ carrier.toolText }}
            <span class="aci-plugin-row__surfaces">{{ carrier.surfacesText }}</span></span
          >
        </p>
        <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>

    <!-- What the plugin ships, stated as a count rather than listed: the files
         are the plugin's content, and the offering's own detail is where they
         are read. Stated even so, because the scan read them and a file the
         scan read is a file the reader can account for. -->
    <p v-if="shippedFileCount > 0" class="aci-note">
      {{ shippedFileCount }} file(s) in this plugin
    </p>

    <p v-if="compareRoute !== null" class="aci-plugin-row__compare">
      <!-- The accessible name carries the row's plugin name after the visible
           phrase: in a links list every comparable row would otherwise
           announce identically (WCAG 2.4.6; label-in-name keeps the visible
           phrase as the prefix). -->
      <NuxtLink
        :to="compareRoute"
        :aria-label="`Compare this plugin with another copy: ${nameAccessibleText ?? ''}`"
        >Compare this plugin</NuxtLink
      >
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

/* The carriers, set under the name by an indent and a rule, matching how the
   MCP and command rows group their own. */
.aci-plugin-row__carriers {
  list-style: none;
  margin: 0.2rem 0 0;
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}

.aci-plugin-row__carriers > li + li {
  margin-block-start: 0.35rem;
}

.aci-plugin-row__carriers p {
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
