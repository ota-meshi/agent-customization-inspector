<script setup lang="ts">
// A command row (T448). The row's unit is one name a reader invokes, not one
// file (data-model.md § Inventory unit): each recognition resolving that name —
// one definition per `(file, tool)` — is listed beneath it, the same shape a
// skill row has.
//
// The name is the admitting rule's answer, and the two locations of this kind
// answer differently. A command file's name is never authored: both products
// ignore a `name` key in one and derive the command from the path — the file
// name without its extension, prefixed by the subdirectories between it and
// the command directory. A VS Code prompt file names itself, with its own file
// name standing in when it declares none. Either way the row's identity is
// what the rule answered, and the file's own path is stated beside each
// definition, so which file a name came from is never a guess.
//
// A row shows what was found and how it was classified, never what it says.
// The snapshot carries no `sourceText`, and complete authored content is
// served only by the detail route, one file at a time (FR-027): selecting a
// product here is how that file's complete inert detail opens.
//
// Nothing here is a claim that a command is reachable. A same-name skill
// outranks one, and which layers a session loads turns on runtime this tool
// does not observe, so the row states no decision, no precedence, and no
// invocation (FR-009; contracts/inspection-path-allowlist.md
// § existence-versus-activation vocabulary).
//
// Nor does it state a same-name resolution the way a skill row does. Two
// prompt files can reach one name — a declared `name` repeated, or one that
// matches another file's fallback — and VS Code documents no outcome for that,
// so a statement here would answer a question no page answers. The definitions
// stand side by side under the shared name instead, which is what the reader
// can act on: their two files (FR-009).
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import { detailRoute } from '../../detail-route';
import { promptComparisonRouteFor } from '../../../composables/prompt-comparison';
import {
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
  rendersNothingVisible,
} from '../../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import type {
  CustomizationFileSummaryDto,
  PromptDefinitionDto,
  PromptInventoryEntryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed command entry to render: one name a reader invokes. */
  entry: PromptInventoryEntryDto;
  /**
   * The generation's files by Source-relative Path, for the read outcome
   * this row's comparison entry depends on: a file with no readable source
   * is not comparison-eligible (FR-025).
   */
  filesByPath: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /** The generation's diagnostics, resolved per definition by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The comparison this row links to — the first two readable files that
 * resolve this name — or null when the name has fewer than two, where a link
 * would open a comparison with nothing to pair. The paths are deduplicated
 * because a row lists one definition per `(file, tool)`, so a root command
 * file two products read appears twice while being one file. The compare
 * route's own pickers take over from there: they hold this row's files, so a
 * reader steps to another pair on the comparison itself rather than
 * composing one here (T505).
 */
const compareRoute = computed(() => {
  const readable = new Set<string>();
  for (const definition of props.entry.definitions) {
    const published = props.filesByPath.get(definition.sourceRelativePath);
    if (published !== undefined && isReadableFile(published)) {
      readable.add(definition.sourceRelativePath);
    }
  }
  const [first, second] = readable;
  return first !== undefined && second !== undefined
    ? promptComparisonRouteFor(first, second)
    : null;
});

/**
 * The files defining this name, each with the products that recognize it. One
 * item per file rather than per definition: this kind's detail is addressed by
 * the path alone, so a link per product would be the same URL repeated once
 * per recognition — the agent, skill, and MCP rows group theirs the same way.
 *
 * Derived rather than computed once at setup, because the row's key is its
 * name: a filter that drops definitions leaves the key alone, so the component
 * instance is reused and a value read once would keep rendering the
 * definitions the filter removed.
 */
const fileRows = computed(() => {
  const byFile = Map.groupBy(
    props.entry.definitions,
    (definition: PromptDefinitionDto) => definition.sourceRelativePath,
  );
  return [...byFile.entries()].map(([sourceRelativePath, definitions]) => ({
    key: sourceRelativePath,
    /**
     * The file's path through the shared label rule rather than plain
     * escaping ({@link pathPresentationLabel}): a name built only from
     * whitespace or default-ignorable code points draws nothing, and this
     * line is what says which file the definitions are of.
     */
    pathText: pathPresentationLabel(sourceRelativePath),
    /**
     * The accessible name of the link is the path, which is what the link
     * shows. It goes through the single-line label rule instead: an
     * accessible name is flattened, so authored whitespace the drawn label
     * legitimately renders would collapse and two different files could
     * announce identically (WCAG 2.4.4, FR-025).
     */
    pathAccessibleText: inlinePresentationLabel(sourceRelativePath),
    recognitions: definitions.map((definition) => ({
      tool: definition.tool,
      toolText: SUPPORTED_TOOL_TEXT[definition.tool],
      surfacesText: definition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', '),
    })),
    /** The file's own detail route; the path is the whole route identity (FR-030). */
    detailRoute: detailRoute('prompt/command', sourceRelativePath),
    /**
     * The extraction diagnostics this file's definitions reference,
     * deduplicated: one extraction per `(file, kind)` means every definition
     * of one file points at the same record (FR-028).
     */
    diagnosticIds: [...new Set(definitions.flatMap((definition) => definition.diagnosticIds))],
  }));
});
</script>

<template>
  <li class="aci-item">
    <!-- The row's name is inert text, never a locator. A namespaced name's
         prefix is path segments, so it is rendered with the same
         control-character escaping as a path (data-model.md § Inventory
         unit): a lookup and selection identity must read as what it is. -->
    <p class="aci-prompt-row__name">
      <!-- A name that draws nothing — a file named only from whitespace or
           default-ignorable code points — gets its own label rather than a
           blank line: the name is kept exactly, and saying it is invisible is
           not the same as showing nothing (FR-025). -->
      <template v-if="rendersNothingVisible(entry.name)"
        ><span class="aci-authored-text aci-authored-atomic">{{
          escapeControlCharacters(entry.name)
        }}</span>
        <span class="aci-muted">(name with no visible characters)</span></template
      >
      <template v-else
        ><span class="aci-authored-text">{{ escapeControlCharacters(entry.name) }}</span></template
      >
    </p>

    <!-- One item per file, each linking to that file's own detail with the
         products that recognized it beside the path, and the surfaces of the
         documented behaviors their admitting rules rest on beside each
         product. Naming a surface is never a claim that the surface loaded the
         file (FR-009). -->
    <ul class="aci-prompt-row__definitions" role="list">
      <li v-for="file in fileRows" :key="file.key">
        <p class="aci-prompt-row__owner">
          <NuxtLink
            :to="file.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="file.pathAccessibleText"
            >{{ file.pathText }}</NuxtLink
          >
          <span
            v-for="recognition in file.recognitions"
            :key="recognition.tool"
            class="aci-prompt-row__tool aci-muted"
            >{{ recognition.toolText }}
            <span class="aci-prompt-row__surfaces">{{ recognition.surfacesText }}</span></span
          >
        </p>
        <!-- The file's own extraction diagnostics — its recognitions'
             reference to the kind's one shared failure record, not the file's
             aggregate, so a row reports its own kind's failure and never every
             problem its file carries (FR-028). -->
        <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>

    <!-- The comparison entry for this name (FR-011): present exactly when
         two of the name's files have readable source to stand opposite each
         other — a command file and the prompt file that declares the same
         name, above all. The comparison surface's own pickers take over from
         there. The accessible name carries the invocation name, because a
         reader walking the page's links hears each one out of its visual
         context and every row offers the same wording (WCAG 2.4.4) — with the
         visible label kept inside it, so a reader speaking what they see
         reaches the control (WCAG 2.5.3). -->
    <p v-if="compareRoute !== null" class="aci-prompt-row__compare">
      <NuxtLink
        :to="compareRoute"
        :aria-label="`Compare this name's files: ${inlinePresentationLabel(entry.name)}`"
        >Compare this name's files</NuxtLink
      >
    </p>
  </li>
</template>

<style scoped>
/* The name leads the row, as a skill row's does: it is what a reader looks
   for, and the files that resolve it follow underneath. */
.aci-prompt-row__name {
  font-weight: 600;
  margin: 0;
}

/* The definitions of the name, set under it by an indent and a rule, matching
   how a skill row groups its own. */
.aci-prompt-row__definitions {
  list-style: none;
  margin: 0.2rem 0 0;
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}

.aci-prompt-row__definitions > li + li {
  margin-block-start: 0.35rem;
}

.aci-prompt-row__definitions p {
  margin: 0;
}

/* The path and the products that recognize it on one line, the way an MCP or
   agent row lays out a carrier and its recognitions: the path is the subject
   and the products qualify it. */
.aci-prompt-row__owner {
  margin: 0;
}

.aci-prompt-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-prompt-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

.aci-prompt-row__surfaces {
  font-size: 0.85em;
}

.aci-prompt-row__surfaces::before {
  content: '(';
}

.aci-prompt-row__surfaces::after {
  content: ')';
}

/* The comparison entry closes the row, under the files it compares. */
.aci-prompt-row__compare {
  margin: 0.35rem 0 0;
}
</style>
