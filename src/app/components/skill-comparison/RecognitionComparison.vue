<script setup lang="ts">
// Skill recognition-metadata comparison (T198; FR-011, FR-012). The data
// decisions — which tools recognize which side, what each side's frontmatter
// serializes to — live in `recognition-comparison.ts`; this component only
// draws the comparison it is given, as its two facts: the per-tool
// recognition rows, and the files' frontmatter serialized to two canonical
// YAML documents and diffed in Monaco — the declarations are the file's one
// parse for the kind, so no tool captions them (research.md § 7,
// frontmatter-yaml.ts).
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
  DECLARATION_SIDE_STATE_TEXT,
  RECOGNITION_SIDE_STATE_TEXT,
  type SkillRecognitionComparison,
} from './recognition-comparison';

defineProps<{
  /** The built comparison — recognition rows and diff documents; see the data module. */
  comparison: SkillRecognitionComparison;
  /** The first compared file's Source-relative Path: the diff side's label (FR-030). */
  leftPath: string;
  /** The second compared file's path; see {@link leftPath}. */
  rightPath: string;
}>();

// The diffs below join the skill comparison's own registry rather than the
// session's (`SourceDiff.registerContentOwner`).
const sessionViewState = useSessionViewState();
const registerComparisonContentOwner = (disposer: () => void): (() => void) =>
  sessionViewState.skillComparison.registerOpenContentOwner(disposer);

/** What both diffs below say when the editor cannot be constructed. */
const MOUNT_ERROR_MESSAGE =
  'The comparison viewer could not be loaded. Each side is shown below in full.';

/** What both diffs below call a side whose copy ships no corresponding file. */
const ABSENCE_NOTE = 'no file in this skill directory';
</script>

<template>
  <div class="aci-recognition-comparison">
    <!-- The sections stand in the order a reader needs them: which products
         read each side, then what each file declares, what each file says, and
         last the complete files the page supplies. The recognitions lead
         because they say who the difference below is a difference for — and
         because they are the only place a comparison can state that a product
         reads neither side, which the side cards can only leave unsaid. -->
    <!-- Count-neutral, because a one-sided pair reaches this note too: one
         present file no recognition owns, beside its stated absence
         (FR-011). -->
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
             copy policy). A table rather than sentences: the relationship a
             screen reader needs — this tool, this file's state, that file's
             state — is exactly what table headers state. `tabindex` because the box
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
                <!-- The recognition, and the surfaces of the documented
                     behaviors its admitting rules rest on: FR-009 states them
                     beside every recognition, so a side that recognizes the file
                     says on which surfaces it is documented to be read. A side
                     with no recognition has none to state. -->
                <td data-label="First file">
                  <span :class="row.left === 'recognized' ? undefined : 'aci-muted'">{{
                    RECOGNITION_SIDE_STATE_TEXT[row.left]
                  }}</span>
                  <span v-if="row.leftSurfaces.length > 0" class="aci-muted">
                    ({{
                      row.leftSurfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ')
                    }})
                  </span>
                </td>
                <td data-label="Second file">
                  <span :class="row.right === 'recognized' ? undefined : 'aci-muted'">{{
                    RECOGNITION_SIDE_STATE_TEXT[row.right]
                  }}</span>
                  <span v-if="row.rightSurfaces.length > 0" class="aci-muted">
                    ({{
                      row.rightSurfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ')
                    }})
                  </span>
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
        <p v-if="DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] !== ''" class="aci-note">
          First file {{ DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] }}
        </p>
        <p v-if="DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] !== ''" class="aci-note">
          Second file {{ DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] }}
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
            :original-absent="comparison.frontmatterDiff.originalAbsent"
            :modified-absent="comparison.frontmatterDiff.modifiedAbsent"
            :absence-note="ABSENCE_NOTE"
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
             in, and the instructions align line by line without the
             frontmatter block above them moving the lines. Normalizing one
             half and leaving the other only inside the source comparison
             would privilege it (FR-007). -->
        <p class="aci-note">
          Each side is the instructions left once that file's frontmatter block is removed; the
          block itself is above, and each file whole is in the source comparison below.
        </p>
        <SourceDiff
          :original-text="comparison.bodyDiff.originalText"
          :original-path="leftPath"
          :modified-text="comparison.bodyDiff.modifiedText"
          :modified-path="rightPath"
          :original-absent="comparison.bodyDiff.originalAbsent"
          :modified-absent="comparison.bodyDiff.modifiedAbsent"
          :absence-note="ABSENCE_NOTE"
          content-language="markdown"
          content-label="instructions of"
          :mount-error-message="MOUNT_ERROR_MESSAGE"
          :register-content-owner="registerComparisonContentOwner"
          fit-content
        />
      </section>
    </template>
    <!-- Where the page's complete authored sources land: last, below the two
         halves they were split into. The page owns what that is, because it
         differs by kind — one diff where both sides share a format, two
         independent viewers for the custom-agent kind, whose two formats have
         no meaningful byte-for-byte alignment — while the order is this
         component's, so every kind's comparison reads the same way. Outside
         the recognition branch above, because a file every tool fails to
         recognize still shows its bytes (FR-027). -->
    <slot name="source" />
  </div>
</template>
