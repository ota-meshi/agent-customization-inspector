<script setup lang="ts">
// What a path-addressed detail route reports when the current scan holds
// nothing at the path its link names: a correct observation the reader did not
// want, rather than this side's own failure, so it takes the warning edge and
// offers the list rather than a retry — reopening the same request would find
// the same nothing.
//
// One sentence for every kind whose subject is its own file, because what
// happened is the same whatever the kind: the inventory moved under a link
// that was made earlier.
import SubjectUnavailable from './SubjectUnavailable.vue';

defineProps<{
  /**
   * Where the way back leads: the kind's own list, so the reader lands where
   * the link was made rather than at the inventory's default tab.
   */
  listRoute: string;
}>();
</script>

<template>
  <SubjectUnavailable outcome="warning">
    Nothing in the current scan sits at this link's path. The inventory may have changed since the
    link was made; a rescan that brings the path back will make it resolve again.
    <template #exit>
      <NuxtLink :to="listRoute">Return to the inventory and open it again.</NuxtLink>
    </template>
  </SubjectUnavailable>
</template>
