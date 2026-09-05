<script setup lang="ts">
// Instruction recognition-metadata comparison (T278; FR-011, FR-012). The
// data decisions — which tools recognize which side, what each side's
// frontmatter serializes to — live in `recognition-comparison.ts`; this
// component only draws the comparison it is given, as its two facts: the
// per-tool recognition rows, and the files' frontmatter serialized to two
// canonical YAML documents and diffed in Monaco — the declarations are the
// file's one parse for the kind, so no tool captions them (research.md § 7,
// frontmatter-yaml.ts).
//
// Beside each recognized state this kind draws the typed layering fact its
// inventory publishes: the surfaces a recognition rests on, stated per side
// so a difference — a root file all three Copilot surfaces read against a
// nested one the CLI alone does — is visible as the typed rows it is,
// separate from the literal source diff (api-types.ts
// § FileRecognitionDto). It is where a product documents reading the
// file, never a claim that a session loaded it (FR-009).
//
// The rows state literal facts — recognized, not recognized — and the diff
// states the serialized documents exactly: nothing here is markup, a link,
// or a URI, and no value is masked, shortened, or reflowed (FR-025,
// FR-033); no row or side ranks, orders, or prefers either file (FR-012).
import SourceDiff from '../comparison/SourceDiff.vue';
import ToolMark from '../ToolMark.vue';
import { useSessionViewState } from '../../composables/session-view-state';
import { SUPPORTED_TOOL_TEXT } from '../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import {
  INSTRUCTION_DECLARATION_SIDE_STATE_TEXT,
  INSTRUCTION_RECOGNITION_SIDE_STATE_TEXT,
  type InstructionRecognitionComparison,
} from './recognition-comparison';
import type { VendorSurface } from '../../../shared/registries/behavior-types';

defineProps<{
  /** The built comparison — recognition rows and diff documents; see the data module. */
  comparison: InstructionRecognitionComparison;
  /** The first compared file's Source-relative Path: the diff side's label (FR-030). */
  leftPath: string;
  /** The second compared file's path; see {@link leftPath}. */
  rightPath: string;
}>();

// The diffs below join the instruction comparison's own registry rather than
// the session's (`SourceDiff.registerContentOwner`).
const sessionViewState = useSessionViewState();
const registerComparisonContentOwner = (disposer: () => void): (() => void) =>
  sessionViewState.instructionComparison.registerOpenContentOwner(disposer);

/** What both diffs below say when the editor cannot be constructed. */
const MOUNT_ERROR_MESSAGE =
  'The comparison viewer could not be loaded. Each side is shown below in full.';

/** The surfaces list's text: each surface by its caption, in inventory order. */
function surfacesText(surfaces: readonly VendorSurface[]): string {
  return surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ');
}
</script>

<template>
  <div class="aci-instruction-recognition-comparison">
    <!-- The sections stand in the order a reader needs them: what each file
         declares, what each file says, then the complete files the page
         supplies, and last the recognitions — which tool reads which side is
         context for the rest rather than the subject of the comparison. -->
    <p v-if="comparison.tools.length === 0" class="aci-note">
      No compared file here carries a recognition, so there is no tool recognition or declared
      metadata to compare. The source comparison below is the whole comparison.
    </p>
    <template v-else>
      <section>
        <h3 class="aci-compare-block-title">Tool recognition</h3>
        <!-- One row per recognizing tool, in the contracted tool order: each
             recognition stays distinguishable from the physical file
             (US3 scenario 2), captioned in words (AGENTS.md § User-visible
             copy policy). A recognized cell carries its surfaces — the typed
             layering fact is that recognition's, so it is stated where the
             recognition is. `tabindex` because the box
             around the table is its own horizontal scroll container on a wide
             viewport (WCAG 2.1.1). -->
        <div class="aci-recognition-table" tabindex="0">
          <table>
            <thead>
              <tr>
                <th scope="col">Tool</th>
                <th scope="col">First file</th>
                <th scope="col">Second file</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comparison.tools" :key="row.tool">
                <!-- Decorative, because the row spells the product's name
                     beside it: the mark is what a reader scanning the column
                     finds, and its own accessible name would be the same word
                     twice (`ToolMark.vue`). -->
                <th scope="row">
                  <span class="aci-recognition-table__tool"
                    ><ToolMark decorative :tool="row.tool" />
                    {{ SUPPORTED_TOOL_TEXT[row.tool] }}</span
                  >
                </th>
                <td
                  v-for="(cell, side) in [
                    { state: row.left, surfaces: row.leftSurfaces },
                    { state: row.right, surfaces: row.rightSurfaces },
                  ]"
                  :key="side"
                  :data-label="side === 0 ? 'First file' : 'Second file'"
                >
                  <span :class="cell.state === 'recognized' ? undefined : 'aci-muted'">{{
                    INSTRUCTION_RECOGNITION_SIDE_STATE_TEXT[cell.state]
                  }}</span>
                  <span v-if="cell.surfaces.length > 0" class="aci-muted"
                    >({{ surfacesText(cell.surfaces) }})</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 class="aci-compare-block-title">Declared metadata</h3>
        <!-- The files' declared metadata, not any tool's: the declarations
             are the file's one scan-time parse for the kind (FR-028), so
             they are compared once, under no tool caption (research.md
             § 7). A side without parsed declarations is stated instead of
             being diffed against (FR-028). -->
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
        <template v-if="comparison.frontmatterDiff !== null">
          <!-- What the diff holds, said before it: both sides are the
               canonical serialization of the frontmatter, not the files'
               own spellings — those stay in the source comparison below
               (FR-007). The canonical key order is stated too, because a
               reader comparing against their own file would otherwise read
               the order as authored. -->
          <p class="aci-note">
            Each side is the file's frontmatter serialized as YAML with its keys in one canonical
            order; the files' own spelling and key order stay in the source comparison below.
          </p>
          <SourceDiff
            :original-text="comparison.frontmatterDiff.originalText"
            :original-path="leftPath"
            :modified-text="comparison.frontmatterDiff.modifiedText"
            :modified-path="rightPath"
            content-language="yaml"
            content-label="frontmatter of"
            :mount-error-message="MOUNT_ERROR_MESSAGE"
            :register-content-owner="registerComparisonContentOwner"
            fit-content
          />
        </template>
      </section>
      <section v-if="comparison.bodyDiff !== null">
        <h3 class="aci-compare-block-title">Instructions</h3>
        <!-- The other half of the same one parse, diffed on its own: the
             declarations align key by key whatever order each file wrote them
             in, and the body aligns line by line without the frontmatter block
             above it moving the lines. Normalizing one half and leaving the
             other only inside the source comparison would privilege it
             (FR-007). -->
        <p class="aci-note">
          Each side is the instructions left once that file’s frontmatter block is removed; the
          block itself is above, and each file whole is in the source comparison below.
        </p>
        <SourceDiff
          :original-text="comparison.bodyDiff.originalText"
          :original-path="leftPath"
          :modified-text="comparison.bodyDiff.modifiedText"
          :modified-path="rightPath"
          content-language="markdown"
          content-label="instructions of"
          :mount-error-message="MOUNT_ERROR_MESSAGE"
          :register-content-owner="registerComparisonContentOwner"
          fit-content
        />
      </section>
    </template>
    <!-- Where the page's complete authored sources land: below the two
         halves they were split into and above the recognitions. The page owns
         what that is, because it differs by kind — one diff where both sides
         share a format, two independent viewers for the custom-agent kind,
         whose two formats have no meaningful byte-for-byte alignment — while
         the order is this component's, so every kind's comparison reads the
         same way. Outside the recognition branch above, because a file every
         tool fails to recognize still shows its bytes (FR-027). -->
    <slot name="source" />
  </div>
</template>
