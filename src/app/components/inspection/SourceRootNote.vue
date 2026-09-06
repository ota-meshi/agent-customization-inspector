<script setup lang="ts">
// Which directory the open customization was in, where its family holds more
// than one Source: an escaped presentation of the admitted root, never a path
// anything can open (FR-002).
//
// Nothing is drawn where the family holds one Source (`source-name.ts`
// § sourceRootOf), because the summary panel already states that one root and
// a line repeating it on every detail would say where every file came from
// twice.
defineProps<{
  /**
   * The admitted root as it is drawn, or null where naming it distinguishes
   * nothing (`source-facts.ts` § OpenSourceFacts.sourceRootText).
   */
  text: string | null;
}>();
</script>

<template>
  <p v-if="text !== null" class="aci-note aci-source-root-note">
    <span class="aci-authored-text">{{ text }}</span>
  </p>
</template>

<style scoped>
/* An escaped root label has no break opportunities of its own; without this
   the shell scrolls sideways (WCAG 1.4.10). */
.aci-source-root-note {
  overflow-wrap: anywhere;
}
</style>
