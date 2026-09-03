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
import { AuthoredName } from '../authored-name';
import AuthoredNameText from '../AuthoredNameText.vue';
import SourceDiff from './SourceDiff.vue';
import ToolMark from '../ToolMark.vue';
import { SUPPORTED_TOOL_TEXT } from '../../../shared/entities';
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

/**
 * One cell's invocation name as the cell draws it: the reader's own
 * characters, with this product's note beside them where they draw nothing
 * ({@link AuthoredName}). The same unit the row, the detail, and the crumb
 * read, so one name reads identically wherever it appears.
 */
function nameOf(invocationName: string): AuthoredName {
  return new AuthoredName(invocationName);
}

/** The surfaces list's text: each surface by its caption, in inventory order. */
function surfacesText(definition: PromptSideDefinition): string {
  return definition.definition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ');
}
</script>

<template>
  <div class="aci-prompt-recognition-comparison">
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
             copy policy). A recognized cell carries the name this tool
             invokes the file by and the surfaces its admissions rest on —
             both are that one recognition's, so they are stated where the
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
                  v-for="(cell, side) in [row.left, row.right]"
                  :key="side"
                  :data-label="side === 0 ? 'First file' : 'Second file'"
                >
                  <template v-if="cell === null"
                    ><span class="aci-muted">{{ NOT_RECOGNIZED_TEXT }}</span></template
                  >
                  <template v-else
                    >Invoked as
                    <!-- The reader's own characters, because a derived name is
                         made of path segments and a declared one is authored
                         text and both are theirs — spelled out in full where
                         they draw nothing, exactly as the row and the detail
                         show such a name (FR-025; `PromptRow.vue`). A command
                         file named `.md` resolves one. -->
                    <AuthoredNameText :name="nameOf(cell.invocationName)">
                      <span
                        :class="
                          nameOf(cell.invocationName).isAuthored ? 'aci-authored-text' : 'aci-muted'
                        "
                        >{{ nameOf(cell.invocationName).text }}</span
                      >
                    </AuthoredNameText>
                    <span class="aci-muted"> ({{ surfacesText(cell) }})</span></template
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
            fit-content
          />
        </template>
      </section>
      <section v-if="comparison.bodyDiff !== null">
        <h3 class="aci-compare-block-title">Prompt or command content</h3>
        <!-- The other half of the same one parse, diffed on its own: the
             declarations align key by key whatever order each file wrote them
             in, and the body aligns line by line without the frontmatter block
             above it moving the lines. Normalizing one half and leaving the
             other only inside the source comparison would privilege it
             (FR-007).
             Named for the kind rather than for one of its source forms: one
             kind covers a VS Code prompt file and a command file alike, and
             captioning a command's body "prompt" would name it after the
             half of the kind it is not (entities.ts § CUSTOMIZATION_KIND_TEXT). -->
        <p class="aci-note">
          Each side is what that file tells the reader’s agent, left once its frontmatter block is
          removed — the prompt of a prompt file, the body of a command file; the block itself is
          above, and each file whole is in the source comparison below.
        </p>
        <SourceDiff
          :original-text="comparison.bodyDiff.originalText"
          :original-path="leftPath"
          :modified-text="comparison.bodyDiff.modifiedText"
          :modified-path="rightPath"
          content-language="markdown"
          content-label="prompt or command content of"
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
