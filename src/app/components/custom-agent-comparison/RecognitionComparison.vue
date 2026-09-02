<script setup lang="ts">
// Custom-agent recognition-metadata comparison (T575; FR-011, FR-012). The
// data decisions — which tools recognize which side, what each names the
// agent, what each side's metadata serializes to — live in
// `recognition-comparison.ts`; this component only draws the comparison it is
// given, as its facts: the per-tool recognition rows, and the two halves of
// each file's one parse — the declared metadata serialized to two canonical
// YAML documents, and the instructions each file gives its agent — each
// diffed in Monaco. Both halves are the file's one parse for the kind, so no
// tool captions either (research.md § 7, frontmatter-yaml.ts).
//
// The two halves stand in the order the detail shows them, so a reader who
// read either file meets them the same way here. Both are diffed apart rather
// than left to a diff of the files' bytes because this kind's locations are
// written in two formats: aligning a TOML agent against a Markdown one byte
// for byte aligns quoting and delimiters instead of the values and the prose.
// This surface mounts no such diff at all for that reason.
//
// A recognized cell states two typed facts of that one recognition: the name
// this tool identifies the agent by, and the surfaces the admitting rules
// rest on. The name is where this kind's comparison earns its own surface —
// two products can read one file and name its agent differently, so the cells
// are where a reader sees which product reads which file under which name.
//
// Each file whole follows the two halves, through the `source` slot the page
// fills: two independent viewers rather than one diff, because two files
// written in two formats have no byte-for-byte alignment to assert while a
// comparison surface must still display a readable file exactly as written
// (FR-027).
//
// The rows state literal facts — a definition or its absence — and the diff
// states the serialized documents exactly: nothing here is markup, a link, or
// a URI, and no value is masked, shortened, or reflowed (FR-025, FR-033); no
// row or side ranks, orders, or prefers either file (FR-012). A declared
// `mcp_servers`, `mcpServers`, or `mcp-servers` block is one entry of the
// diffed document like any other, and owns no MCP row anywhere
// (data-model.md § Inventory unit). Nothing states which of two same-name
// agents a spawn would select, or what a spawned session would inherit: both
// are runtime this tool never observes (FR-009).
import { AuthoredName } from '../authored-name';
import SourceDiff from './SourceDiff.vue';
import ToolMark from '../ToolMark.vue';
import { SUPPORTED_TOOL_TEXT } from '../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import {
  CUSTOM_AGENT_DECLARATION_SIDE_STATE_TEXT,
  type CustomAgentRecognitionComparison,
  type CustomAgentSideDefinition,
} from './recognition-comparison';

defineProps<{
  /** The built comparison — recognition rows and diff documents; see the data module. */
  comparison: CustomAgentRecognitionComparison;
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
 * What a recognized cell says when its tool publishes no name for the file:
 * a declared-`name` product reading a file that declares none. Written here
 * rather than shared, the way every surface writes its own copy
 * (AGENTS.md § User-visible copy policy).
 */
const NO_NAME_TEXT = 'No known agent name';

/**
 * One cell's declared name as the cell draws it — spelled out where it has
 * nothing to draw, noted where it is empty, and styled as the file's own
 * characters only when they are ({@link AuthoredName}). Reached from the
 * branch that has already told a declared name from an unknown one, so a name
 * reads here exactly as it does on the row and the detail.
 */
function nameOf(agentName: string): AuthoredName {
  return new AuthoredName(agentName);
}

/** The surfaces list's text: each surface by its caption, in inventory order. */
function surfacesText(definition: CustomAgentSideDefinition): string {
  return definition.definition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ');
}
</script>

<template>
  <div class="aci-custom-agent-recognition-comparison">
    <!-- The sections stand in the order a reader needs them: what each file
         declares, what each file says, then the complete files the page
         supplies, and last the recognitions — which tool reads which side is
         context for the rest rather than the subject of the comparison. -->
    <p v-if="comparison.tools.length === 0" class="aci-note">
      No compared file here carries a recognition, so there is nothing of this kind to compare here.
      Each file's own detail still shows what it declares and what it instructs.
    </p>
    <template v-else>
      <section>
        <h3 class="aci-compare-block-title">Tool recognition</h3>
        <!-- One row per recognizing tool, in the contracted tool order: each
             recognition stays distinguishable from the physical file
             (US3 scenario 2), captioned in words (AGENTS.md § User-visible
             copy policy). A recognized cell carries the name this tool
             identifies the agent by and the surfaces its admissions rest
             on — both are that one recognition's, so they are stated where
             the recognition is. `tabindex` because the box
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
                  <ToolMark decorative :tool="row.tool" />
                  {{ SUPPORTED_TOOL_TEXT[row.tool] }}
                </th>
                <td
                  v-for="(cell, side) in [row.left, row.right]"
                  :key="side"
                  :data-label="side === 0 ? 'First file' : 'Second file'"
                >
                  <template v-if="cell === null"
                    ><span class="aci-muted">{{ NOT_RECOGNIZED_TEXT }}</span></template
                  >
                  <template v-else-if="cell.agentName === null"
                    >{{ NO_NAME_TEXT
                    }}<span class="aci-muted"> ({{ surfacesText(cell) }})</span></template
                  >
                  <template v-else
                    >Named
                    <!-- The name drawn like a path, because one product derives
                         it from the file name and the others read it from a
                         declaration: both are the reader's own characters, and
                         both are shown as what they are — spelled out when a
                         name has none to draw, and noted when it is empty
                         (FR-025). -->
                    <span
                      :class="nameOf(cell.agentName).isAuthored ? 'aci-authored-text' : 'aci-muted'"
                      >{{ nameOf(cell.agentName).text }}</span
                    >
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
             are the file's one scan-time parse for the kind (FR-028), so they
             are compared once, under no tool caption (research.md § 7). A
             side without parsed declarations is stated instead of being
             diffed against (FR-028). -->
        <p
          v-if="CUSTOM_AGENT_DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] !== ''"
          class="aci-note"
        >
          First file {{ CUSTOM_AGENT_DECLARATION_SIDE_STATE_TEXT[comparison.leftDeclarations] }}
        </p>
        <p
          v-if="CUSTOM_AGENT_DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] !== ''"
          class="aci-note"
        >
          Second file {{ CUSTOM_AGENT_DECLARATION_SIDE_STATE_TEXT[comparison.rightDeclarations] }}
        </p>
        <template v-if="comparison.metadataDiff !== null">
          <!-- What the diff holds, said before it: both sides are the
               canonical serialization of the declared metadata, not the
               files' own spellings — those are under Source below
               (FR-007). YAML on both sides whichever format each file
               was written in, and the canonical key order is stated too,
               because a reader comparing against their own file would
               otherwise read the order as authored. -->
          <p class="aci-note">
            Each side is the file's declared metadata serialized as YAML with its keys in one
            canonical order, whichever format the file itself was written in; each file's own
            spelling and key order are under Source below.
          </p>
          <SourceDiff
            :original-text="comparison.metadataDiff.originalText"
            :original-path="leftPath"
            :modified-text="comparison.metadataDiff.modifiedText"
            :modified-path="rightPath"
            content-language="yaml"
            content-label="declared metadata of"
            fit-content
          />
        </template>
      </section>
      <section v-if="comparison.instructionsDiff !== null">
        <h3 class="aci-compare-block-title">Instructions</h3>
        <!-- What each file tells its agent, diffed on its own: a Codex
             agent's instructions are a TOML triple-quoted string and a
             Markdown agent's are the body under a frontmatter fence, so
             diffing the files' bytes would align quoting and delimiters
             rather than the prose. The same split, in the same order, the
             detail shows, so the two surfaces read alike (FR-007). -->
        <p class="aci-note">
          Each side is the instructions that file gives its agent, taken out of the format it was
          written in; the delimiters that held them are under Source below.
        </p>
        <SourceDiff
          :original-text="comparison.instructionsDiff.originalText"
          :original-path="leftPath"
          :modified-text="comparison.instructionsDiff.modifiedText"
          :modified-path="rightPath"
          content-language="markdown"
          content-label="instructions of"
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
