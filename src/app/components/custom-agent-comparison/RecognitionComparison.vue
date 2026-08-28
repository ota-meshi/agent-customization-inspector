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
import SourceDiff from './SourceDiff.vue';
import {
  CUSTOMIZATION_KIND_TEXT,
  SUPPORTED_TOOL_TEXT,
  pathPresentationLabel,
} from '../../../shared/entities';
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
 * What a cell writes for an authored empty name, which has no characters for
 * the label rule to draw and would otherwise leave the cell ending after the
 * word. Reachable here: two files both declaring `name: ""` resolve one row,
 * and that row offers its comparison like any other.
 */
const EMPTY_NAME_TEXT = '(empty name)';

/**
 * One cell's name as it is drawn: the shared label rule, which spells out a
 * name built only from whitespace or invisible code points, and the
 * empty-name note beside it — the two rules the inventory row and the detail
 * page draw a name by, so one name reads identically wherever it appears
 * (`AgentRow.vue`, `pages/agents/[source]/[...path].vue`).
 */
function nameText(definition: CustomAgentSideDefinition): string {
  const name = definition.agentName ?? '';
  return name === '' ? EMPTY_NAME_TEXT : pathPresentationLabel(name);
}

/**
 * Whether {@link nameText} is the reader's own characters rather than this
 * product's note, which decides the authored-text styling — the same
 * distinction the row draws. Compared against the two substitutions rather
 * than tested again, so the two cannot answer differently.
 */
function nameIsAuthored(definition: CustomAgentSideDefinition): boolean {
  return (
    definition.agentName !== null &&
    definition.agentName !== '' &&
    pathPresentationLabel(definition.agentName) === definition.agentName
  );
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
        <h3>Declared metadata</h3>
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
        <h3>Instructions</h3>
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
    <section v-if="comparison.tools.length > 0">
      <h3>Tool recognition</h3>
      <!-- One row per recognizing tool, in the contracted tool order: each
           recognition stays distinguishable from the physical file
           (US3 scenario 2), captioned in words (AGENTS.md § User-visible
           copy policy). A recognized cell carries the name this tool
           identifies the agent by and the surfaces its admissions rest
           on — both are that one recognition's, so they are stated where
           the recognition is. `tabindex` because the table is its own
           horizontal scroll container on a wide viewport (WCAG 2.1.1). -->
      <table class="aci-custom-agent-recognition-comparison__table" tabindex="0">
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
              <template v-else-if="cell.agentName === null"
                >{{ NO_NAME_TEXT
                }}<span class="aci-muted"> — surfaces: {{ surfacesText(cell) }}</span></template
              >
              <template v-else
                >Named
                <!-- The name drawn like a path, because one product derives
                     it from the file name and the others read it from a
                     declaration: both are the reader's own characters, and
                     both are shown as what they are — spelled out when a
                     name has none to draw, and noted when it is empty
                     (FR-025). -->
                <span :class="nameIsAuthored(cell) ? 'aci-authored-text' : 'aci-muted'">{{
                  nameText(cell)
                }}</span>
                <span class="aci-muted"> — surfaces: {{ surfacesText(cell) }}</span></template
              >
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
/* The tables scroll inside themselves when a cell is wide, so the page never
   scrolls sideways (WCAG 1.4.10). */
.aci-custom-agent-recognition-comparison__table {
  border-collapse: collapse;
  display: block;
  max-inline-size: 100%;
  overflow-x: auto;
}

.aci-custom-agent-recognition-comparison__table th,
.aci-custom-agent-recognition-comparison__table td {
  border: 1px solid var(--aci-border);
  padding: 0.3rem 0.5rem;
  text-align: start;
  vertical-align: top;
}

/* Authored values keep their spelling but wrap rather than widening the row
   past the viewport; a value with no break opportunities still scrolls inside
   the table's own box. */
.aci-custom-agent-recognition-comparison__table td {
  overflow-wrap: anywhere;
}

/* On a narrow viewport the columns reflow into one stacked block per row
   instead of scrolling in two dimensions: the contract allows two-dimensional
   scrolling only for essential source-code regions
   (accessibility-acceptance.md § WCAG 1.4.10), and these rows are data, not
   source. Each cell repeats its column caption from `data-label`, so the
   association the hidden header row carried stays visible in reading order. */
@media (width < 52rem) {
  .aci-custom-agent-recognition-comparison__table thead {
    display: none;
  }

  .aci-custom-agent-recognition-comparison__table tbody,
  .aci-custom-agent-recognition-comparison__table tr,
  .aci-custom-agent-recognition-comparison__table th[scope='row'],
  .aci-custom-agent-recognition-comparison__table td {
    display: block;
  }

  .aci-custom-agent-recognition-comparison__table tr {
    border: 1px solid var(--aci-border);
    border-radius: 4px;
    margin-block-end: 0.5rem;
  }

  .aci-custom-agent-recognition-comparison__table th,
  .aci-custom-agent-recognition-comparison__table td {
    border: 0;
    border-block-start: 1px solid var(--aci-border);
  }

  .aci-custom-agent-recognition-comparison__table tr > :first-child {
    border-block-start: 0;
  }

  .aci-custom-agent-recognition-comparison__table td::before {
    content: attr(data-label);
    display: block;
    font-weight: 600;
  }
}
</style>
