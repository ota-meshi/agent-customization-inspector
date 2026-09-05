<script setup lang="ts">
// The products that recognize one file, each drawn by its own mark with the
// documented surfaces its recognition rests on beside it (T1159, FR-009).
//
// One component rather than the same three lines in each of the eleven row
// kinds. What a recognition is does not vary by kind — a product, and where its
// admitting rules document reading such a file from — so a row that spelled it
// itself was one more place for the surfaces to be dropped from.
//
// The surfaces stay on every recognition and are never folded into the legend.
// A surface set narrows what reads the file even when it holds one member —
// Codex's local clients exclude the hosted service, which reads no local file —
// and stating it only where it varies would leave a reader unable to tell a
// product with one surface from a kind that states none (FR-009).
//
// A mark is a link where the kind's detail differs by product: a plugin catalog
// three products read is one file with three readings, and the reader chooses
// which reading to open by choosing one. Every other kind's file has one
// detail, so its path is the link and the marks state only what recognized it —
// which the plugin list does too, since a list shows nothing that varies by
// product (`PluginRow.vue`). The linked mark is therefore the plugin detail's,
// where the name is drawn beside it and goes inside the link with it.
//
// The mark carries the product's identity and the legend gives it its name once
// for the list, so the name is not repeated on every row. Nothing rests on the
// mark's colour: its shape is the product's own, and the surfaces beside it are
// text (AGENTS.md § Icon policy).
//
// A detail spells the name instead. There is one file on that page and no
// legend above it, so there is no repetition to remove and nothing to look the
// mark up in — the name is drawn, and the mark stands beside it as the legend's
// own entries do.
import type { RouteLocationRaw } from 'vue-router';
import { NuxtLink } from '#components';
import ToolMark from '../ToolMark.vue';
import { SUPPORTED_TOOL_TEXT, type SupportedTool } from '../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import type { VendorSurface } from '../../../shared/registries/behavior-types';

defineProps<{
  /**
   * One entry per product that recognized the file, in the row's own published
   * order — which is the closed tool order (data-model.md § ToolRecognition).
   */
  recognitions: readonly {
    readonly tool: SupportedTool;
    readonly surfaces: readonly VendorSurface[];
    /**
     * Where this product's own reading of the file opens, for a kind whose
     * detail differs by product: a plugin catalog three products read is one
     * file with three readings, so the mark is what opens one of them and the
     * path beside it opens nothing. Absent for every other kind, whose file
     * has one detail and whose path is therefore the link
     * (`PluginRow.vue`).
     */
    readonly opens?: {
      /** That reading's own detail route. */
      readonly route: RouteLocationRaw;
      /**
       * What the link announces. The mark carries the product's name as text
       * that is not drawn, and a link owes the reader what it opens as well,
       * so the caller spells both (`ToolMark.vue`).
       */
      readonly accessibleText: string;
    };
  }[];
  /**
   * Draws each product's name beside its mark. Set by a detail, which has no
   * legend to look a mark up in; a list leaves it unset, where the legend names
   * every mark once and a name per row would be the repetition the marks
   * removed.
   */
  named?: boolean;
}>();
</script>

<template>
  <span class="aci-recognition-marks">
    <span
      v-for="recognition in recognitions"
      :key="recognition.tool"
      class="aci-recognition-marks__one"
    >
      <!-- The link is the mark and the product's drawn name, and the surfaces
           stay outside it. The name is what a reader presses — a 15px mark is
           the whole target otherwise, and the underline this product draws on
           a link has no characters to sit under, so three products read as
           three of the same thing and two of them happen to be links. The
           surfaces stay out because they qualify the mark rather than naming
           where it goes: inside, they would become the link's visible label
           while `aria-label` announced something that does not contain them,
           which is what speech input matches on (WCAG 2.5.3;
           contracts/accessibility-acceptance.md § 2.5.3).

           The mark and the name are written twice rather than wrapped
           conditionally, because a template has no conditional wrapper and a
           component for one would be a component to open before reading two
           lines. Where a name is drawn the mark is decoration beside it, and
           its own accessible name would be the same announcement twice
           (`ToolMark.vue`); inside a link the same holds, since the link
           states what it opens with this product's name included. -->
      <NuxtLink
        v-if="recognition.opens"
        class="aci-recognition-marks__opens"
        :to="recognition.opens.route"
        :aria-label="recognition.opens.accessibleText"
      >
        <ToolMark :tool="recognition.tool" decorative />
        <span v-if="named">{{ SUPPORTED_TOOL_TEXT[recognition.tool] }}</span>
      </NuxtLink>
      <template v-else>
        <ToolMark :tool="recognition.tool" :decorative="named" />
        <span v-if="named">{{ SUPPORTED_TOOL_TEXT[recognition.tool] }}</span>
      </template>
      <span class="aci-recognition-marks__surfaces">{{
        recognition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ')
      }}</span>
    </span>
  </span>
</template>

<style scoped>
/* The recognitions ride at the end of a file's line and wrap together rather
   than pushing the path off the row, which is what keeps a long path readable
   at the reflow width (WCAG 1.4.10). */
.aci-recognition-marks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.4375rem;
}

.aci-recognition-marks__one {
  align-items: center;
  display: inline-flex;
  gap: 0.3125rem;
}

/* The mark and its product's name, so the focus ring and the underline are
   drawn around what a reader presses rather than around the whole recognition,
   whose surfaces the link does not open. */
.aci-recognition-marks__opens {
  align-items: center;
  display: inline-flex;
  gap: 0.3125rem;
}

/* Smaller than the row's own text and muted, because a surface qualifies the
   mark it sits beside rather than being one of the things a reader scans for. */
.aci-recognition-marks__surfaces {
  color: var(--aci-muted);
  font-size: 0.65625rem;
  letter-spacing: 0.01em;
}
</style>
