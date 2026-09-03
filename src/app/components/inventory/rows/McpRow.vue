<script setup lang="ts">
// One row of the MCP inventory (T290, carrier-grouped by T343). The kind's
// row unit is one declared server name (data-model.md § Inventory unit), so
// the row is headed by that name and lists, under it, every declaration
// resolving it — one per `(carrier, tool)` on the wire, drawn as one line per
// carrier because one physical file is one link however many products
// recognize it (the root `.mcp.json` is Claude's project file and a Copilot
// CLI workspace file at once), with each recognizing product and its surfaces
// stated beside the link. A second carrier declaring the same name joins this
// row rather than starting another.
//
// The one row whose name is null closes the list: the carriers currently
// publishing no named declaration. Each such carrier states its own fact —
// an unreadable declaration block leaves the rows unknown rather than absent
// (FR-028), while a carrier that declares none is a finding, not an empty
// screen — and links to the carrier's file-unit view, which is the view with
// no declaration to select.
//
// A row shows what was declared and where — never what a declaration says.
// The declared values (commands, URLs, headers, environment) are served by
// the declaration's detail, one file at a time (FR-027). Nothing here is a
// claim that a session enabled, trusted, or connected to a server: an
// admission is not an activation (FR-009), and inspection never connects.
import { computed } from 'vue';
import { NuxtLink } from '#components';
import AuthoredNameText from '../../AuthoredNameText.vue';
import RecognitionMarks from '../RecognitionMarks.vue';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
import { familyComparisonPairsOf, detailRoute, type ComparisonSide } from '../../detail-route';
import { AuthoredName } from '../../authored-name';
import { useSessionSources } from '../../../composables/session-sources';
import { mcpServerDetailRoute } from '../../mcp-detail-route';
import { mcpComparisonRouteFor } from '../../../composables/mcp-comparison';
import {
  UNNAMED_ROW_TEXT,
  fileIdentityKey,
  accessiblePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import type {
  McpInventoryEntryDto,
  SerializedDiagnostic,
  SourceKind,
} from '../../../../shared/api-types';
import type { NarrowedInventoryRow } from '../../../composables/filters';

const props = defineProps<{
  /** The committed MCP entry to render: one declared server name, or the null row. */
  entry: NarrowedInventoryRow<McpInventoryEntryDto>;
  /** The generation's diagnostics, resolved per declaration by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The declared name this row is headed by, as every surface of the row needs
 * it — what is drawn, whether those are the file's characters, and what the
 * links announce ({@link AuthoredName}). Null for the no-name row, whose
 * heading is fixed copy.
 */
const name = computed(() =>
  props.entry.name === null ? null : new AuthoredName(props.entry.name),
);

/**
 * Each carrier as the line the row renders for it, holding every declaration
 * the name resolves to in that file — one physical carrier is one line and
 * one link however many products recognize it, because two links with one
 * accessible name and one destination would be the same control twice
 * (WCAG 2.4.6). The line links to this declaration's own detail on a named
 * row, and to the carrier's file-unit view on the no-name row, where there is
 * no declaration to select; each recognizing product is stated beside the
 * link with the surfaces its admission rests on, exactly as an instruction
 * row states its recognitions. The no-name row's per-carrier state sentence
 * and the carrier's diagnostics come from that carrier's own declarations:
 * one file is read once, but it is read *per product*, so one carrier can
 * hold a reading that failed beside one that parsed — a root `.mcp.json` is
 * JSONC to Copilot's editor host and strict JSON to Claude Code — and the
 * failure belongs to the reading that had it (FR-028).
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
      recognitions: declarations,
      detailRoute:
        props.entry.name === null
          ? detailRoute('MCP', sourceRelativePath, sessionSources.selectorOf(sourceId))
          : mcpServerDetailRoute(
              sourceRelativePath,
              props.entry.name,
              sessionSources.selectorOf(sourceId),
            ),
      // The no-name row's members tell their two states apart (FR-028): a
      // failed extraction leaves the rows unknown, a parsed carrier with no
      // declaration declares none. Null on named rows, whose declarations are
      // always parsed. Any failed reading of the carrier makes the sentence the
      // unknown one, because that product's servers are then unknown whatever
      // another product's reading of the same file found.
      stateText:
        props.entry.name !== null
          ? null
          : declarations.some((declaration) => declaration.parseStatus === 'failed')
            ? 'The declarations in this file could not be read.'
            : 'This file declares no MCP servers.',
      // The MCP recognitions' own records, not the file's whole list: a file can
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
  const routes = new Map<SourceKind, ReturnType<typeof mcpComparisonRouteFor>>();
  const name = props.entry.name;
  if (name === null) {
    // The closing no-name row: its carriers share no declared name to pair.
    return routes;
  }
  for (const [kind, [first, second]] of familyComparisonPairsOf(comparableSides.value)) {
    routes.set(kind, mcpComparisonRouteFor(kind, name, first, second));
  }
  return routes;
});
</script>

<template>
  <li class="aci-item">
    <!-- The declared server name heads the row — the row's own identity, in
         the same spelling its carrier wrote (FR-007). The no-name row gets
         plain copy that says the rows are not known rather than not declared,
         because it also holds a carrier whose declaration block could not be
         read (FR-028). -->
    <p class="aci-row-head">
      <AuthoredNameText v-if="name !== null" :name="name">
        <span
          class="aci-row-head__name"
          :class="name.isAuthored ? 'aci-authored-text' : 'aci-muted'"
          >{{ name.text }}</span
        >
      </AuthoredNameText>
      <span v-else class="aci-row-head__name">{{ UNNAMED_ROW_TEXT['MCP'] }}</span>
      <!-- How many files declare this name. A count rather than a repeated
           path: the files themselves are the lines below. -->
      <span class="aci-row-head__count"
        >{{ carrierRows.length }} {{ carrierRows.length === 1 ? 'file' : 'files' }}</span
      >
      <!-- The comparison entry, where this row has one family and so no family
           line of its own to close (`SourceFamilyBlocks.vue`). -->
      <span v-if="headCompareRoute" class="aci-row-head__end">
        <NuxtLink
          :to="headCompareRoute"
          :aria-label="`Compare this name's declarations: ${name?.accessibleText ?? ''}`"
          >Compare</NuxtLink
        >
      </span>
    </p>

    <!-- The carriers resolving this name, each linking to its own detail:
         the fields the file wrote under this key, never the file's bytes
         (FR-007). The carrier path is the link because it is what
         distinguishes the declarations of one name — one physical file is one
         link however many products recognize it — and the accessible name
         adds the row's subject so links of several rows never announce
         identically (WCAG 2.4.6; label-in-name keeps the visible path as the
         prefix). Each recognizing product is drawn by its mark with the
         surfaces its admission rests on; naming a surface never claims it
         loaded the file (FR-009). -->
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
                  name === null
                    ? carrier.carrierAccessibleText
                    : `${name.accessibleText} in ${carrier.carrierAccessibleText}`,
                  carrier.sourceId,
                )
              "
              >{{ carrier.carrierText }}</NuxtLink
            >
            <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />
          </span>
          <RecognitionMarks :recognitions="carrier.recognitions" />
          <span class="aci-row-file__end" />
        </div>
        <!-- Which of the no-name row's two states this carrier is in: the
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
          :aria-label="`Compare this name's declarations: ${name?.accessibleText ?? ''}${
            block.familyText !== null ? ` (${block.familyText})` : ''
          }`"
          >Compare</NuxtLink
        >
      </template>
    </SourceFamilyBlocks>
  </li>
</template>
