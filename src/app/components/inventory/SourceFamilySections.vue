<script setup lang="ts" generic="Member extends { readonly sourceId: string }">
// A file-unit kind's list split into one section per Source family (FR-030,
// tasks.md T1127): a rule, permissions, or settings row is one file of one
// Source, so the family grouping the name-keyed rows render inside themselves
// lives here, above the rows.
//
// One component for every such kind, because the section is chrome — the
// heading where the session holds more than one Source, and the rows under
// it — while what a row *is* stays the owning list's, passed through the
// slot. The in-row counterpart is `SourceFamilyBlocks.vue`: same grammar —
// members in, one group per family out, the member markup slotted — with the
// one deliberate difference that a block indents members under its heading
// while a section's rows keep the flat list's own card spacing.
import { computed } from 'vue';
import { useSessionSources } from '../../composables/session-sources';

const props = defineProps<{
  /** The kind's rows, in the snapshot order the list received them. */
  members: readonly Member[];
  /**
   * The list key one row renders under — the row's identity, which the owning
   * list spells because it knows which fields identify its rows.
   */
  memberKey: (member: Member) => string;
}>();

defineSlots<{
  /** One row's own markup — the kind's row component, rendered by the list. */
  member(props: { member: Member }): unknown;
}>();

const sessionSources = useSessionSources();

/**
 * The rows grouped into family sections
 * ({@link SessionSources.familyBlocksOf}); the heading names a section only
 * where the session holds more than one Source, exactly as a block's does.
 */
const sections = computed(() => sessionSources.familyBlocksOf(props.members));
</script>

<template>
  <li v-for="section in sections" :key="section.kind">
    <!-- Which family these rows are of, in this product's own words, and only
         where that distinguishes something: the repository's rows and the
         consented homes' are two statements rather than one merged list
         (FR-030). -->
    <p v-if="section.familyText !== null" class="aci-family-heading">
      {{ section.familyText }}
    </p>
    <ul class="aci-source-family-sections__rows" role="list">
      <template v-for="member in section.members" :key="memberKey(member)">
        <slot name="member" :member="member" />
      </template>
    </ul>
  </li>
</template>

<style scoped>
/* The section's rows keep the card spacing the flat list has: the section
   wrapper is structure, not chrome. */
.aci-source-family-sections__rows {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
