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
import { mcpDetailRoute, mcpServerDetailRoute } from '../../mcp-detail-route';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import {
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  McpDeclarationDto,
  McpInventoryEntryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed MCP entry to render: one declared server name, or the null row. */
  entry: McpInventoryEntryDto;
  /**
   * Every published file by its Source-relative Path — the file's identity
   * (FR-030). The row states each declaration's carrier by path and repeats
   * none of the file's own facts, so this one lookup resolves the files it
   * names.
   */
  filesByPath: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

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
 * and the carrier file's own diagnostics — where the extraction-failure
 * record lives (FR-028) — are the carrier's, shared by its recognitions,
 * because the extraction ran once per file.
 */
const carrierRows = computed(() => {
  const byCarrier = new Map<string, McpDeclarationDto[]>();
  for (const declaration of props.entry.declarations) {
    const group = byCarrier.get(declaration.sourceRelativePath);
    if (group === undefined) {
      byCarrier.set(declaration.sourceRelativePath, [declaration]);
    } else {
      group.push(declaration);
    }
  }
  return [...byCarrier.entries()].map(([sourceRelativePath, declarations]) => ({
    key: sourceRelativePath,
    carrierText: pathPresentationLabel(sourceRelativePath),
    // The accessible name goes through the single-line label rule instead:
    // an accessible name is flattened, so authored whitespace that the drawn
    // label legitimately renders would collapse and two different carriers
    // could announce identically (FR-025, {@link inlinePresentationLabel}).
    carrierAccessibleText: inlinePresentationLabel(sourceRelativePath),
    recognitions: declarations.map((declaration) => ({
      tool: declaration.tool,
      toolText: SUPPORTED_TOOL_TEXT[declaration.tool],
      surfacesText: declaration.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', '),
    })),
    detailRoute:
      props.entry.name === null
        ? mcpDetailRoute(sourceRelativePath)
        : mcpServerDetailRoute(sourceRelativePath, props.entry.name),
    // The no-name row's members tell their two states apart (FR-028): a
    // failed extraction leaves the rows unknown, a parsed carrier with no
    // declaration declares none. Null on named rows, whose declarations are
    // always parsed; the first declaration answers for the carrier because
    // the extraction ran once per file.
    stateText:
      props.entry.name !== null
        ? null
        : declarations[0]?.parseStatus === 'failed'
          ? 'The declarations in this file could not be read.'
          : 'This file declares no MCP servers.',
    diagnosticIds: props.filesByPath.get(sourceRelativePath)?.diagnosticIds ?? [],
  }));
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
    <ul class="aci-mcp-row__declarations" role="list">
      <li v-for="carrier in carrierRows" :key="carrier.key">
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
        <p v-if="carrier.stateText !== null" class="aci-muted">{{ carrier.stateText }}</p>
        <RowDiagnostics :diagnostic-ids="carrier.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>
  </li>
</template>

<style scoped>
.aci-mcp-row__name {
  margin: 0;
  font-weight: 600;
}

/* The declarations of the name, set under it by an indent and a rule,
   matching how a skill row groups its definitions under the resolved name. */
.aci-mcp-row__declarations {
  list-style: none;
  margin: 0.2rem 0 0;
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}

.aci-mcp-row__declarations > li + li {
  margin-block-start: 0.4rem;
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
