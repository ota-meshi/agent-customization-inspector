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
import RecognitionMarks from '../RecognitionMarks.vue';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
import {
  familyComparisonPairsOf,
  detailRoute,
  originRowNameQuery,
  type ComparisonSide,
} from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { customAgentComparisonRouteFor } from '../../../composables/custom-agent-comparison';
import {
  fileIdentityKey,
  accessiblePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
} from '../../../../shared/entities';
import type {
  AgentInventoryEntryDto,
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
  SourceKind,
} from '../../../../shared/api-types';
import type { NarrowedInventoryRow } from '../../../composables/filters';
import { AuthoredName } from '../../authored-name';

const props = defineProps<{
  /** The committed agent entry to render: one resolved name, or the null row. */
  entry: NarrowedInventoryRow<AgentInventoryEntryDto>;
  /**
   * Every published file by its Source and then its Source-relative Path —
   * both halves of the file's identity (FR-030). The row states each
   * definition's file by its own `sourceId` and path and repeats none of the
   * file's own facts, so this lookup resolves the files it names.
   */
  filesBySource: ReadonlyMap<string, ReadonlyMap<string, CustomizationFileSummaryDto>>;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The declared name this row is headed by, as every surface of the row needs
 * it — what is drawn, whether those are the file's characters, and what the
 * links announce ({@link AuthoredName}). Null for a row whose files declare no name, whose heading is fixed copy.
 */
const name = computed(() =>
  props.entry.name === null ? null : new AuthoredName(props.entry.name),
);

/**
 * The comparable identities of this row as route sides, in the row's own
 * order — the set no filter narrows
 * ({@link NarrowedInventoryRow.rowFileIdentities}).
 */
const comparableSides = computed<readonly ComparisonSide[]>(() => {
  // The row's own file identities — the set no filter narrows
  // ({@link NarrowedInventoryRow.rowFileIdentities}), already one entry per
  // file however many products read it, with a same-path copy in another
  // Source a distinct one (FR-030).
  const readable: ComparisonSide[] = [];
  for (const identity of props.entry.rowFileIdentities) {
    const published = props.filesBySource.get(identity.sourceId)?.get(identity.sourceRelativePath);
    if (published !== undefined && isReadableFile(published)) {
      readable.push({
        source: sessionSources.selectorOf(identity.sourceId),
        sourceRelativePath: identity.sourceRelativePath,
      });
    }
  }
  return readable;
});

/**
 * Each family block's comparison entry — that family's first two comparable
 * identities, for the blocks that hold a pair (FR-011): a block's comparison
 * is that family's, and a pair never spans two families
 * (contracts/http-api.md § Host requirements #5), so a row whose blocks each
 * hold one member offers no entry — exactly as an instruction range's blocks
 * do. The comparison surface's own pickers take over from there
 * (`detail-route.ts` § familyComparisonPairsOf).
 */
/**
 * The comparison entry the row's own name line carries: the one family's
 * route, where the session holds one Source and so no family line exists to
 * close (`SourceFamilyBlocks.vue`).
 */
const headCompareRoute = computed(() => {
  const routes = [...blockCompareRoutes.value.values()];
  // Exactly when the row draws no family line to close: the entry lives on one
  // of the two lines and never on neither, so both read the one rule
  // (`session-sources.ts` § familyLineShownFor).
  const headed = sessionSources.familyLineShownFor(fileRows.value);
  return headed || routes.length !== 1 ? null : routes[0]!;
});

const blockCompareRoutes = computed(() => {
  const routes = new Map<SourceKind, ReturnType<typeof customAgentComparisonRouteFor>>();
  const name = props.entry.name;
  if (name === null) {
    // The closing no-name row: its files declare no shared name to pair.
    return routes;
  }
  for (const [kind, [first, second]] of familyComparisonPairsOf(comparableSides.value)) {
    routes.set(kind, customAgentComparisonRouteFor(kind, name, first, second));
  }
  return routes;
});

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
const fileRows = computed(() => {
  // Grouped by the file's whole identity — Source and Source-relative Path
  // (FR-030): a consented home's file and a same-path file elsewhere are two
  // files however identical their spelling. U+0000 joins the halves because
  // no Source ID contains it.
  const byFile = Map.groupBy(props.entry.definitions, (definition) =>
    fileIdentityKey(definition.sourceId, definition.sourceRelativePath),
  );
  return [...byFile.values()].map((definitions) => {
    const { sourceId, sourceRelativePath } = definitions[0]!;
    return {
      key: fileIdentityKey(sourceId, sourceRelativePath),
      /** The member's Source: what the family blocks and its directory line derive from. */
      sourceId: sourceId,
      pathText: pathPresentationLabel(sourceRelativePath),
      // The accessible name goes through the single-line label rule instead: an
      // accessible name is flattened, so authored whitespace that the drawn
      // label legitimately renders would collapse and two different files could
      // announce identically (FR-025, {@link accessiblePresentationLabel}).
      pathAccessibleText: accessiblePresentationLabel(sourceRelativePath),
      recognitions: definitions,
      /**
       * The file's own detail route, with the row it was followed from: the
       * page is the file's, addressed by `(source, path)`, and the row name
       * beside it is what the moves to the previous and next row step from
       * (`detail-route.ts` § originRowNameQuery). One file can be listed under
       * two names, and without it those moves stepped whichever of its rows
       * the snapshot listed first.
       */
      detailRoute: {
        path: detailRoute('agent', sourceRelativePath, sessionSources.selectorOf(sourceId)),
        query: originRowNameQuery(props.entry.name),
      },
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
      diagnosticIds:
        props.filesBySource.get(sourceId)?.get(sourceRelativePath)?.diagnosticIds ?? [],
    };
  });
});
</script>

<template>
  <li class="aci-item">
    <!-- The agent name heads the row — the row's own identity, in the same
         spelling the fact naming it was written in (FR-007). The no-name row
         gets plain copy that says the name is not known rather than not
         declared, because it also holds a file whose declarations could not be
         read (FR-028). -->
    <p class="aci-row-head">
      <span
        class="aci-row-head__name"
        :class="name === null ? '' : name.isAuthored ? 'aci-authored-text' : 'aci-muted'"
        >{{ name?.text ?? 'No known agent name' }}</span
      >
      <span class="aci-row-head__count"
        >{{ fileRows.length }} {{ fileRows.length === 1 ? 'file' : 'files' }}</span
      >
      <!-- The comparison entry, where this row has one family and so no family
           line of its own to close (`SourceFamilyBlocks.vue`). -->
      <span v-if="headCompareRoute" class="aci-row-head__end">
        <NuxtLink
          :to="headCompareRoute"
          :aria-label="`Compare this name's files: ${name?.accessibleText ?? ''}`"
          >Compare</NuxtLink
        >
      </span>
    </p>

    <!-- The files defining this name, each linking to its own detail: the
         declarations the file wrote, beside its complete authored source. The
         path is the link because it is what distinguishes the definitions of
         one name, and the accessible name adds the row's subject so links of
         several rows never announce identically (WCAG 2.4.6; label-in-name
         keeps the visible path as the prefix). Naming a surface never claims
         it spawned the agent (FR-009). -->
    <!-- One block per Source family (`SourceFamilyBlocks.vue`), each member
         rendered by this row. -->
    <SourceFamilyBlocks :members="fileRows" :member-key="(file) => file.key">
      <template #member="{ member: file }">
        <div class="aci-row-file">
          <span class="aci-row-file__path">
            <SourceHomeBadge :source-id="file.sourceId" />
            <NuxtLink
              :to="file.detailRoute"
              class="aci-path aci-authored-text"
              :aria-label="
                sessionSources.qualifiedLinkName(
                  name === null
                    ? file.pathAccessibleText
                    : `${file.pathAccessibleText}: ${name.accessibleText}`,
                  file.sourceId,
                )
              "
              >{{ file.pathText }}</NuxtLink
            >
            <span v-if="file.stateText !== null" class="aci-muted">{{ file.stateText }}</span>
            <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
          </span>
          <RecognitionMarks :recognitions="file.recognitions" />
          <span class="aci-row-file__end" />
        </div>
      </template>

      <!-- The block's own comparison entry (FR-011): the family is where a
           pair of this row's members lives, so each block that holds two
           comparable identities offers its own — the instruction blocks'
           shape. The accessible name carries the row's identity always, and
           the family where two blocks each offer one (WCAG 2.4.6). -->
      <template #entry="{ block }">
        <NuxtLink
          v-if="blockCompareRoutes.get(block.kind)"
          :to="blockCompareRoutes.get(block.kind)!"
          :aria-label="`Compare this name's files: ${name?.accessibleText ?? ''}${
            block.familyText !== null ? ` (${block.familyText})` : ''
          }`"
          >Compare</NuxtLink
        >
      </template>
    </SourceFamilyBlocks>
  </li>
</template>
