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
        <template v-if="node.accessibleLabel !== node.label">
          <span
            class="aci-directory-file-tree-branch__directory aci-authored-text"
            aria-hidden="true"
            >{{ node.label }}/</span
          >
          <span class="aci-directory-file-tree-branch__directory-spelling"
            >{{ node.accessibleLabel }}/</span
          >
        </template>
        <span v-else class="aci-directory-file-tree-branch__directory aci-authored-text"
          >{{ node.label }}/</span
        >
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
/* The spelled-out twin is for the accessibility tree alone: visually the
   authored segment above already shows, so this one is clipped out of the
   visual layout without leaving the accessible one (the display:none family
   would remove both). */
.aci-directory-file-tree-branch__directory-spelling {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.aci-directory-file-tree-branch {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Rows are full-width targets rather than bare text: a file browser is a list
   of things to click, and a click that only lands on the glyphs is a smaller
   target than the row it appears to be (WCAG 2.5.8). */
.aci-directory-file-tree-branch__file,
.aci-directory-file-tree-branch__directory {
  border-radius: 4px;
  display: block;
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
  padding: 0.15rem 0.4rem;
  /* An authored name is its own bidi context, like `.aci-authored-text`: a
     directional control in a filename renders inside its own row and reorders
     nothing beside it. */
  unicode-bidi: isolate;
  /* Authored names render their own whitespace: two names differing only in
     consecutive spaces must stay distinct. */
  white-space: pre-wrap;
}

.aci-directory-file-tree-branch__directory {
  color: var(--aci-muted);
}

/* No underline at rest, which is the convention for a list of navigation
   targets, and one on hover so the pointer says what the row is. Colour is not
   the only signal either way: the open row below carries a background and a
   weight, and the focus ring is the shell's. */
.aci-directory-file-tree-branch__file {
  text-decoration: none;
}

.aci-directory-file-tree-branch__file:hover {
  background: color-mix(in srgb, CanvasText 8%, Canvas);
  text-decoration: underline;
}

/* The open file is marked by background and weight as well as by
   `aria-current`, so the state is not carried by colour alone (WCAG 1.4.1) and
   survives a forced-colours rendering. */
.aci-directory-file-tree-branch__file[aria-current='page'] {
  background: color-mix(in srgb, CanvasText 14%, Canvas);
  font-weight: 600;
}

@media (forced-colors: active) {
  .aci-directory-file-tree-branch__file[aria-current='page'] {
    background: Highlight;
    color: HighlightText;
  }
}
</style>
