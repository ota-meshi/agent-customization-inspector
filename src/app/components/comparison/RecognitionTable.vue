<script setup lang="ts">
// Which product reads which side of a comparison, for the kinds whose cell
// holds nothing but that (FR-009, FR-011, FR-012).
//
// The three kinds that compare one declared name across two carriers — MCP,
// hooks, plugins — state the same thing per cell: whether that product reads
// this side, and on which documented surfaces. So the rows are derived here
// from the two sides' own recognitions rather than by each kind, which is
// what keeps the seven comparisons' one table one table. The four kinds whose
// cell carries more — the name a product invokes the file by, the name it
// identifies an agent by — draw their own rows over the same
// `.aci-recognition-table` utility, because the cell is the part that differs.
//
// The table is what a comparison uses instead of stating recognitions on the
// side cards. A card can omit what is absent but cannot name it, and the two
// facts a reader comes for — a product that reads neither side, and a side
// that has no file at all — are exactly the ones only a cell can carry.
//
// Nothing here ranks, orders, or prefers a side (FR-012), and naming a surface
// states where a recognition is documented to be read from, never that the
// product loaded the file (FR-009).
import { computed } from 'vue';
import ToolMark from '../ToolMark.vue';
import {
  SUPPORTED_TOOL_ORDER,
  SUPPORTED_TOOL_TEXT,
  type SupportedTool,
} from '../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import type { VendorSurface } from '../../../shared/registries/behavior-types';

/** One product's recognition of one side, as the row that owns it publishes it. */
interface SideRecognition {
  /** The product whose recognition this is. */
  readonly tool: SupportedTool;
  /** The documented surfaces its admitting rules rest on (FR-009). */
  readonly surfaces: readonly VendorSurface[];
}

/** One compared side: what the column is called, and what recognizes it. */
interface ComparedSide {
  /** The side's own caption, which is what its column is headed by. */
  readonly caption: string;
  /** Every product whose recognition the owning row lists for this side. */
  readonly recognitions: readonly SideRecognition[];
}

const props = defineProps<{
  /** The two compared sides, in the order the link named them. */
  readonly sides: readonly [ComparedSide, ComparedSide];
}>();

/** What a cell reads as when the product attaches no recognition to that side. */
const NOT_RECOGNIZED_TEXT = 'Not recognized';

/**
 * One row per product either side is read by, in the contracted tool order —
 * the order every other surface lists recognitions in, so a reader carries one
 * ordering across the product. A product neither side is read by is no row at
 * all: the table states the two sides' answers, and a product with no
 * recognition on either has none to state.
 */
const rows = computed(() =>
  SUPPORTED_TOOL_ORDER.map((tool) => ({
    tool,
    cells: props.sides.map((side) => ({
      caption: side.caption,
      recognition: side.recognitions.find((entry) => entry.tool === tool) ?? null,
    })),
  })).filter((row) => row.cells.some((cell) => cell.recognition !== null)),
);

/** The surfaces of one cell's recognition, in the words the registry gives them. */
function surfacesText(recognition: SideRecognition): string {
  return recognition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ');
}
</script>

<template>
  <section v-if="rows.length > 0">
    <h3 class="aci-compare-block-title">Tool recognition</h3>
    <!-- One row per recognizing tool, in the contracted tool order: each
         recognition stays distinguishable from the physical file (US3
         scenario 2), captioned in words (AGENTS.md § User-visible copy
         policy). A table rather than sentences: the relationship a screen
         reader needs — this tool, this side's state, that side's state — is
         exactly what table headers state. `tabindex` because the box around the
         table is its own horizontal scroll container on a wide viewport
         (WCAG 2.1.1). -->
    <div class="aci-recognition-table" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Tool</th>
            <th v-for="side in sides" :key="side.caption" scope="col">{{ side.caption }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.tool">
            <!-- Decorative, because the row spells the product's name beside it:
                 the mark is what a reader scanning the column finds, and its own
                 accessible name would be the same word twice
                 (`ToolMark.vue`). -->
            <th scope="row">
              <span class="aci-recognition-table__tool"
                ><ToolMark decorative :tool="row.tool" /> {{ SUPPORTED_TOOL_TEXT[row.tool] }}</span
              >
            </th>
            <td v-for="cell in row.cells" :key="cell.caption" :data-label="cell.caption">
              <!-- The absent state set in `.aci-muted`, which is what the design
                   gives a cell whose answer is that nothing is there. The colour
                   is an aid, never the carrier: the words say which state the
                   cell is in (WCAG 1.4.1). -->
              <span v-if="cell.recognition === null" class="aci-muted">{{
                NOT_RECOGNIZED_TEXT
              }}</span>
              <template v-else
                >Recognized
                <span v-if="cell.recognition.surfaces.length > 0" class="aci-muted"
                  >({{ surfacesText(cell.recognition) }})</span
                ></template
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
