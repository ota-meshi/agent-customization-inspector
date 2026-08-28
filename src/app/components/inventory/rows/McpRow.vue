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
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceRootLine from '../SourceRootLine.vue';
import { familyComparisonPairsOf, detailRoute, type ComparisonSide } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { mcpServerDetailRoute } from '../../mcp-detail-route';
import { mcpComparisonRouteFor } from '../../../composables/mcp-comparison';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import {
  fileIdentityKey,
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
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
 * The row's heading text: the declared name through the shared label rule, so
 * a name built only from invisible code points still identifies its row
 * ({@link pathPresentationLabel}). Null for the no-name row, whose heading is
 * fixed copy. The empty name — strict JSON accepts `""` as a server name —
 * gets its own note the way an empty declared value does, because the label
 * rule has no characters to spell out and the row would otherwise be headed
 * by nothing.
 */
const nameText = computed(() =>
  props.entry.name === null
    ? null
    : props.entry.name === ''
      ? '(empty name)'
      : pathPresentationLabel(props.entry.name),
);

/**
 * Whether {@link nameText} is the authored spelling rather than this
 * product's note, which decides the heading's authored-text styling.
 */
const nameIsAuthored = computed(() => props.entry.name !== null && props.entry.name !== '');

/**
 * The row's name as accessible-name text: the single-line label rule, because
 * an accessible name collapses whitespace and would read two invisibly
 * different names as one ({@link inlinePresentationLabel}); the no-name and
 * empty-name cases keep the same copy the visible heading shows.
 */
const nameAccessibleText = computed(() =>
  props.entry.name === null
    ? null
    : props.entry.name === ''
      ? '(empty name)'
      : inlinePresentationLabel(props.entry.name),
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
      // could announce identically (FR-025, {@link inlinePresentationLabel}).
      carrierAccessibleText: inlinePresentationLabel(sourceRelativePath),
      recognitions: declarations.map((declaration) => ({
        tool: declaration.tool,
        toolText: SUPPORTED_TOOL_TEXT[declaration.tool],
        surfacesText: declaration.surfaces
          .map((surface) => VENDOR_SURFACE_TEXT[surface])
          .join(', '),
      })),
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
 * The comparison this row links to — this declared name's declarations in
 * its first two carriers — or null when the name is declared by fewer than
 * two, where a link would open a comparison with nothing to pair. Every
 * carrier of a named row is comparison-eligible (FR-025) by the row's own
 * invariant: its declarations are parsed — a failed carrier publishes no
 * name, and a binary carrier is diagnostic-only — so its text was read
 * (api-types.ts § McpDeclarationDto.parseStatus). The compare route's own
 * pickers take over from there: they hold this row's every carrier, so the
 * reader steps to any other pair on the comparison itself instead of
 * composing one here. The no-name row links none: its carriers publish no
 * declaration a comparison would serialize.
 *
 * The pair is drawn from the row's own files rather than from the members a
 * filter left, so the link a reader followed is still there when they come
 * back to the unnarrowed list ({@link NarrowedInventoryRow}).
 */
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
    <p
      v-if="nameText !== null"
      class="aci-mcp-row__name"
      :class="nameIsAuthored ? 'aci-authored-text' : 'aci-muted'"
    >
      {{ nameText }}
    </p>
    <p v-else class="aci-mcp-row__name">No known server declarations</p>

    <!-- The carriers resolving this name, each linking to its own detail:
         the fields the file wrote under this key, never the file's bytes
         (FR-007). The carrier path is the link because it is what
         distinguishes the declarations of one name — one physical file is one
         link however many products recognize it — and the accessible name
         adds the row's subject so links of several rows never announce
         identically (WCAG 2.4.6; label-in-name keeps the visible path as the
         prefix). Each recognizing product trails the link with the surfaces
         its admission rests on, the way an instruction row states its
         recognitions; naming a surface never claims it loaded the file
         (FR-009). -->
    <!-- One block per Source family (`SourceFamilyBlocks.vue`), each member
         rendered by this row. -->
    <SourceFamilyBlocks
      :members="carrierRows"
      :member-key="(carrier) => carrier.key"
      :identities="entry.rowFileIdentities"
    >
      <template #member="{ member: carrier }">
        <p class="aci-mcp-row__owner">
          <NuxtLink
            :to="carrier.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="
              nameAccessibleText === null
                ? carrier.carrierAccessibleText
                : `${carrier.carrierAccessibleText}: ${nameAccessibleText}`
            "
            >{{ carrier.carrierText }}</NuxtLink
          >
          <span
            v-for="recognition in carrier.recognitions"
            :key="recognition.tool"
            class="aci-mcp-row__tool aci-muted"
            >{{ recognition.toolText }}
            <span class="aci-mcp-row__surfaces">{{ recognition.surfacesText }}</span></span
          >
        </p>

        <SourceRootLine :source-id="carrier.sourceId" />
        <p v-if="carrier.stateText !== null" class="aci-muted">{{ carrier.stateText }}</p>
        <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />
      </template>

      <!-- The block's own comparison entry (FR-011): the family is where a
           pair of this row's members lives, so each block that holds two
           comparable identities offers its own — the instruction blocks'
           shape. The accessible name carries the row's identity always, and
           the family where two blocks each offer one (WCAG 2.4.6). -->
      <template #entry="{ block }">
        <p v-if="blockCompareRoutes.get(block.kind)" class="aci-mcp-row__compare">
          <NuxtLink
            :to="blockCompareRoutes.get(block.kind)!"
            :aria-label="`Compare this name's declarations: ${nameAccessibleText ?? ''}${
              blockCompareRoutes.size > 1 && block.familyText !== null
                ? ` (${block.familyText})`
                : ''
            }`"
            >Compare this name's declarations</NuxtLink
          >
        </p>
      </template>
    </SourceFamilyBlocks>
  </li>
</template>

<style scoped>
.aci-mcp-row__name {
  margin: 0;
  font-weight: 600;
}

.aci-mcp-row__owner {
  margin: 0;
}

/* Each recognizing product trails the carrier on the same line, set apart by
   a separator, matching how an instruction row's surfaces trail its
   product. */
.aci-mcp-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-mcp-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

/* The surfaces qualify their own product within the same span: the product
   alone does not say where it reads the file from once two surfaces document
   different lookup bases. */
.aci-mcp-row__surfaces {
  font-size: 0.85em;
}

.aci-mcp-row__surfaces::before {
  content: '(';
}

.aci-mcp-row__surfaces::after {
  content: ')';
}
</style>
