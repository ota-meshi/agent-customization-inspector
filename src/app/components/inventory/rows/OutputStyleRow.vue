<script setup lang="ts">
// An output-style row (T666). The row's unit is one style name a reader
// selects, not one file (data-model.md § Inventory unit): each recognition
// resolving that name — one definition per `(file, tool)` — is listed beneath
// it, the same shape a command row has.
//
// The name is the admitting rule's answer: Claude Code documents the file name
// as the style name unless the frontmatter sets `name`, so the row's identity
// is what the rule resolved and each file's own path is stated beside its
// definition, which is what says where a name came from.
//
// A row shows what was found and how it was classified, never what it says.
// The snapshot carries no `sourceText`, and complete authored content is
// served only by the detail route, one file at a time (FR-027): selecting the
// path here is how that file's complete inert detail opens.
//
// Nothing here is a claim that a style is applied. Which style a session uses
// turns on the `outputStyle` setting, the session's own choice, and plugin
// overrides — runtime this tool does not observe — so the row states no
// decision and no selection (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary).
//
// Nor does it state a same-name resolution the way a skill row does. Two
// project layers can define one style name and the page's rule is that the
// layer closest to the working directory wins; this product observes no
// working directory, so the definitions stand side by side under the shared
// name instead, which is what the reader can act on: their two files (FR-009).
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceRootLine from '../SourceRootLine.vue';
import { detailRoute } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import {
  fileIdentityKey,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  pathPresentationLabel,
  rendersNothingVisible,
} from '../../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import type {
  OutputStyleDefinitionDto,
  OutputStyleInventoryEntryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed output-style entry to render: one style name. */
  entry: OutputStyleInventoryEntryDto;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The files defining this name, each with the products that recognize it. One
 * item per file rather than per definition: this kind's detail is addressed by
 * the path alone, so a link per product would be the same URL repeated once
 * per recognition — the prompt, agent, skill, and MCP rows group theirs the
 * same way.
 *
 * Derived rather than computed once at setup, because the row's key is its
 * name: a filter that drops definitions leaves the key alone, so the component
 * instance is reused and a value read once would keep rendering the
 * definitions the filter removed.
 */
const fileRows = computed(() => {
  // Grouped by the file's whole identity — Source and Source-relative Path
  // (FR-030): a consented home's file and a same-path file elsewhere are two
  // files however identical their spelling. U+0000 joins the halves because
  // no Source ID contains it.
  const byFile = Map.groupBy(props.entry.definitions, (definition: OutputStyleDefinitionDto) =>
    fileIdentityKey(definition.sourceId, definition.sourceRelativePath),
  );
  return [...byFile.values()].map((definitions) => {
    const { sourceId, sourceRelativePath } = definitions[0]!;
    return {
      key: fileIdentityKey(sourceId, sourceRelativePath),
      /** The member's Source: what the family blocks and its directory line derive from. */
      sourceId: sourceId,
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
      detailRoute: detailRoute(
        'output style',
        sourceRelativePath,
        sessionSources.selectorOf(sourceId),
      ),
      /**
       * The extraction diagnostics this file's definitions reference,
       * deduplicated: one extraction per `(file, kind)` means every definition
       * of one file points at the same record (FR-028).
       */
      diagnosticIds: [...new Set(definitions.flatMap((definition) => definition.diagnosticIds))],
    };
  });
});
</script>

<template>
  <li class="aci-item">
    <!-- The row's name is inert text, never a locator. It is rendered with the
         same control-character escaping as a path (data-model.md § Inventory
         unit): a selection identity must read as what it is. -->
    <p class="aci-output-style-row__name">
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
         product. Naming a surface is never a claim that the surface applied
         the style (FR-009). -->
    <!-- One block per Source family (`SourceFamilyBlocks.vue`), each member
         rendered by this row. -->
    <SourceFamilyBlocks :members="fileRows" :member-key="(file) => file.key">
      <template #member="{ member: file }">
        <p class="aci-output-style-row__owner">
          <NuxtLink
            :to="file.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="`${file.pathAccessibleText}: ${inlinePresentationLabel(entry.name)}`"
            >{{ file.pathText }}</NuxtLink
          >
          <span
            v-for="recognition in file.recognitions"
            :key="recognition.tool"
            class="aci-output-style-row__tool aci-muted"
            >{{ recognition.toolText }}
            <span class="aci-output-style-row__surfaces">{{ recognition.surfacesText }}</span></span
          >
        </p>

        <SourceRootLine :source-id="file.sourceId" />
        <!-- The file's own extraction diagnostics — its recognitions'
             reference to the kind's one shared failure record, not the file's
             aggregate, so a row reports its own kind's failure and never every
             problem its file carries (FR-028). -->
        <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
      </template>
    </SourceFamilyBlocks>
  </li>
</template>

<style scoped>
/* The name leads the row, as a command row's does: it is what a reader looks
   for, and the files that resolve it follow underneath. */
.aci-output-style-row__name {
  font-weight: 600;
  margin: 0;
}

.aci-output-style-row__owner {
  margin: 0;
}

/* Each recognizing product trails the file on the same line, set apart by a
   separator, matching how an instruction row states its recognitions. */
.aci-output-style-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-output-style-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

/* The surfaces qualify their own product within the same span: the product
   alone does not say where it reads the file from once two surfaces document
   different lookup bases. */
.aci-output-style-row__surfaces {
  font-size: 0.85em;
}

.aci-output-style-row__surfaces::before {
  content: '(';
}

.aci-output-style-row__surfaces::after {
  content: ')';
}
</style>
