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
import AuthoredNameText from '../../AuthoredNameText.vue';
import RecognitionMarks from '../RecognitionMarks.vue';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
import { familyComparisonPairsOf, detailRoute, type ComparisonSide } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { hookEventDetailRoute } from '../../hook-detail-route';
import { hookComparisonRouteFor } from '../../../composables/hook-comparison';
import {
  UNNAMED_ROW_TEXT,
  fileIdentityKey,
  accessiblePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import { HOOK_CARRIER_FORM_TEXT } from '../../../../shared/api-text';
import type {
  HookInventoryEntryDto,
  SerializedDiagnostic,
  SourceKind,
} from '../../../../shared/api-types';
import type { NarrowedInventoryRow } from '../../../composables/filters';
import { AuthoredName } from '../../authored-name';

const props = defineProps<{
  /** The committed hook entry to render: one declared event, or the null row. */
  entry: NarrowedInventoryRow<HookInventoryEntryDto>;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The declared name this row is headed by, as every surface of the row needs
 * it — what is drawn, whether those are the file's characters, and what the
 * links announce ({@link AuthoredName}). Null for the no-event row, whose heading is fixed copy.
 */
const event = computed(() =>
  props.entry.event === null ? null : new AuthoredName(props.entry.event),
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
  // Grouped by the carrier's whole identity — Source and Source-relative
  // Path (FR-030): a consented home's carrier and a same-path carrier
  // elsewhere are two files however identical their spelling. U+0000 joins
  // the halves because no Source ID contains it.
  const byCarrier = Map.groupBy(props.entry.declarations, (declaration) =>
    fileIdentityKey(declaration.sourceId, declaration.sourceRelativePath),
  );
  return [...byCarrier.values()].map((declarations) => {
    const { sourceId, sourceRelativePath } = declarations[0]!;
    return {
      key: fileIdentityKey(sourceId, sourceRelativePath),
      /** The member's Source: what the family blocks and its directory line derive from. */
      sourceId: sourceId,
      carrierText: pathPresentationLabel(sourceRelativePath),
      // The accessible name goes through the single-line label rule instead:
      // an accessible name is flattened, so authored whitespace that the drawn
      // label legitimately renders would collapse and two different carriers
      // could announce identically (FR-025, {@link accessiblePresentationLabel}).
      carrierAccessibleText: accessiblePresentationLabel(sourceRelativePath),
      // The form is the carrier's, so the first declaration answers for it: a
      // file is one form whichever product read it.
      formText:
        declarations[0] === undefined ? null : HOOK_CARRIER_FORM_TEXT[declarations[0].carrier],
      recognitions: declarations,
      detailRoute:
        props.entry.event === null
          ? detailRoute('hook', sourceRelativePath, sessionSources.selectorOf(sourceId))
          : hookEventDetailRoute(
              sourceRelativePath,
              props.entry.event,
              sessionSources.selectorOf(sourceId),
            ),
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
    };
  });
});

/**
 * The comparable identities of this row as route sides, in the row's own
 * order — the set no filter narrows
 * ({@link NarrowedInventoryRow.rowFileIdentities}).
 */
const comparableSides = computed<readonly ComparisonSide[]>(() => {
  // The row's own carrier identities — the set no filter narrows
  // ({@link NarrowedInventoryRow.rowFileIdentities}), already one entry per
  // carrier however many products read it, with a same-path carrier in
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
const headCompareRoute = computed(() =>
  sessionSources.headEntryOf(carrierRows.value, blockCompareRoutes.value),
);

const blockCompareRoutes = computed(() => {
  const routes = new Map<SourceKind, ReturnType<typeof hookComparisonRouteFor>>();
  const event = props.entry.event;
  if (event === null) {
    // The closing no-event row: its carriers share no declared event to pair.
    return routes;
  }
  for (const [kind, [first, second]] of familyComparisonPairsOf(comparableSides.value)) {
    routes.set(kind, hookComparisonRouteFor(kind, event, first, second));
  }
  return routes;
});
</script>

<template>
  <li class="aci-item">
    <!-- The declared event heads the row — the row's own identity, in the same
         spelling its carrier wrote (FR-007). The no-event row gets plain copy
         that says the events are not known rather than not declared, because
         it also holds a carrier whose hook block could not be read
         (FR-028). -->
    <p class="aci-row-head">
      <AuthoredNameText v-if="event !== null" :name="event">
        <span
          class="aci-row-head__name"
          :class="event.isAuthored ? 'aci-authored-text' : 'aci-muted'"
          >{{ event.text }}</span
        >
      </AuthoredNameText>
      <span v-else class="aci-row-head__name">{{ UNNAMED_ROW_TEXT['hook'] }}</span>
      <span class="aci-row-head__count"
        >{{ carrierRows.length }} {{ carrierRows.length === 1 ? 'file' : 'files' }}</span
      >
      <!-- The comparison entry, where this row has one family and so no family
           line of its own to close (`SourceFamilyBlocks.vue`). -->
      <span v-if="headCompareRoute" class="aci-row-head__end">
        <NuxtLink
          :to="headCompareRoute"
          :aria-label="`Compare this event's declarations: ${event?.accessibleText ?? ''}`"
          >Compare</NuxtLink
        >
      </span>
    </p>

    <!-- The carriers declaring this event, each linking to its own detail: the
         groups the file wrote under this key, never the file's bytes (FR-007).
         The carrier path is the link because it is what distinguishes the
         declarations of one event, and the accessible name adds the row's
         subject so links of several rows never announce identically (WCAG
         2.4.6; label-in-name keeps the visible path as the prefix). The
         carrier's documented form stands beside the path because a hook
         declaration lives in a file that is not its own, and each recognizing
         product is drawn by its mark with the surfaces its admission rests on;
         naming a surface never claims it ran the hook (FR-009). -->
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
              :aria-label="
                sessionSources.qualifiedLinkName(
                  event === null
                    ? carrier.carrierAccessibleText
                    : `${event.accessibleText} in ${carrier.carrierAccessibleText}`,
                  carrier.sourceId,
                )
              "
              >{{ carrier.carrierText }}</NuxtLink
            >
            <span v-if="carrier.formText !== null" class="aci-carrier-kind">{{
              carrier.formText
            }}</span>
            <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />
          </span>
          <RecognitionMarks :recognitions="carrier.recognitions" />
          <span class="aci-row-file__end" />
        </div>
        <!-- Which of the no-event row's two states this carrier is in: the
             sentence is the carrier's own, so it sits under the carrier's line
             rather than on the row (FR-028). -->
        <p v-if="carrier.stateText !== null" class="aci-row-note">{{ carrier.stateText }}</p>
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
          :aria-label="`Compare this event's declarations: ${event?.accessibleText ?? ''}${
            block.familyText !== null ? ` (${block.familyText})` : ''
          }`"
          >Compare</NuxtLink
        >
      </template>
    </SourceFamilyBlocks>
  </li>
</template>
