<script setup lang="ts">
// The directory tree of a directory-shaped customization.
//
// A skill is not one file: it is a `SKILL.md` plus the scripts, references, and
// assets beside it, and those are what an agent is actually given. So the
// detail surface for any file in that directory shows the whole directory and
// lets the reader move between its files, rather than showing the entry point
// and naming the rest.
//
// The tree is built from paths the snapshot already publishes — a skill
// definition's own path and its `companionFiles`, or a plugin row's `files` —
// so it needs no new wire shape and cannot show a file the scan did not read. A path with no committed file is
// simply absent: every file in the tree is one the current generation holds, so
// selecting any of them resolves.
//
// The tree carries no comparison controls: the comparison's entry links and
// switchers compose pairs within one skill name, and the comparison
// surface's own file switchers — reached from the detail page's link beside
// the definition line — are where a pair is composed and switched.
//
// A skill is the clearest case and the one this file's examples name, but the
// component is any directory-shaped customization's: a plugin root carries the
// skills, hooks, MCP files, and assets the plugin ships, and its detail draws
// the same tree.
//
// This component owns the landmark and the scroll box; the nesting is drawn by
// the branch below it, which is recursive because the structure is.
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import DirectoryFileTreeBranch from './DirectoryFileTreeBranch.vue';
import { buildDirectoryTree } from './directory-file-tree-nodes';

const props = defineProps<{
  /**
   * The Source-relative Path of every file of the customization's directory,
   * in the order the tree should read them: the entry point first, then its
   * census in path order.
   */
  readonly files: readonly string[];
  /** The path of the file currently open, so the tree can mark it. */
  readonly selectedPath: string;
  /** The directory prefix the tree is rooted at, stripped from every label. */
  readonly directory: string;
  /**
   * The landmark's accessible name, which says whose files these are — "Files
   * in this skill", "Files in this plugin". A prop rather than fixed copy
   * because the component draws any directory-shaped customization's
   * directory, and a reader moving between landmarks hears which one they are
   * in (WCAG 2.4.1).
   */
  readonly label: string;
  /** The route one of these files opens at; see the branch's own prop. */
  readonly routeFor: (sourceRelativePath: string) => RouteLocationRaw;
}>();

/** The tree's own nodes, derived from the paths the snapshot published. */
const nodes = computed(() => buildDirectoryTree(props.files, props.directory));
</script>

<template>
  <nav class="aci-directory-file-tree" :aria-label="label">
    <DirectoryFileTreeBranch :nodes="nodes" :selected-path="selectedPath" :route-for="routeFor" />
  </nav>
</template>

<style scoped>
/* The tree is capped rather than unbounded: a skill that ships fifty files
   would otherwise push its own contents off the screen, and the cap keeps the
   two columns beside each other. Below the cap it is its natural height, so a
   three-file skill shows three files and no empty scroller. */
.aci-directory-file-tree {
  max-height: 24rem;
  overflow-y: auto;
}
</style>
