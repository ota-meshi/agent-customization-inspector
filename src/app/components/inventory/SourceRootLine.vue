<script setup lang="ts">
// Which directory one file was in, where its family holds more than one
// Source: an escaped presentation of the admitted root, never a path
// anything can open (FR-002, FR-030).
//
// One component rather than a paragraph each row repeats, because the line is
// the same statement everywhere a file renders beside its Source: the
// derivation, the markup, and the wrapping rule must not drift apart across
// the rows that show it.
import { computed } from 'vue';
import { useSessionSources } from '../../composables/session-sources';

const props = defineProps<{
  /** The Source of the file the line is about; its directory is what shows. */
  sourceId: string;
}>();

const sessionSources = useSessionSources();

/**
 * The directory text, or null where the family holds one Source and the
 * summary panel states it once ({@link SessionSources.rootTextOf}) — the
 * null renders nothing at all, so callers need no guard of their own.
 */
const rootText = computed(() => sessionSources.rootTextOf(props.sourceId));
</script>

<template>
  <p v-if="rootText !== null" class="aci-source-root-line aci-note">
    <span class="aci-authored-text">{{ rootText }}</span>
  </p>
</template>

<style scoped>
/* The directory under the path it belongs to, wrapping so a long escaped
   root never scrolls the page sideways (WCAG 1.4.10). */
.aci-source-root-line {
  margin: 0;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}
</style>
