<script setup lang="ts">
// The detail route's bypass mechanism (WCAG 2.4.1). A kind whose subject
// ships a directory lists that directory beside the file, and the tree is as
// long as the directory happens to be, so it stands between the reader and
// the file they came to read. A screen reader can jump the `nav` landmark; a
// keyboard user has nothing unless the page offers this.
//
// Out of the way until it is focused, then a normal visible link. Not
// `display: none`, which would take it out of the tab order and leave nothing
// to bypass with.
//
// The hidden state is written here rather than taken from the
// `.aci-visually-hidden` utility, which sets the same look: focusing this link
// has to undo exactly the properties the hiding set, so the two rules only
// stay correct while they are read together. Sharing the utility would put the
// reveal one file away from the declarations it reverses, and a property added
// to the utility would then hide the link with nothing to bring it back.
defineProps<{
  /**
   * The `id` of the region the link jumps to, which each page fixes on the
   * element holding its file contents.
   */
  targetId: string;
}>();
</script>

<template>
  <p class="aci-skip-link">
    <a :href="`#${targetId}`">Skip to file contents</a>
  </p>
</template>

<style scoped>
.aci-skip-link {
  margin: 0;
}

.aci-skip-link a {
  block-size: 1px;
  clip-path: inset(50%);
  inline-size: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
}

.aci-skip-link a:focus-visible {
  block-size: auto;
  clip-path: none;
  inline-size: auto;
  overflow: visible;
  position: static;
}
</style>
