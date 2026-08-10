<script setup lang="ts">
// The directory tree of a directory-shaped customization.
//
// A skill is not one file: it is a `SKILL.md` plus the scripts, references, and
// assets beside it, and those are what an agent is actually given. So the
// detail surface for any file in that directory shows the whole directory and
// lets the reader move between its files, rather than showing the entry point
// and naming the rest.
//
// The tree is built from paths the snapshot already publishes — the definition's
// own path and its census (`companionFiles`) — so it needs no new wire shape and
// cannot show a file the scan did not read. A path with no committed file is
// simply absent: every file in the tree is one the current generation holds, so
// selecting any of them resolves.
//
// This component owns the landmark and the scroll box; the nesting is drawn by
// the branch below it, which is recursive because the structure is.
import { computed } from 'vue';
import SkillFileTreeBranch from './SkillFileTreeBranch.vue';
import { buildSkillTree } from './skill-file-tree-nodes';

const props = defineProps<{
  /**
   * The Source-relative Path of every file of the customization's directory,
   * in the order the tree should read them: the entry point first, then its
   * census in path order.
   */
  readonly files: readonly string[];
  /** The path of the file currently open, so the tree can mark it. */
  readonly selectedPath: string;
  /**
   * The tool segment of the detail route this tree lives under. A link
   * addresses a definition — `/skills/<tool>/<source-relative path>` — so opening a
   * companion stays within the recognition the page is about.
   */
  readonly tool: string;
  /** The directory prefix the tree is rooted at, stripped from every label. */
  readonly directory: string;
}>();

/** The tree's own nodes, derived from the paths the snapshot published. */
const nodes = computed(() => buildSkillTree(props.files, props.directory));
</script>

<template>
  <nav class="aci-skill-file-tree" aria-label="Files in this skill">
    <SkillFileTreeBranch :nodes="nodes" :selected-path="selectedPath" :tool="tool" />
  </nav>
</template>

<style scoped>
/* The tree is capped rather than unbounded: a skill that ships fifty files
   would otherwise push its own contents off the screen, and the cap keeps the
   two columns beside each other. Below the cap it is its natural height, so a
   three-file skill shows three files and no empty scroller. */
.aci-skill-file-tree {
  max-height: 24rem;
  overflow-y: auto;
}
</style>
