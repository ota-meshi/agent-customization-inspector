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
import { computed, useId } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import FolderIcon from '~icons/lucide/folder';
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
  /**
   * What the entry point's own row is separated from the rest by, where the
   * customization has a word for the rest. A skill does — its inventory row
   * calls them supporting files — so its tree names the divider with it. A
   * plugin has no such word, passes none, and gets no divider rather than a
   * word this product invented for it.
   */
  readonly supportingLabel?: string;
  /** The route one of these files opens at; see the branch's own prop. */
  readonly routeFor: (sourceRelativePath: string) => RouteLocationRaw;
}>();

/** The tree's own nodes, derived from the paths the snapshot published. */
const nodes = computed(() => buildDirectoryTree(props.files, props.directory));

/**
 * The entry point's node and everything below the divider. The incoming order
 * is the entry point followed by the census (`directory-file-tree-nodes.ts`),
 * so the split is the first node and the rest — and with no divider label, or
 * nothing after it, the whole tree is drawn as one run.
 */
const entryNodes = computed(() => nodes.value.slice(0, 1));
const supportingNodes = computed(() => nodes.value.slice(1));

/** Names the visible heading the landmark takes its own accessible name from. */
const headingId = useId();
</script>

<template>
  <!-- Named by its own visible heading rather than by a duplicate `aria-label`:
       the head states whose files these are, so the landmark and the reader are
       told the same thing once (WCAG 2.4.1). -->
  <nav class="aci-directory-file-tree" :aria-labelledby="headingId">
    <p :id="headingId" class="aci-directory-file-tree__head">
      <FolderIcon class="aci-directory-file-tree__head-icon" aria-hidden="true" />
      {{ label }}
    </p>
    <div class="aci-directory-file-tree__scroll">
      <template v-if="supportingLabel !== undefined && supportingNodes.length > 0">
        <DirectoryFileTreeBranch
          :nodes="entryNodes"
          :selected-path="selectedPath"
          :route-for="routeFor"
        />
        <!-- The one file a product actually reads stands above the divider, and
             what the customization ships beside it below. A caption rather than
             a heading: it labels the run under it inside a landmark that is
             already named. -->
        <p class="aci-directory-file-tree__divider">{{ supportingLabel }}</p>
        <DirectoryFileTreeBranch
          :nodes="supportingNodes"
          :selected-path="selectedPath"
          :route-for="routeFor"
        />
      </template>
      <DirectoryFileTreeBranch
        v-else
        :nodes="nodes"
        :selected-path="selectedPath"
        :route-for="routeFor"
      />
    </div>
  </nav>
</template>

<style scoped>
/* A box of its own, like every other region of a detail page: without a frame
   the file names sit directly on the page beside the viewer's own panel, and
   which of the two a row belongs to is left to the gap between them. */
.aci-directory-file-tree {
  border: 1px solid var(--aci-line);
  border-radius: 0.5rem;
  overflow: hidden;
}

.aci-directory-file-tree__head {
  align-items: center;
  background: var(--aci-surface-sunken);
  border-block-end: 1px solid var(--aci-line);
  color: var(--aci-muted);
  display: flex;
  font-size: 0.6875rem;
  gap: 0.375rem;
  margin: 0;
  padding: 0.3125rem 0.625rem;
}

.aci-directory-file-tree__head-icon {
  block-size: 0.6875rem;
  inline-size: 0.6875rem;
}

/* The tree is capped rather than unbounded: a skill that ships fifty files
   would otherwise push its own contents off the screen, and the cap keeps the
   two columns beside each other. Below the cap it is its natural height, so a
   three-file skill shows three files and no empty scroller. */
.aci-directory-file-tree__scroll {
  max-block-size: 24rem;
  overflow-y: auto;
  padding-block: 0.1875rem;
}

/* What the run below it is, set as quietly as the head above: it names a group
   of rows rather than titling a section. The rule is what separates it from the
   entry point above. */
.aci-directory-file-tree__divider {
  border-block-start: 1px solid var(--aci-hairline);
  color: var(--aci-muted);
  font-size: 0.625rem;
  margin: 0.1875rem 0 0;
  padding: 0.3125rem 0.625rem 0.1875rem;
}
</style>
