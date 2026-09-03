<script setup lang="ts" generic="Member extends { readonly sourceId: string }">
// One row's members grouped into one block per Source family (FR-030,
// tasks.md T1140).
//
// One component for every row, the instruction row included, because the
// block is chrome: a heading where the session holds more than one Source,
// the indented member list under it, and the owning row's own comparison
// entry after the members. What a member *is* stays the owning row's — an
// instruction file, a skill file, an MCP declaration, a plugin carrier — so
// each row passes its own member and entry markup through the slots. The
// list-level counterpart for the file-unit kinds is
// `SourceFamilySections.vue`.
import { computed } from 'vue';
import { useSessionSources } from '../../composables/session-sources';
import type { SourceFamilyBlock } from '../../composables/session-sources';

const props = defineProps<{
  /** The row's members, in the row's own published order. */
  members: readonly Member[];
  /**
   * The list key one member renders under — the member's identity, which the
   * owning row spells because it knows which fields identify its members.
   */
  memberKey: (member: Member) => string;
}>();

defineSlots<{
  /** One member's own markup, rendered by the owning row. */
  member(props: { member: Member }): unknown;
  /**
   * One block's own closing content — the owning row's comparison entry for
   * that family, rendered after the members: the block owns its entry.
   * Optional; a row without per-block entries renders nothing here.
   */
  entry?(props: { block: SourceFamilyBlock<Member> }): unknown;
}>();

const sessionSources = useSessionSources();

/**
 * The members grouped into family blocks
 * ({@link SessionSources.familyBlocksOf}) — the families this grouping still
 * shows a file for, and no others.
 *
 * A family a narrowing emptied draws no block, so it draws neither a heading
 * nor the comparison entry the block would have closed: a block kept for its
 * entry's sake is a family name with no file under it, over a Compare link
 * opening the two files the narrowing has just hidden. What the row publishes
 * and what the screen shows are two questions, and the heading and the link
 * follow the screen (`SkillRow.vue` § the same rule for a family line). How a
 * pair is built is the other question: the sides come from the row's own
 * published identities, so a narrowing that empties one family does not
 * change the pair a surviving family offers.
 */
const blocks = computed(() => sessionSources.familyBlocksOf(props.members));
</script>

<template>
  <ul class="aci-source-family-blocks" role="list">
    <li v-for="block in blocks" :key="block.kind">
      <!-- Which family these members are of, in this product's own words, and
           only where that distinguishes something: two families' members under
           one row stay two statements rather than one merged list (FR-030).
           The block says whether it is headed, exactly as a section does
           (`SourceFamilySections.vue`), so the grouping settles it once for
           both. The block's own comparison entry closes that line, because a
           comparison never spans families and the entry belongs to the family
           it compares within. A row with one family has no such line, and its
           entry closes the row's own name line instead — which is the owning
           row's to render, being the line the row itself draws
           (`session-sources.ts` § familyLineShownFor, the rule that keeps the
           entry reachable on whichever of the two lines draws it). -->
      <p v-if="block.familyText !== null" class="aci-family-heading">
        {{ block.familyText }}
        <slot name="entry" :block="block" />
      </p>
      <ul class="aci-source-family-blocks__members" role="list">
        <li v-for="member in block.members" :key="memberKey(member)">
          <slot name="member" :member="member" />
        </li>
      </ul>
    </li>
  </ul>
</template>

<style scoped>
/* The family blocks of the row: the list itself carries no marker, gap, or
   indent — each block's heading and the file lines under it are the visible
   structure, and a file line's own padding is what sets it under the name. */
.aci-source-family-blocks,
.aci-source-family-blocks__members {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
