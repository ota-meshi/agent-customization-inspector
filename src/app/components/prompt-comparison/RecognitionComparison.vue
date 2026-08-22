<script setup lang="ts">
// Prompt and command recognition-metadata comparison (T505; FR-011,
// FR-012). The data decisions — which tools recognize which side, what each
// invokes it by, what each side's frontmatter serializes to — live in
// `recognition-comparison.ts`; this component only draws the comparison it
// is given, as its two facts: the per-tool recognition rows, and the files'
// frontmatter serialized to two canonical YAML documents and diffed in
// Monaco — the declarations are the file's one parse for the kind, so no
// tool captions them (research.md § 7, frontmatter-yaml.ts).
//
// A recognized cell states two typed facts of that one recognition: the name
// this tool invokes this file by, and the surfaces the admitting rules rest
// on. The name is where this kind's comparison earns its own surface — the
// two files reached one comparison by resolving one name, and the cells are
// where a reader sees which product reads which file to get there.
//
// The rows state literal facts — a definition or its absence — and the diff
// states the serialized documents exactly: nothing here is markup, a link,
// or a URI, and no value is masked, shortened, or reflowed (FR-025,
// FR-033); no row or side ranks, orders, or prefers either file (FR-012).
// Nothing states which of two files a reader typing the name would reach:
// that turns on a same-name skill outranking a command and on runtime this
// tool never observes (FR-009).
import SourceDiff from './SourceDiff.vue';
import {
  CUSTOMIZATION_KIND_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
} from '../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import {
  PROMPT_DECLARATION_SIDE_STATE_TEXT,
  type PromptRecognitionComparison,
  type PromptSideDefinition,
} from './recognition-comparison';

defineProps<{
  /** The built comparison — recognition rows and diff documents; see the data module. */
  comparison: PromptRecognitionComparison;
  /** The first compared file's Source-relative Path: the diff side's label (FR-030). */
  leftPath: string;
  /** The second compared file's path; see {@link leftPath}. */
  rightPath: string;
}>();

/**
 * What a cell with no definition reads as. A literal rather than a member of
 * a text table, because absence is null here rather than a union member: a
 * state field beside the definition would be a second encoding of the same
 * fact (AGENTS.md § Implementation simplicity policy).
 */
const NOT_RECOGNIZED_TEXT = 'Not recognized';

/** The surfaces list's text: each surface by its caption, in inventory order. */
function surfacesText(definition: PromptSideDefinition): string {
  return definition.definition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ');
}
</script>

<template>
  <div class="aci-prompt-recognition-comparison">
    <p v-if="comparison.tools.length === 0" class="aci-note">
      No compared file here carries a recognition, so there is no tool recognition or declared
      metadata to compare. The source comparison above is the whole comparison.
    </p>
    <template v-else>
      <section>
        <h3>Tool recognition</h3>
        <!-- One row per recognizing tool, in the contracted tool order: each
             recognition stays distinguishable from the physical file
             (US3 scenario 2), captioned in words (AGENTS.md § User-visible
             copy policy). A recognized cell carries the name this tool
             invokes the file by and the surfaces its admissions rest on —
             both are that one recognition's, so they are stated where the
             recognition is. `tabindex` because the table is its own
             horizontal scroll container on a wide viewport (WCAG 2.1.1). -->
        <table class="aci-prompt-recognition-comparison__table" tabindex="0">
          <thead>
            <tr>
              <th scope="col">Tool</th>
              <th scope="col">First file</th>
              <th scope="col">Second file</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison.tools" :key="row.tool">
              <th scope="row">
                {{ SUPPORTED_TOOL_TEXT[row.tool] }} · {{ CUSTOMIZATION_KIND_TEXT[row.kind] }}
              </th>
              <td
                v-for="(cell, side) in [row.left, row.right]"
                :key="side"
                :data-label="side === 0 ? 'First file' : 'Second file'"
              >
                <template v-if="cell === null">{{ NOT_RECOGNIZED_TEXT }}</template>
                <template v-else
                  >Invoked as
                  <!-- The name escaped like a path, because a derived one is
                       made of path segments and a declared one is authored
                       text: both are the reader's own characters, and both
                       are shown as what they are (FR-025). -->
                  <span class="aci-authored-text">{{
                    escapeControlCharacters(cell.invocationName)
                  }}</span>
                  <span class="aci-muted"> — surfaces: {{ surfacesText(cell) }}</span></template
                >
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3>Declared metadata</h3>
        <!-- The files' declared metadata, not any tool's: the declarations
             are the file's one scan-time parse for the kind (FR-028), so
             they are compared once, under no tool caption (research.md
             § 7). A side without parsed declarations is stated instead of
             being diffed against (FR-028). -->
        <p
          v-if="PROMPT_DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] !== ''"
          class="aci-note"
        >
          First file {{ PROMPT_DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] }}
        </p>
        <p
          v-if="PROMPT_DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] !== ''"
          class="aci-note"
        >
          Second file {{ PROMPT_DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] }}
        </p>
        <template v-if="comparison.frontmatterDiff !== null">
          <!-- What the diff holds, said before it: both sides are the
               canonical serialization of the frontmatter, not the files'
               own spellings — those stay in the source comparison above
               (FR-007). The canonical key order is stated too, because a
               reader comparing against their own file would otherwise read
               the order as authored. -->
          <p class="aci-note">
            Each side is the file's frontmatter serialized as YAML with its keys in one canonical
            order; the files' own spelling and key order stay in the source comparison above.
          </p>
          <SourceDiff
            :original-text="comparison.frontmatterDiff.originalText"
            :original-path="leftPath"
            :modified-text="comparison.frontmatterDiff.modifiedText"
            :modified-path="rightPath"
            content-language="yaml"
            content-label="frontmatter of"
            fit-content
          />
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* The tables scroll inside themselves when a cell is wide, so the page never
   scrolls sideways (WCAG 1.4.10). */
.aci-prompt-recognition-comparison__table {
  border-collapse: collapse;
  display: block;
  max-inline-size: 100%;
  overflow-x: auto;
}

.aci-prompt-recognition-comparison__table th,
.aci-prompt-recognition-comparison__table td {
  border: 1px solid var(--aci-border);
  padding: 0.3rem 0.5rem;
  text-align: start;
  vertical-align: top;
}

/* Authored values keep their spelling but wrap rather than widening the row
   past the viewport; a value with no break opportunities still scrolls
   inside the table's own box. */
.aci-prompt-recognition-comparison__table td {
  overflow-wrap: anywhere;
}

/* On a narrow viewport the columns reflow into one stacked block per row
   instead of scrolling in two dimensions: the contract allows
   two-dimensional scrolling only for essential source-code regions
   (accessibility-acceptance.md § WCAG 1.4.10), and these rows are data, not
   source. Each cell repeats its column caption from `data-label`, so the
   association the hidden header row carried stays visible in reading
   order. */
@media (width < 52rem) {
  .aci-prompt-recognition-comparison__table thead {
    display: none;
  }

  .aci-prompt-recognition-comparison__table tbody,
  .aci-prompt-recognition-comparison__table tr,
  .aci-prompt-recognition-comparison__table th[scope='row'],
  .aci-prompt-recognition-comparison__table td {
    display: block;
  }

  .aci-prompt-recognition-comparison__table tr {
    border: 1px solid var(--aci-border);
    border-radius: 4px;
    margin-block-end: 0.5rem;
  }

  .aci-prompt-recognition-comparison__table th,
  .aci-prompt-recognition-comparison__table td {
    border: 0;
    border-block-start: 1px solid var(--aci-border);
  }

  .aci-prompt-recognition-comparison__table tr > :first-child {
    border-block-start: 0;
  }

  .aci-prompt-recognition-comparison__table td::before {
    content: attr(data-label);
    display: block;
    font-weight: 600;
  }
}
</style>
