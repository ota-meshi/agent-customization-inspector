<script setup lang="ts">
// One level of a directory-shaped customization's tree, and every level below
// it — a skill's directory, or the root of a plugin and everything it ships.
//
// Recursive so the markup is the structure: a directory's files are a list
// *inside* that directory's item, which is what assistive technology reads as
// containment. Drawn as one flat list with a wider indent, the relationship
// between a directory and the files under it exists only in the pixels, and a
// reader who cannot see them is told two files with the same name are siblings.
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { NuxtLink } from '#components';
import FolderIcon from '~icons/lucide/folder';
import type { DirectoryTreeNode } from './directory-file-tree-nodes';

const props = defineProps<{
  /** The nodes at this level, in the order the tree should read them. */
  readonly nodes: readonly DirectoryTreeNode[];
  /** The path of the file currently open, so the branch can mark it. */
  readonly selectedPath: string;
  /**
   * The route one of this customization's files opens at. A function rather
   * than a kind, because a route is not always a path alone: a skill's is
   * `/skills/<path>`, while a plugin's names the row as well, since one plugin
   * root can be reached through more than one offering.
   */
  readonly routeFor: (sourceRelativePath: string) => RouteLocationRaw;
  /** How many branches stand above this one; 0 at the tree's own root. */
  readonly depth?: number;
}>();

/**
 * How many levels of indentation a branch can take. A skill directory nests as
 * deep as its author made it, and unbounded indentation walks the rows out of
 * the tree's own scroll box — at which point the deep rows need a second
 * scrollbar to reach (WCAG 1.4.10). Past the cap the nesting is still in the
 * markup, which is what carries it; only the indent stops growing.
 */
const MAX_INDENTED_DEPTH = 6;

/** The step this branch's own nested lists indent by; none past the cap. */
const indentStep = computed(() => ((props.depth ?? 0) < MAX_INDENTED_DEPTH ? '0.9rem' : '0'));
</script>

<template>
  <!-- Markerless, so the list carries `role="list"`: WebKit drops list
       semantics from a list with no marker, and VoiceOver then stops announcing
       the item count and the nesting. -->
  <ul class="aci-directory-file-tree-branch" role="list">
    <li v-for="node in nodes" :key="node.id">
      <!-- `aria-current` rather than a class alone: which file is open is
           information, not decoration (WCAG 1.4.1). The link's text is exactly
           the name, so no template indentation renders with it, and its
           accessible name is that same name under the single-line rule — an
           accessible name collapses whitespace, and two files a directory holds
           apart must not announce as one (FR-025). The branch is the node's own
           `kind` — the union's discriminant — never a runtime shape test over a
           value this surface built itself. -->
      <NuxtLink
        v-if="node.kind === 'file'"
        class="aci-directory-file-tree-branch__file"
        :to="routeFor(node.sourceRelativePath)"
        :aria-current="node.sourceRelativePath === selectedPath ? 'page' : undefined"
        :aria-label="node.accessibleLabel"
        >{{ node.label }}</NuxtLink
      >
      <template v-else>
        <!-- A directory is not something to open: it holds the nodes under it,
             and every file the census reached is already one of them. -->
        <!-- The same whitespace rule the file links carry (FR-025): where the
             accessible spelling differs from the visible one — leading,
             trailing, or run-together whitespace, which announcement
             collapses — the visible segment is hidden from the name
             computation and the spelled-out twin speaks instead. `aria-label`
             cannot do it here: a generic span exposes none. -->
        <p class="aci-directory-file-tree-branch__directory">
          <FolderIcon class="aci-directory-file-tree-branch__directory-icon" aria-hidden="true" />
          <template v-if="node.accessibleLabel !== node.label">
            <span class="aci-authored-text" aria-hidden="true">{{ node.label }}/</span>
            <span class="aci-visually-hidden">{{ node.accessibleLabel }}/</span>
          </template>
          <span v-else class="aci-authored-text">{{ node.label }}/</span>
          <!-- How many files are under it, at the row's end. The directory is
               not something to open, so what its row can say is what it
               holds. -->
          <span class="aci-directory-file-tree-branch__directory-count">{{ node.fileCount }}</span>
        </p>
        <DirectoryFileTreeBranch
          :route-for="routeFor"
          :nodes="node.children"
          :selected-path="selectedPath"
          :depth="(depth ?? 0) + 1"
          :style="{ paddingInlineStart: indentStep }"
        />
      </template>
    </li>
  </ul>
</template>

<style scoped>
.aci-directory-file-tree-branch {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Rows are full-width targets rather than bare text: a file browser is a list
   of things to click, and a click that only lands on the glyphs is a smaller
   target than the row it appears to be (WCAG 2.5.8). The transparent leading
   edge is what the open row fills in, so no row moves when the selection
   does. */
.aci-directory-file-tree-branch__file,
.aci-directory-file-tree-branch__directory {
  border-inline-start: 2px solid transparent;
  display: block;
  font-family: ui-monospace, monospace;
  font-size: 0.71875rem;
  margin: 0;
  overflow-wrap: anywhere;
  padding: 0.25rem 0.625rem 0.25rem 0.5rem;
  /* An authored name is its own bidi context, like `.aci-authored-text`: a
     directional control in a filename renders inside its own row and reorders
     nothing beside it. */
  unicode-bidi: isolate;
  /* Authored names render their own whitespace: two names differing only in
     consecutive spaces must stay distinct. */
  white-space: pre-wrap;
}

.aci-directory-file-tree-branch__directory {
  align-items: center;
  color: var(--aci-muted);
  display: flex;
  gap: 0.375rem;
}

.aci-directory-file-tree-branch__directory-icon {
  block-size: 0.6875rem;
  flex: none;
  inline-size: 0.6875rem;
}

.aci-directory-file-tree-branch__directory-count {
  font-variant-numeric: tabular-nums;
  margin-inline-start: auto;
}

/* No underline at rest, which is the convention for a list of navigation
   targets, and one on hover so the pointer says what the row is. Colour is not
   the only signal either way: the open row below carries a background and a
   weight, and the focus ring is the shell's. */
.aci-directory-file-tree-branch__file {
  text-decoration: none;
}

.aci-directory-file-tree-branch__file:hover {
  border-inline-start-color: var(--aci-line);
  text-decoration: underline;
}

/* The open file is marked the way the rail marks the list in view: a leading
   edge in the accent with a soft ground behind the row. One form for one
   meaning, so a reader who has used the rail already knows what it says
   (Constitution II). The weight and `aria-current` carry it as well, so the
   state does not rest on colour (WCAG 1.4.1) and survives forced colours. */
.aci-directory-file-tree-branch__file[aria-current='page'] {
  background: var(--aci-accent-soft);
  border-inline-start-color: var(--aci-accent);
  font-weight: 600;
}

@media (forced-colors: active) {
  .aci-directory-file-tree-branch__file[aria-current='page'] {
    background: Highlight;
    color: HighlightText;
  }
}
</style>
