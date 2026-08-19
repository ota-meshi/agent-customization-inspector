<script setup lang="ts">
// Instruction recognition-metadata comparison (T278; FR-011, FR-012). The
// data decisions — which tools recognize which side, which declared keys
// match, what "equal" means — live in `recognition-comparison.ts`; this
// component only draws the comparison it is given, as its two facts: the
// per-tool recognition rows, and the files' declared metadata compared
// once — the declarations are the file's one parse for the kind, so no tool
// captions them (research.md § 7).
//
// Beside each recognized state this kind draws the typed layering fact its
// inventory publishes: the surfaces a recognition rests on, stated per side
// so a difference — a root file all three Copilot surfaces read against a
// nested one the CLI alone does — is visible as the typed rows it is,
// separate from the literal source diff (api-types.ts
// § InstructionRecognitionDto). It is where a product documents reading the
// file, never a claim that a session loaded it (FR-009).
//
// Every value is rendered through the same value components the instruction
// detail uses, so a resolved value looks the same wherever it is shown, and
// through Vue text bindings only: nothing here is markup, a link, or a URI,
// and no value is masked, shortened, or reflowed (FR-025, FR-033). The rows
// state literal facts — recognized, not recognized, declared, not declared,
// same resolved value, different resolved values — and no row ranks,
// orders, or prefers either file (FR-012).
import FrontmatterBlock from '../inspection/FrontmatterBlock.vue';
import FrontmatterValueText from '../inspection/FrontmatterValueText.vue';
import {
  CUSTOMIZATION_KIND_TEXT,
  SUPPORTED_TOOL_TEXT,
  encodeRootPresentation,
  rendersNothingVisible,
} from '../../../shared/entities';
import { FRONTMATTER_KEY_KIND_TEXT } from '../../../shared/api-text';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
// The row-drawing rules are the declaration semantics' own (FR-025), shared
// with every surface that renders a matched declared key, so the two
// comparison components cannot drift apart in how a key or value reads.
import {
  declarationRowHeaderLabel as rowHeaderLabel,
  valueOpensBlock as opensBlock,
} from '../inspection/declaration-comparison';
import {
  INSTRUCTION_DECLARATION_SIDE_STATE_TEXT,
  INSTRUCTION_RECOGNITION_SIDE_STATE_TEXT,
  type InstructionRecognitionComparison,
} from './recognition-comparison';
import type { VendorSurface } from '../../../shared/registries/behavior-types';

defineProps<{
  /** The built comparison — recognition rows and matched keys; see the data module. */
  comparison: InstructionRecognitionComparison;
}>();

/** The surfaces list's text: each surface by its caption, in inventory order. */
function surfacesText(surfaces: readonly VendorSurface[]): string {
  return surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ');
}
</script>

<template>
  <div class="aci-instruction-recognition-comparison">
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
             copy policy). A recognized cell carries its surfaces — the typed
             layering fact is that recognition's, so it is stated where the
             recognition is. `tabindex` because the table is its own
             horizontal scroll container on a wide viewport (WCAG 2.1.1). -->
        <table class="aci-instruction-recognition-comparison__table" tabindex="0">
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
                v-for="(cell, side) in [
                  { state: row.left, surfaces: row.leftSurfaces },
                  { state: row.right, surfaces: row.rightSurfaces },
                ]"
                :key="side"
                :data-label="side === 0 ? 'First file' : 'Second file'"
              >
                {{ INSTRUCTION_RECOGNITION_SIDE_STATE_TEXT[cell.state] }}
                <span v-if="cell.surfaces.length > 0" class="aci-muted">
                  — surfaces: {{ surfacesText(cell.surfaces) }}
                </span>
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
             being matched against (FR-028). -->
        <p
          v-if="INSTRUCTION_DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] !== ''"
          class="aci-note"
        >
          First file {{ INSTRUCTION_DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] }}
        </p>
        <p
          v-if="INSTRUCTION_DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] !== ''"
          class="aci-note"
        >
          Second file {{ INSTRUCTION_DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] }}
        </p>
        <!-- Two parsed sides with nothing declared would otherwise leave the
             section as a bare heading: the state sentences speak only for
             unparsed sides, and the table only for matched keys, so this
             case states itself. -->
        <p
          v-if="
            comparison.leftDeclarations === 'parsed' &&
            comparison.rightDeclarations === 'parsed' &&
            comparison.declarations.length === 0
          "
          class="aci-note"
        >
          No compared file declares a key to compare.
        </p>
        <!-- The matched declared keys, one row each, with both resolved values
             in full (FR-011). A table rather than a grid of divs: the
             relationship a screen reader needs — this key, this file's value,
             that file's value — is exactly what table headers state.
             `tabindex` because the table is its own horizontal scroll
             container on a wide viewport (WCAG 2.1.1). -->
        <table
          v-if="comparison.declarations.length > 0"
          class="aci-instruction-recognition-comparison__table"
          tabindex="0"
        >
          <thead>
            <tr>
              <th scope="col">Declared key</th>
              <th scope="col">First file</th>
              <th scope="col">Second file</th>
              <th scope="col">Resolved values</th>
            </tr>
          </thead>
          <tbody>
            <!-- Keyed by the parser's key identity — parsed type plus
                 spelling — because two rows can share one spelling
                 (see DeclarationComparisonRow). -->
            <tr v-for="row in comparison.declarations" :key="`${row.keyKind}:${row.key}`">
              <!-- The key is the parser's resolved spelling — an authored
                   `007` is `7`, with the authored form kept by the source
                   comparison beside these rows — shown exactly as the detail
                   route's declaration list shows it, so one metadata fact
                   reads the same on every surface; the whitespace-safe
                   spelling lives in the accessible name ({@link
                   rowHeaderLabel}). An invisible key gets the note the detail
                   route shows (FR-025). -->
              <th scope="row" :aria-label="rowHeaderLabel(row)">
                <span class="aci-authored-text aci-authored-atomic">{{ row.key }}</span>
                <!-- The invisible note carries the spelled-out form: a flat
                     reading collapses whitespace, and two keys made of
                     different runs of it must not read as one (FR-025). -->
                <span v-if="row.key === '' || rendersNothingVisible(row.key)" class="aci-muted">
                  {{
                    row.key === ''
                      ? '(empty key)'
                      : `(key with no visible characters: ${encodeRootPresentation(row.key)})`
                  }}
                </span>
                <!-- A key whose parsed type is not the string default is
                     captioned with that type — the shared rendering rule that
                     keeps a numeric `1` apart from the string `"1"` it
                     renders like, here and in every frontmatter block
                     (FR-025). -->
                <span v-if="row.keyKind !== 'string'" class="aci-muted">
                  ({{ FRONTMATTER_KEY_KIND_TEXT[row.keyKind] }})
                </span>
              </th>
              <td
                v-for="(value, side) in [row.left, row.right]"
                :key="side"
                :data-label="side === 0 ? 'First file' : 'Second file'"
              >
                <!-- An authored scalar that spells the state reads like it in
                     a flat channel; the muted styling tells them apart
                     visibly, and the source comparison beside these rows
                     carries the exact truth. -->
                <span v-if="value === null" class="aci-muted">not declared</span>
                <FrontmatterBlock v-else-if="opensBlock(value)" :value="value" />
                <FrontmatterValueText v-else :value="value" />
              </td>
              <!-- Equality of resolved values, stated as the literal fact it
                   is: no row says which value a product would use (FR-012). -->
              <td data-label="Resolved values">{{ row.equal ? 'Same' : 'Differs' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* The tables scroll inside themselves when a cell is wide, so the page never
   scrolls sideways (WCAG 1.4.10). */
.aci-instruction-recognition-comparison__table {
  border-collapse: collapse;
  display: block;
  max-inline-size: 100%;
  overflow-x: auto;
}

.aci-instruction-recognition-comparison__table th,
.aci-instruction-recognition-comparison__table td {
  border: 1px solid var(--aci-border);
  padding: 0.3rem 0.5rem;
  text-align: start;
  vertical-align: top;
}

/* Authored values keep their spelling but wrap rather than widening the row
   past the viewport; a value with no break opportunities still scrolls
   inside the table's own box. */
.aci-instruction-recognition-comparison__table td {
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
  .aci-instruction-recognition-comparison__table thead {
    display: none;
  }

  .aci-instruction-recognition-comparison__table tbody,
  .aci-instruction-recognition-comparison__table tr,
  .aci-instruction-recognition-comparison__table th[scope='row'],
  .aci-instruction-recognition-comparison__table td {
    display: block;
  }

  .aci-instruction-recognition-comparison__table tr {
    border: 1px solid var(--aci-border);
    border-radius: 4px;
    margin-block-end: 0.5rem;
  }

  .aci-instruction-recognition-comparison__table th,
  .aci-instruction-recognition-comparison__table td {
    border: 0;
    border-block-start: 1px solid var(--aci-border);
  }

  .aci-instruction-recognition-comparison__table tr > :first-child {
    border-block-start: 0;
  }

  .aci-instruction-recognition-comparison__table td::before {
    content: attr(data-label);
    display: block;
    font-weight: 600;
  }
}
</style>
