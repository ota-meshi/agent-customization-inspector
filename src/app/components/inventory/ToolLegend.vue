<script setup lang="ts">
// What each vendor mark names, said once for the list (T1158, FR-009).
//
// The rows draw a product rather than spelling it, which is what gives their
// documented surfaces the width to stay on the line. A mark a reader has not
// met before needs its product's name somewhere, and once per list is where:
// on every row it would be the repetition the marks were introduced to remove.
//
// The legend maps a mark to a product name and states nothing else. In
// particular it does not carry the surfaces: those stay on every recognition,
// because a surface set is a fact about one recognition rather than about the
// product, and folding them here would leave a reader unable to tell a product
// with one surface from a kind that states none (FR-009).
//
// Only the products the current inventory actually recognizes, for the reason
// the rail lists only the kinds it has: a legend naming a product no row shows
// would describe a mark that is not on screen.
import { SUPPORTED_TOOL_TEXT, type SupportedTool } from '../../../shared/entities';
import ToolMark from '../ToolMark.vue';

defineProps<{
  /** The products this inventory recognizes, in the closed tool order. */
  tools: readonly SupportedTool[];
}>();
</script>

<template>
  <p v-if="tools.length > 0" class="aci-tool-legend">
    <span v-for="tool in tools" :key="tool" class="aci-tool-legend__entry">
      <!-- The glyph is decoration here and nowhere else: the product's name is
           the words beside it, so the mark's own accessible name would be the
           same announcement twice (`ToolMark.vue`). -->
      <ToolMark :tool="tool" decorative />
      <span>{{ SUPPORTED_TOOL_TEXT[tool] }}</span>
    </span>
    <span class="aci-tool-legend__note">
      Beside each mark is the documented surface that recognition rests on.
    </span>
  </p>
</template>

<style scoped>
/* A quiet strip above the rows: it is a key to what is below rather than one of
   the things being listed, so it sits on the sunken surface and takes the note
   size the rest of the page's qualifiers take. */
.aci-tool-legend {
  align-items: center;
  background: var(--aci-surface-sunken);
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  color: var(--aci-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.71875rem;
  gap: 0.375rem 1rem;
  margin: 0.5rem 0 0.625rem;
  padding: 0.375rem 0.625rem;
}

.aci-tool-legend__entry {
  align-items: center;
  color: var(--aci-text);
  display: inline-flex;
  font-weight: 600;
  gap: 0.3125rem;
}

/* Pushed to the end so the marks stay together at the start, where a reader
   looking one up will scan. It drops below them when the row runs out of
   width rather than squeezing the names. */
.aci-tool-legend__note {
  color: var(--aci-muted);
  margin-inline-start: auto;
}
</style>
