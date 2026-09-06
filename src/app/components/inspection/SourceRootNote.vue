<script setup lang="ts">
// Which directory the open customization was in, where its family holds more
// than one Source: an escaped presentation of the admitted root, never a path
// anything can open (FR-002).
//
// Nothing is drawn where the family holds one Source (`source-name.ts`
// § sourceRootOf), because the summary panel already states that one root and
// a line repeating it on every detail would say where every file came from
// twice.
//
// No styles of its own. The line's look is the shared `.aci-note` utility's,
// and the escaped root breaks where it has to because the span holding it is
// `.aci-authored-text`, which declares the wrap for every authored value the
// product draws (main.css). An `overflow-wrap` on this paragraph would
// duplicate the span's own rule at a second level. `aci-source-root-note`
// stays as the note's own name, which is what a browser inspector and the
// acceptance tests identify it by.
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
