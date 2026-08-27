<script setup lang="ts">
// One row of the hook inventory (T842). The kind's row unit is one declared
// lifecycle event (data-model.md § Inventory unit), so the row is headed by
// that event and lists, under it, every declaration declaring it — one per
// `(carrier, tool)` on the wire, drawn as one line per carrier because one
// physical file is one link however many products recognize it, with each
// recognizing product and its surfaces stated beside the link. A second
// carrier declaring the same event joins this row rather than starting
// another, which is what a reader needs to see: the vendor loads every
// matching hook of every active source rather than choosing one.
//
// Each line also says which documented form the carrier is — a file whose
// whole purpose is hooks, or a table inside a file admitted for other content
// too — because one layer can hold both and they are separate files with
// separate declarations.
//
// The one row whose event is null closes the list: the carriers currently
// publishing no event. Each such carrier states its own fact — an unreadable
// hook block leaves the events unknown rather than absent (FR-028), while a
// carrier that declares none is a finding, not an empty screen — and links to
// the carrier's file-unit view, which is the view with no declaration to
// select.
//
// A row shows what was declared and where — never what a declaration says.
// The declared matchers, commands, and handlers are served by the
// declaration's detail, one file at a time (FR-027). Nothing here is a claim
// that a session reviewed, trusted, or ran a hook: an admission is not an
// activation (FR-009), and inspection never runs a declared command (FR-020).
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import { detailRoute } from '../../detail-route';
import { hookEventDetailRoute } from '../../hook-detail-route';
import { hookComparisonRouteFor } from '../../../composables/hook-comparison';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import {
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import { HOOK_CARRIER_FORM_TEXT } from '../../../../shared/api-text';
import type { HookInventoryEntryDto, SerializedDiagnostic } from '../../../../shared/api-types';
import type { NarrowedInventoryRow } from '../../../composables/filters';

const props = defineProps<{
  /** The committed hook entry to render: one declared event, or the null row. */
  entry: NarrowedInventoryRow<HookInventoryEntryDto>;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The row's heading text: the declared event through the shared label rule, so
 * an event name built only from invisible code points still identifies its row
 * ({@link pathPresentationLabel}). Null for the no-event row, whose heading is
 * fixed copy. The empty name — strict JSON and TOML both accept `""` as a
 * key — gets its own note the way an empty declared value does, because the
 * label rule has no characters to spell out and the row would otherwise be
 * headed by nothing.
 */
const eventText = computed(() =>
  props.entry.event === null
    ? null
    : props.entry.event === ''
      ? '(empty name)'
      : pathPresentationLabel(props.entry.event),
);

/**
 * Whether {@link eventText} is the authored spelling rather than this
 * product's note, which decides the heading's authored-text styling.
 */
const eventIsAuthored = computed(() => props.entry.event !== null && props.entry.event !== '');

/**
 * The row's event as accessible-name text: the single-line label rule, because
 * an accessible name collapses whitespace and would read two invisibly
 * different names as one ({@link inlinePresentationLabel}); the no-event and
 * empty-name cases keep the same copy the visible heading shows.
 */
const eventAccessibleText = computed(() =>
  props.entry.event === null
    ? null
    : props.entry.event === ''
      ? '(empty name)'
      : inlinePresentationLabel(props.entry.event),
);

/**
 * Each carrier as the line the row renders for it, holding every declaration
 * of this event in that file — one physical carrier is one line and one link
 * however many products recognize it, because two links with one accessible
 * name and one destination would be the same control twice (WCAG 2.4.6). The
 * line links to this declaration's own detail on a named row, and to the
 * carrier's file-unit view on the no-event row, where there is no declaration
 * to select. The carrier's own diagnostics — where the extraction-failure
 * record lives (FR-028) — are the carrier's, shared by its recognitions,
 * because the extraction ran once per file.
 */
const carrierRows = computed(() => {
  const byCarrier = Map.groupBy(
    props.entry.declarations,
    (declaration) => declaration.sourceRelativePath,
  );
  return [...byCarrier.entries()].map(([sourceRelativePath, declarations]) => ({
    key: sourceRelativePath,
    carrierText: pathPresentationLabel(sourceRelativePath),
    // The accessible name goes through the single-line label rule instead:
    // an accessible name is flattened, so authored whitespace that the drawn
    // label legitimately renders would collapse and two different carriers
    // could announce identically (FR-025, {@link inlinePresentationLabel}).
    carrierAccessibleText: inlinePresentationLabel(sourceRelativePath),
    // The form is the carrier's, so the first declaration answers for it: a
    // file is one form whichever product read it.
    formText:
      declarations[0] === undefined ? null : HOOK_CARRIER_FORM_TEXT[declarations[0].carrier],
    recognitions: declarations.map((declaration) => ({
      tool: declaration.tool,
      toolText: SUPPORTED_TOOL_TEXT[declaration.tool],
      surfacesText: declaration.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', '),
    })),
    detailRoute:
      props.entry.event === null
        ? detailRoute('hook', sourceRelativePath)
        : hookEventDetailRoute(sourceRelativePath, props.entry.event),
    // The no-event row's members tell their two states apart (FR-028): a
    // failed extraction leaves the events unknown, a parsed carrier with no
    // declaration declares none. Null on named rows, whose declarations are
    // always parsed. Any failed reading of the carrier makes the sentence the
    // unknown one: a carrier is read once per product, so one file can hold a
    // reading that failed beside one that parsed and declared nothing.
    stateText:
      props.entry.event !== null
        ? null
        : declarations.some((declaration) => declaration.parseStatus === 'failed')
          ? 'The hook declarations in this file could not be read.'
          : 'This file declares no hooks.',
    // The hook recognitions' own records, not the file's whole list: a file can
    // carry several kinds — a `.codex/config.toml` carries three — and each
    // failure is one record per (file, kind) (FR-028), so showing the file's
    // list here would report another row's failure as this one's. Deduplicated
    // because one carrier's declarations republish the one record.
    diagnosticIds: [...new Set(declarations.flatMap((declaration) => declaration.diagnosticIds))],
  }));
});

/**
 * The comparison this row links to — this declared event's declarations in its
 * first two carriers — or null when the event is declared by fewer than two,
 * where a link would open a comparison with nothing to pair. Every carrier of
 * a named row is comparable by the row's own invariant: its declarations are
 * parsed — a carrier whose reading failed publishes no event, and a binary
 * carrier is diagnostic-only — so its declarations were read
 * (`api-types.ts` § HookDeclarationDto.parseStatus). The compare route's own
 * pickers take over from there: they hold this row's every carrier, so the
 * reader steps to any other pair on the comparison itself instead of composing
 * one here. The no-event row links none: its carriers publish no declaration a
 * comparison would serialize.
 *
 * The pair is drawn from the row's own files rather than from the members a
 * filter left, so the link a reader followed is still there when they come
 * back to the unnarrowed list ({@link NarrowedInventoryRow}).
 */
const compareRoute = computed(() => {
  const event = props.entry.event;
  if (event === null) {
    return null;
  }
  const [first, second] = props.entry.rowFilePaths;
  return first !== undefined && second !== undefined
    ? hookComparisonRouteFor(event, first, second)
    : null;
});
</script>

<template>
  <li class="aci-item">
    <!-- The declared event heads the row — the row's own identity, in the same
         spelling its carrier wrote (FR-007). The no-event row gets plain copy
         that says the events are not known rather than not declared, because
         it also holds a carrier whose hook block could not be read
         (FR-028). -->
    <p
      v-if="eventText !== null"
      class="aci-hook-row__event"
      :class="eventIsAuthored ? 'aci-authored-text' : 'aci-muted'"
    >
      {{ eventText }}
    </p>
    <p v-else class="aci-hook-row__event">No known hook declarations</p>

    <!-- The carriers declaring this event, each linking to its own detail: the
         groups the file wrote under this key, never the file's bytes (FR-007).
         The carrier path is the link because it is what distinguishes the
         declarations of one event, and the accessible name adds the row's
         subject so links of several rows never announce identically (WCAG
         2.4.6; label-in-name keeps the visible path as the prefix). The
         carrier's documented form and each recognizing product trail the link,
         the way an instruction row states its recognitions; naming a surface
         never claims it ran the hook (FR-009). -->
    <ul class="aci-hook-row__declarations" role="list">
      <li v-for="carrier in carrierRows" :key="carrier.key">
        <p class="aci-hook-row__owner">
          <NuxtLink
            :to="carrier.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="
              eventAccessibleText === null
                ? carrier.carrierAccessibleText
                : `${carrier.carrierAccessibleText}: ${eventAccessibleText}`
            "
            >{{ carrier.carrierText }}</NuxtLink
          >
          <span v-if="carrier.formText !== null" class="aci-hook-row__form aci-muted">{{
            carrier.formText
          }}</span>
          <span
            v-for="recognition in carrier.recognitions"
            :key="recognition.tool"
            class="aci-hook-row__tool aci-muted"
            >{{ recognition.toolText }}
            <span class="aci-hook-row__surfaces">{{ recognition.surfacesText }}</span></span
          >
        </p>
        <p v-if="carrier.stateText !== null" class="aci-muted">{{ carrier.stateText }}</p>
        <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>

    <p v-if="compareRoute !== null" class="aci-hook-row__compare">
      <!-- The accessible name carries the row's declared event after the
           visible phrase: in a links list every comparable row would otherwise
           announce identically (WCAG 2.4.6; label-in-name keeps the visible
           phrase as the prefix). -->
      <NuxtLink
        :to="compareRoute"
        :aria-label="`Compare this event's declarations: ${eventAccessibleText ?? ''}`"
        >Compare this event's declarations</NuxtLink
      >
    </p>
  </li>
</template>

<style scoped>
/* The comparison entry sits under the declarations it pairs, as the sibling
   rows' does. */
.aci-hook-row__compare {
  margin: 0.3rem 0 0;
}

.aci-hook-row__event {
  margin: 0;
  font-weight: 600;
}

/* The declarations of the event, set under it by an indent and a rule,
   matching how an MCP row groups its carriers under the declared name. */
.aci-hook-row__declarations {
  list-style: none;
  margin: 0.2rem 0 0;
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}

.aci-hook-row__declarations > li + li {
  margin-block-start: 0.4rem;
}

.aci-hook-row__owner {
  margin: 0;
}

/* The carrier's documented form and each recognizing product trail the
   carrier on the same line, set apart by a separator, matching how an MCP
   row's products trail its path. */
.aci-hook-row__form,
.aci-hook-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-hook-row__form::before,
.aci-hook-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

/* The surfaces qualify their own product within the same span: the product
   alone does not say where it reads the file from once two surfaces document
   different lookup bases. */
.aci-hook-row__surfaces {
  font-size: 0.85em;
}

.aci-hook-row__surfaces::before {
  content: '(';
}

.aci-hook-row__surfaces::after {
  content: ')';
}
</style>
