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
import type { SourceKind } from '../../../shared/api-types';

const props = defineProps<{
  /** The row's members, in the row's own published order. */
  members: readonly Member[];
  /**
   * The list key one member renders under — the member's identity, which the
   * owning row spells because it knows which fields identify its members.
   */
  memberKey: (member: Member) => string;
  /**
   * The families whose comparison entries the owning row can still offer —
   * the keys of its per-block compare routes. A narrowing that empties such
   * a family's members does not take its block with it, so the entry stays
   * reachable; a family with no comparable pair is deliberately absent, so
   * an all-filtered family never leaves a bare heading behind. Omitted by a
   * caller with no block-level entries; the members alone then decide the
   * blocks.
   */
  entryKinds?: readonly SourceKind[];
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
 * ({@link SessionSources.familyBlocksOf}), extended with the families only
 * {@link props.entryKinds} holds: a family every member of which a narrowing
 * dropped still renders its block exactly when its comparison entry has
 * something to offer.
 */
const blocks = computed(() => {
  const grouped = sessionSources.familyBlocksOf(props.members);
  const present = new Set(grouped.map((block) => block.kind));
  const extended = [...grouped];
  for (const kind of props.entryKinds ?? []) {
    if (!present.has(kind)) {
      present.add(kind);
      extended.push({ kind, familyText: sessionSources.familyNameOf(kind), members: [] });
    }
  }
  // The same published family order the grouping itself keeps: an extension
  // appended for an all-filtered family must slot where the family reads,
  // not after whichever blocks survived the narrowing.
  return extended.toSorted(
    (left, right) => (left.kind === 'repository' ? 0 : 1) - (right.kind === 'repository' ? 0 : 1),
  );
});

/**
 * Whether the blocks carry headings. Decided after the extension above rather
 * than by the grouping alone, so a family present only for its comparison entry
 * counts towards it — and read from the one rule the owning row reads, which is
 * what keeps the entry reachable on the line whichever of the two draws it
 * (`session-sources.ts` § familyLineShownFor).
 */
const familyLineShown = computed(() =>
  sessionSources.familyLineShownFor(props.members, props.entryKinds ?? []),
);
</script>

<template>
  <ul class="aci-source-family-blocks" role="list">
    <li v-for="block in blocks" :key="block.kind">
      <!-- Which family these members are of, in this product's own words, and
           only where that distinguishes something: two families' members under
           one row stay two statements rather than one merged list (FR-030).
           The block's own comparison entry closes that line, because a
           comparison never spans families and the entry belongs to the family
           it compares within. A row with one family has no such line, and its
           entry closes the row's own name line instead — which is the owning
           row's to render, being the line the row itself draws. -->
      <p v-if="familyLineShown" class="aci-family-heading">
        {{ sessionSources.familyNameOf(block.kind) }}
        <slot name="entry" :block="block" />
      </p>
      <ul v-if="block.members.length > 0" class="aci-source-family-blocks__members" role="list">
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
