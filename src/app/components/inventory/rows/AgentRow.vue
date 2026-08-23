<script setup lang="ts">
// One row of the custom-agent inventory (T515). The kind's row unit is one
// agent name (data-model.md § Inventory unit), so the row is headed by that
// name and lists, under it, every file a recognizing tool defines the agent
// in — one line per file, because one physical file is one link however many
// products recognize it, with each recognizing product and its surfaces stated
// beside the link. A second file resolving to the same name joins this row
// rather than starting another.
//
// Which fact names a definition is its admitting product's: Codex and Claude
// Code identify an agent by its declared `name`, the Copilot surfaces by the
// configuration file's own name. So one `.claude/agents/*.md` both recognize
// defines on two rows, and only a declared-name product's definition can reach
// the row whose name is null.
//
// That row closes the list: the files publishing no name. Each such file
// states its own fact — declarations that could not be read leave the name
// unknown rather than absent (FR-028), while a file declaring no `name` is a
// finding about the file, since those products make the declared name the
// source of truth and the filename a convention. No path fallback stands in
// for either: naming such a row after a filename would report an agent name
// the product does not have.
//
// A row shows what was declared and where — never what the declarations say.
// The declared values are served by the file's own detail, one file at a time
// (FR-027). Nothing here is a claim that a session spawned, selected, or
// inherited anything: an admission is not an activation (FR-009).
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import { detailRoute } from '../../detail-route';
import { customAgentComparisonRouteFor } from '../../../composables/custom-agent-comparison';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import {
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
} from '../../../../shared/entities';
import type {
  AgentInventoryEntryDto,
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed agent entry to render: one resolved name, or the null row. */
  entry: AgentInventoryEntryDto;
  /**
   * Every published file by its Source-relative Path — the file's identity
   * (FR-030). The row states each definition's file by path and repeats none
   * of the file's own facts, so this one lookup resolves the files it names.
   */
  filesByPath: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The row's heading text: the resolved name through the shared label rule, so
 * a name built only from invisible code points still identifies its row
 * ({@link pathPresentationLabel}). Null for the no-name row, whose heading is
 * fixed copy. The empty name gets its own note the way an MCP row's does,
 * because the label rule has no characters to spell out and the row would
 * otherwise be headed by nothing.
 */
const nameText = computed(() =>
  props.entry.name === null
    ? null
    : props.entry.name === ''
      ? '(empty name)'
      : pathPresentationLabel(props.entry.name),
);

/**
 * Whether {@link nameText} is the authored spelling rather than this product's
 * note, which decides the heading's authored-text styling.
 */
const nameIsAuthored = computed(() => props.entry.name !== null && props.entry.name !== '');

/**
 * The row's name as accessible-name text: the single-line label rule, because
 * an accessible name collapses whitespace and would read two invisibly
 * different names as one ({@link inlinePresentationLabel}); the no-name and
 * empty-name cases keep the same copy the visible heading shows.
 */
const nameAccessibleText = computed(() =>
  props.entry.name === null
    ? null
    : props.entry.name === ''
      ? '(empty name)'
      : inlinePresentationLabel(props.entry.name),
);

/**
 * Each file as the line the row renders for it, holding every recognition that
 * resolves this name in that file — one physical file is one line and one link
 * however many products recognize it, because two links with one accessible
 * name and one destination would be the same control twice (WCAG 2.4.6). Each
 * recognizing product is stated beside the link with the surfaces its
 * admission rests on, exactly as an instruction row states its recognitions.
 * The no-name row's per-file state sentence and the file's own diagnostics —
 * where the extraction-failure record lives (FR-028) — are the file's, shared
 * by its recognitions, because the extraction ran once per file.
 *
 * Derived rather than computed once at setup, because the row's key is its
 * name: a tool filter that drops definitions leaves the key alone, so the
 * component instance is reused and a value read once would keep rendering the
 * definitions the filter removed.
 */
/**
 * The comparison this row links to — the first two readable files that
 * resolve this name — or null when the name has fewer than two, where a link
 * would open a comparison with nothing to pair. The paths are deduplicated
 * because a row lists one definition per `(file, tool)`, so a
 * `.claude/agents/*.md` two products read appears twice while being one file.
 * The compare route's own pickers take over from there: they hold this row's
 * files, so a reader steps to another pair on the comparison itself rather
 * than composing one here (T575).
 *
 * The no-name row links none, the way the MCP no-name row does: its files
 * share the absence of a name rather than an identity, so a pair drawn from
 * it would assert a relationship the inventory does not have (FR-011,
 * data-model.md § Inventory unit).
 */
const compareRoute = computed(() => {
  const name = props.entry.name;
  if (name === null) {
    return null;
  }
  const readable = new Set<string>();
  for (const definition of props.entry.definitions) {
    const published = props.filesByPath.get(definition.sourceRelativePath);
    if (published !== undefined && isReadableFile(published)) {
      readable.add(definition.sourceRelativePath);
    }
  }
  const [first, second] = readable;
  return first !== undefined && second !== undefined
    ? customAgentComparisonRouteFor(name, first, second)
    : null;
});

const fileRows = computed(() => {
  const byFile = Map.groupBy(
    props.entry.definitions,
    (definition) => definition.sourceRelativePath,
  );
  return [...byFile.entries()].map(([sourceRelativePath, definitions]) => ({
    key: sourceRelativePath,
    pathText: pathPresentationLabel(sourceRelativePath),
    // The accessible name goes through the single-line label rule instead: an
    // accessible name is flattened, so authored whitespace that the drawn
    // label legitimately renders would collapse and two different files could
    // announce identically (FR-025, {@link inlinePresentationLabel}).
    pathAccessibleText: inlinePresentationLabel(sourceRelativePath),
    recognitions: definitions.map((definition) => ({
      tool: definition.tool,
      toolText: SUPPORTED_TOOL_TEXT[definition.tool],
      surfacesText: definition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', '),
    })),
    detailRoute: detailRoute('agent', sourceRelativePath),
    // The no-name row's members tell their two states apart (FR-028): a failed
    // extraction leaves the name unknown, a parsed file with no usable `name`
    // declares none. Null on named rows, whose definitions are always parsed;
    // the first definition answers for the file because the extraction ran
    // once per file.
    stateText:
      props.entry.name !== null
        ? null
        : definitions[0]?.parseStatus === 'failed'
          ? 'The declarations in this file could not be read.'
          : 'This file declares no agent name.',
    diagnosticIds: props.filesByPath.get(sourceRelativePath)?.diagnosticIds ?? [],
  }));
});
</script>

<template>
  <li class="aci-item">
    <!-- The agent name heads the row — the row's own identity, in the same
         spelling the fact naming it was written in (FR-007). The no-name row
         gets plain copy that says the name is not known rather than not
         declared, because it also holds a file whose declarations could not be
         read (FR-028). -->
    <p
      v-if="nameText !== null"
      class="aci-agent-row__name"
      :class="nameIsAuthored ? 'aci-authored-text' : 'aci-muted'"
    >
      {{ nameText }}
    </p>
    <p v-else class="aci-agent-row__name">No known agent name</p>

    <!-- The files defining this name, each linking to its own detail: the
         declarations the file wrote, beside its complete authored source. The
         path is the link because it is what distinguishes the definitions of
         one name, and the accessible name adds the row's subject so links of
         several rows never announce identically (WCAG 2.4.6; label-in-name
         keeps the visible path as the prefix). Naming a surface never claims
         it spawned the agent (FR-009). -->
    <ul class="aci-agent-row__definitions" role="list">
      <li v-for="file in fileRows" :key="file.key">
        <p class="aci-agent-row__owner">
          <NuxtLink
            :to="file.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="
              nameAccessibleText === null
                ? file.pathAccessibleText
                : `${file.pathAccessibleText}: ${nameAccessibleText}`
            "
            >{{ file.pathText }}</NuxtLink
          >
          <span
            v-for="recognition in file.recognitions"
            :key="recognition.tool"
            class="aci-agent-row__tool aci-muted"
            >{{ recognition.toolText }}
            <span class="aci-agent-row__surfaces">{{ recognition.surfacesText }}</span></span
          >
        </p>
        <p v-if="file.stateText !== null" class="aci-muted">{{ file.stateText }}</p>
        <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>

    <!-- The comparison entry for this name (FR-011): present exactly when two
         of the name's files have readable source to stand opposite each
         other — two files declaring one agent name, above all. The comparison
         surface's own pickers take over from there. The accessible name
         carries the agent name, because a reader walking the page's links
         hears each one out of its visual context and every row offers the
         same wording (WCAG 2.4.4) — with the visible label kept inside it, so
         a reader speaking what they see reaches the control (WCAG 2.5.3). -->
    <p v-if="compareRoute !== null" class="aci-agent-row__compare">
      <NuxtLink
        :to="compareRoute"
        :aria-label="`Compare this name's files: ${nameAccessibleText ?? ''}`"
        >Compare this name's files</NuxtLink
      >
    </p>
  </li>
</template>

<style scoped>
.aci-agent-row__name {
  margin: 0;
  font-weight: 600;
}

/* The definitions of the name, set under it by an indent and a rule, matching
   how a skill row groups its definitions under the resolved name. */
.aci-agent-row__definitions {
  list-style: none;
  margin: 0.2rem 0 0;
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}

.aci-agent-row__definitions > li + li {
  margin-block-start: 0.4rem;
}

.aci-agent-row__owner {
  margin: 0;
}

/* Each recognizing product trails the file on the same line, set apart by a
   separator, matching how an instruction row's surfaces trail its product. */
.aci-agent-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-agent-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

/* The surfaces qualify their own product within the same span: the product
   alone does not say where it reads the file from once two surfaces document
   different lookup bases. */
.aci-agent-row__surfaces {
  font-size: 0.85em;
}

.aci-agent-row__surfaces::before {
  content: '(';
}

.aci-agent-row__surfaces::after {
  content: ')';
}

/* The comparison entry sits under the definitions it draws its pair from, as
   a skill row's and a prompt row's do. */
.aci-agent-row__compare {
  margin: 0.3rem 0 0;
}
</style>
