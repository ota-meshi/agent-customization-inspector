<script setup lang="ts">
// The per-row diagnostic list, shared by every kind's row component (T071,
// compressed to a badge with a disclosed explanation by T1163).
//
// Diagnostics read the same whatever the row is: a file-confined outcome is
// about the file, not about what was recognized in it. Factoring it here keeps
// each kind's component about that kind, and keeps one place to change when the
// presentation of a file-confined outcome changes (FR-028).
//
// The badge is one word, and what happened is what it discloses. A badge
// naming the outcome — "could not be parsed", "the root could not be read" —
// put a clause beside every affected path, which is more text than a row
// scanning for trouble needs: the mark it wants is that this file has some,
// and which kind is the next question rather than the first.
//
// What FR-028 asks the row to carry — enough path and Source context to
// resolve the problem — is already on the line: the path is the link beside it
// and the Source is the home badge or the family heading above. The
// explanation is one sentence per code, so leaving it standing repeated the
// same sentence down a list (four identical unreadable-file sentences in the
// all-supported fixture) and took two or three lines of row height to do it.
//
// The disclosure is `<details>`/`<summary>` rather than a button and a flag:
// the expanded state, the keyboard behavior, and the announcement are the
// platform's (AGENTS.md § Implementation simplicity policy).
import { computed } from 'vue';
import DiscloseIcon from '~icons/lucide/chevron-right';
import { DIAGNOSTIC_REGISTRY } from '../../../../shared/diagnostics';
import type { SerializedDiagnostic } from '../../../../shared/api-types';

const props = defineProps<{
  /** The IDs this row owns, from the committed generation. */
  diagnosticIds: readonly string[];
  /** The generation's diagnostics, resolved against those IDs here. */
  diagnostics: readonly SerializedDiagnostic[];
  /**
   * The badge text, where the row's own outcome is the reason it is listed and
   * is worth more than the bare word. The files-in-no-kind row is the one such
   * caller: its read outcome is why it has a row at all, so it leads the badge
   * and the code's explanation is what opens beneath ({@link
   * UnclassifiedRow}). Omitted everywhere else.
   */
  label?: string;
}>();

/** The generation's records this row references, in the generation's order. */
const rowDiagnostics = computed(() =>
  props.diagnostics.filter((diagnostic) => props.diagnosticIds.includes(diagnostic.diagnosticId)),
);
</script>

<template>
  <ul v-if="rowDiagnostics.length > 0" role="list" class="aci-row-diagnostics">
    <li v-for="diagnostic in rowDiagnostics" :key="diagnostic.diagnosticId">
      <details class="aci-row-diagnostics__one">
        <!-- The registry fixes each code's severity, and the badge does not
             draw it: a binary file and a failed read are both attention the
             reader has to give the file, and the disclosed sentence is what
             says which (WCAG 1.4.1 — nothing here rests on the colour). -->
        <summary class="aci-row-diagnostics__badge">
          {{ label ?? 'diagnostic' }}
          <DiscloseIcon class="aci-row-diagnostics__caret" aria-hidden="true" />
        </summary>
        <p class="aci-row-diagnostics__explanation">
          {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
        </p>
      </details>
    </li>
  </ul>
  <!-- A row that names its own outcome states it even with no record behind
       it: a file read as ordinary text keeps no diagnostic, and the row still
       has to say how it read ({@link UnclassifiedRow}). -->
  <span v-else-if="label !== undefined" class="aci-meta">{{ label }}</span>
</template>

<style scoped>
/* The badges ride inline with whatever states them — a path, or a row's
   outcome column — and wrap rather than pushing it off the line (WCAG
   1.4.10). */
/* The badges ride on the line that states them — after a path, or in a row's
   outcome column — and stay there when one is opened. `inline` rather than
   `inline-flex` is what allows that: an inline box containing a block splits
   around it, so the badge keeps its place on the line and the disclosed
   paragraph lays out below at the row's own width. An inline-flex box instead
   shrink-wraps the line's remainder, which set the sentence in whatever column
   the path did not use. */
.aci-row-diagnostics {
  display: inline;
  list-style: none;
  margin: 0;
  /* The space the design has between the path and the badge, which the
     template cannot carry: Vue condenses a newline-only text node between two
     elements away. */
  padding: 0 0 0 0.375rem;
}

.aci-row-diagnostics li,
.aci-row-diagnostics__one {
  display: inline;
}

/* A tag on a row, sized with the row's other tags — the carrier kind and the
   personal-setup home — rather than with the status pill the rail carries. The
   pill states a Source's whole status on a line of its own; this rides inside a
   line of text beside a path, so at the pill's size it crowds the path it
   annotates. */
.aci-row-diagnostics__badge {
  align-items: center;
  border: 1px solid var(--aci-warn);
  border-radius: 999px;
  color: var(--aci-warn);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.625rem;
  gap: 0.25rem;
  padding: 0 0.375rem;
  white-space: nowrap;
  /* The chevron is the marker, so the built-in one is removed on both the
     standard property and WebKit's own pseudo-element. */
  list-style: none;
}

.aci-row-diagnostics__badge::-webkit-details-marker {
  display: none;
}

/* One chevron turned rather than two icons: the closed and open markers of the
   design are the same glyph at two rotations. */
.aci-row-diagnostics__caret {
  height: 0.5625rem;
  transition: rotate 120ms;
  width: 0.5625rem;
}

.aci-row-diagnostics__one[open] .aci-row-diagnostics__caret {
  rotate: 90deg;
}

@media (prefers-reduced-motion: reduce) {
  .aci-row-diagnostics__caret {
    transition: none;
  }
}

/* The sentence the badge discloses, set under it rather than beside it: it is
   a paragraph, and the badge's own line is a scanning aid. The leading edge is
   what ties it back to its own row: opened inside a list of several rows the
   paragraph otherwise flows under whichever path happens to be above it, and
   nothing in its shape says which row it belongs to. */
.aci-row-diagnostics__explanation {
  border-inline-start: 2px solid var(--aci-hairline);
  color: var(--aci-muted);
  font-size: 0.6875rem;
  margin: 0.4375rem 0 0.125rem 0.1875rem;
  max-inline-size: var(--aci-measure);
  padding-inline-start: 0.6875rem;
}
</style>
