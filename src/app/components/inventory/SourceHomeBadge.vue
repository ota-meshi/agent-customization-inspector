<script setup lang="ts">
// Which consented home a file came from, where naming it distinguishes
// something (T1164, FR-002, FR-030).
//
// The member's own name rather than its root: the four roots are stated once
// on the personal setup's own surface, and repeating one under every path was
// the second line the compressed row exists to remove. What a reader needs on
// the row is which home, because `settings.json` sits at the same
// Source-relative path in three of the four — the path alone names no file.
//
// It renders nothing for a Repository file, and nothing where one home is
// consented: with one there is nothing to tell apart, and the family heading
// above already says the file is not the repository's.
//
// One component rather than a badge each row repeats, because the statement is
// the same everywhere a file renders beside its Source: the derivation, the
// markup, and the wrapping rule must not drift apart across the rows that show
// it.
import { computed } from 'vue';
import { useSessionSources } from '../../composables/session-sources';

const props = defineProps<{
  /** The Source of the file the badge is about; its home is what shows. */
  sourceId: string;
}>();

const sessionSources = useSessionSources();

/**
 * The home's name, or null where naming it distinguishes nothing
 * ({@link SessionSources.homeNameOf}) — the null renders nothing at all, so
 * callers need no guard of their own.
 */
const homeName = computed(() => sessionSources.homeNameOf(props.sourceId));
</script>

<template>
  <span v-if="homeName !== null" class="aci-source-home">{{ homeName }}</span>
</template>

<style scoped>
/* Which of the personal setup's directories a file came from. The full paths
   are on that family's own surface, so the row carries the short name rather
   than repeating a root per line (FR-002, FR-030). */
.aci-source-home {
  background: var(--aci-accent-soft);
  border-radius: 0.25rem;
  color: var(--aci-accent);
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0 0.3125rem;
  white-space: nowrap;
}
</style>
