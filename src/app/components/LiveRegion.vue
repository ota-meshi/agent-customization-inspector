<script setup lang="ts">
// The live region a surface announces its own state changes through
// (WCAG 4.1.3): a change that alters the page without moving keyboard focus
// has to reach a reader who is not looking at it.
//
// Stable rather than inserted with the message it reports, which is the whole
// reason this is an element rather than a call: a region that appears together
// with its message is not reliably read, so it stays in the document and only
// its text changes.
import { useTemplateRef } from 'vue';

defineProps<{
  /**
   * What the region announces, which the surface words itself. Empty while
   * there is nothing to say — the element stays, so the next message lands in
   * a region the reader's software already knows about.
   */
  text: string;
  /**
   * Whether the announcement interrupts what is being read. Passed where the
   * message is a failure the reader must not act past; omitted where it
   * reports a state the page reached, which waits for a pause.
   */
  assertive?: boolean;
}>();

/** The region itself, so a caller can land focus on it. */
const region = useTemplateRef<HTMLParagraphElement>('region');

/**
 * Moves focus onto the region. Called where the control that had focus
 * removes itself and this line is the outcome it produced, so focus never
 * falls to the document body with nothing announced (WCAG 2.4.3); such a
 * caller passes `tabindex="-1"` so the region can hold it
 * (`InventoryFilters.vue`).
 */
function focus(): void {
  region.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <p
    ref="region"
    class="aci-live-region"
    :role="assertive ? 'alert' : 'status'"
    :aria-live="assertive ? 'assertive' : 'polite'"
    aria-atomic="true"
  >
    {{ text }}
  </p>
</template>
