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
// Nesting is derived from the paths rather than requested from the host: the
// census publishes Source-relative paths, and the directory structure is what
// their shared prefixes already say.
import { computed } from 'vue';
import { NuxtLink } from '#components';
import {
  encodeRootPresentation,
  escapeControlCharacters,
  rendersNothingVisible,
} from '../../../shared/entities';

/** One file the tree offers, resolved to the committed identity that opens it. */
interface SkillTreeFile {
  /** The committed file identity; the tree links to it. */
  readonly fileId: string;
  /** The Source-relative Path, used for the label and the nesting. */
  readonly sourceRelativePath: string;
}

const props = defineProps<{
  /**
   * Every file of the customization's directory, in the order the tree should
   * read them: the entry point first, then its census in path order.
   */
  readonly files: readonly SkillTreeFile[];
  /** The file currently open, so the tree can mark it. */
  readonly selectedFileId: string;
  /** The directory prefix the tree is rooted at, stripped from every label. */
  readonly directory: string;
}>();

/**
 * One rendered row: a file, with the depth its path puts it at. The segments
 * and the name are derived from the file's own path against the tree root, so
 * where each label came from is readable here.
 */
class TreeRow {
  /** The file this row opens. */
  public readonly file: SkillTreeFile;

  /** Directory segments below the tree root; empty for a file at the root. */
  public readonly segments: readonly string[];

  /** The file's own name, which is what the row shows. */
  public readonly name: string;

  /**
   * Splits the file's path below the tree root into its label parts. The
   * labels are presentation text, so control characters are escaped here
   * (data-model.md § SourceRelativePath) — after the split, which operates on
   * the stored value.
   */
  public constructor(file: SkillTreeFile, directory: string) {
    this.file = file;
    const relative = file.sourceRelativePath.startsWith(directory)
      ? file.sourceRelativePath.slice(directory.length)
      : file.sourceRelativePath;
    const parts = relative.split('/');
    this.segments = parts.slice(0, -1).map(labelFor);
    this.name = labelFor(parts.at(-1) ?? relative);
  }
}

/**
 * One path label as presentation text. Control characters are escaped
 * (data-model.md § SourceRelativePath), which leaves a space a space and a
 * zero-width space a zero-width space — so a label built only from those would
 * render as nothing, and the file's link would have neither visible text nor an
 * accessible name. A label with nothing visible left is therefore spelled out
 * entirely, the way a root label is, because it has to be unambiguous on its
 * own.
 */
const labelFor = (label: string): string => {
  const escaped = escapeControlCharacters(label);
  return rendersNothingVisible(escaped) ? encodeRootPresentation(label) : escaped;
};

/**
 * The rows in display order, each carrying the directory segments that put it
 * where it is. Sub-directories are shown as the segments of their files rather
 * than as rows of their own: a directory the census reached has files in it —
 * that is why it was walked — so a row for the directory itself would name
 * something with nothing to select.
 */
const rows = computed((): TreeRow[] =>
  props.files.map((file) => new TreeRow(file, props.directory)),
);
</script>

<template>
  <nav class="aci-file-tree" aria-label="Files in this skill">
    <ul role="list">
      <li v-for="row in rows" :key="row.file.fileId">
        <!-- The directory segments are shown with the file rather than as their
             own rows, so the label stays the path it actually is. The span
             hugs its binding because it renders authored whitespace: template
             indentation inside it would render too. -->
        <span v-if="row.segments.length > 0" class="aci-tree-directory"
          >{{ row.segments.join('/') }}/</span
        >
        <!-- `aria-current` rather than a class alone: which file is open is
             information, not decoration (WCAG 1.4.1). -->
        <NuxtLink
          :to="`/skills/${row.file.fileId}`"
          :aria-current="row.file.fileId === selectedFileId ? 'page' : undefined"
          >{{ row.name }}</NuxtLink
        >
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.aci-file-tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.aci-file-tree li {
  padding-block: 0.15rem;
}

.aci-file-tree a {
  font-family: ui-monospace, monospace;
  overflow-wrap: anywhere;
  /* Authored file names render their own whitespace: two names differing only
     in consecutive spaces must stay distinct. The link's text is exactly the
     name, so no template indentation is rendered with it. */
  white-space: pre-wrap;
}

/* The open file is marked by weight as well as by `aria-current`, so the state
   is not carried by colour alone. */
.aci-file-tree a[aria-current='page'] {
  font-weight: 600;
}

.aci-tree-directory {
  color: var(--aci-muted);
  font-family: ui-monospace, monospace;
  /* Authored path segments have no break opportunities; a long one wraps
     instead of scrolling the tree sideways (WCAG 1.4.10). `pre-wrap` keeps
     the segments' own whitespace distinct while it wraps. */
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
