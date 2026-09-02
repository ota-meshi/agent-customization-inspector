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
import { promptComparisonRouteFor } from '../../../composables/prompt-comparison';
import {
  fileIdentityKey,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
  accessiblePresentationLabel,
} from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  PromptDefinitionDto,
  PromptInventoryEntryDto,
  SerializedDiagnostic,
  SourceKind,
} from '../../../../shared/api-types';
import type { NarrowedInventoryRow } from '../../../composables/filters';
import { AuthoredName } from '../../authored-name';

/**
 * The row's declared name, as every surface of the row needs it: the reader's
 * own characters, with this product's note beside them where they draw nothing
 * ({@link AuthoredName}). Never empty — the name comes from a file or
 * directory — so the substituting spelling is not the one this kind uses.
 */
const name = computed(() => new AuthoredName(props.entry.name));

const props = defineProps<{
  /** The committed command entry to render: one name a reader invokes. */
  entry: NarrowedInventoryRow<PromptInventoryEntryDto>;
  /**
   * Every published file by its Source and then its Source-relative Path —
   * both halves of the file's identity (FR-030) — for the read outcome this
   * row's comparison entry depends on: a file with no readable source is
   * not comparison-eligible (FR-025).
   */
  filesBySource: ReadonlyMap<string, ReadonlyMap<string, CustomizationFileSummaryDto>>;
  /** The generation's diagnostics, resolved per definition by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The comparable identities of this row as route sides, in the row's own
 * order — the set no filter narrows
 * ({@link NarrowedInventoryRow.rowFileIdentities}).
 */
const comparableSides = computed<readonly ComparisonSide[]>(() => {
  // The row's own file identities — the set no filter narrows
  // ({@link NarrowedInventoryRow.rowFileIdentities}), already one entry per
  // file however many products invoke it (FR-030).
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
  const headed = sessionSources.familyLineShownFor(fileRows.value, [
    ...blockCompareRoutes.value.keys(),
  ]);
  return headed || routes.length !== 1 ? null : routes[0]!;
});

const blockCompareRoutes = computed(() => {
  const routes = new Map<SourceKind, ReturnType<typeof promptComparisonRouteFor>>();
  for (const [kind, [first, second]] of familyComparisonPairsOf(comparableSides.value)) {
    routes.set(kind, promptComparisonRouteFor(kind, first, second));
  }
  return routes;
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
  // Grouped by the file's whole identity — Source and Source-relative Path
  // (FR-030): a consented home's file and a same-path file elsewhere are two
  // files however identical their spelling. U+0000 joins the halves because
  // no Source ID contains it.
  const byFile = Map.groupBy(props.entry.definitions, (definition: PromptDefinitionDto) =>
    fileIdentityKey(definition.sourceId, definition.sourceRelativePath),
  );
  return [...byFile.values()].map((definitions) => {
    const { sourceId, sourceRelativePath } = definitions[0]!;
    return {
      key: fileIdentityKey(sourceId, sourceRelativePath),
      /** The file's Source: what the family blocks and its directory line derive from. */
      sourceId,
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
        path: detailRoute(
          'prompt/command',
          sourceRelativePath,
          sessionSources.selectorOf(sourceId),
        ),
        query: originRowNameQuery(props.entry.name),
      },
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
    <!-- The row's name is inert text, never a locator. A namespaced name's
         prefix is path segments, so it is rendered with the same
         control-character escaping as a path (data-model.md § Inventory
         unit): a lookup and selection identity must read as what it is. -->
    <p class="aci-row-head">
      <!-- A name that draws nothing — whitespace, or code points such as
           U+200B that are not whitespace and survive a trim — is spelled out
           in full rather than left blank, so two such names stay two rows on
           the screen ({@link AuthoredName}). The spelled form is this
           product's characters, so it takes the muted treatment the other
           rows give theirs rather than the authored one. -->
      <span
        class="aci-row-head__name"
        :class="name.isAuthored ? 'aci-authored-text' : 'aci-muted'"
        >{{ name.text }}</span
      >
      <span class="aci-row-head__count"
        >{{ fileRows.length }} {{ fileRows.length === 1 ? 'file' : 'files' }}</span
      >
      <!-- The comparison entry, where this row has one family and so no family
           line of its own to close (`SourceFamilyBlocks.vue`). -->
      <span v-if="headCompareRoute" class="aci-row-head__end">
        <NuxtLink
          :to="headCompareRoute"
          :aria-label="`Compare this name's files: ${inlinePresentationLabel(entry.name)}`"
          >Compare</NuxtLink
        >
      </span>
    </p>

    <!-- One block per Source family that resolves the name
         (`SourceFamilyBlocks.vue`). Within a block, one item per file, each
         linking to that file's own detail with the products that recognized
         it beside the path, and the surfaces of the documented behaviors
         their admitting rules rest on beside each product. Naming a surface
         is never a claim that the surface loaded the file (FR-009). -->
    <SourceFamilyBlocks
      :members="fileRows"
      :member-key="(file) => file.key"
      :entry-kinds="[...blockCompareRoutes.keys()]"
    >
      <template #member="{ member: file }">
        <div class="aci-row-file">
          <span class="aci-row-file__path">
            <SourceHomeBadge :source-id="file.sourceId" />
            <NuxtLink
              :to="file.detailRoute"
              class="aci-path aci-authored-text"
              :aria-label="sessionSources.qualifiedLinkName(file.pathAccessibleText, file.sourceId)"
              >{{ file.pathText }}</NuxtLink
            >
            <!-- The file's own extraction diagnostics — its recognitions'
                 reference to the kind's one shared failure record, not the
                 file's aggregate, so a row reports its own kind's failure and
                 never every problem its file carries (FR-028). -->
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
          :aria-label="`Compare this name's files: ${inlinePresentationLabel(entry.name)}${
            block.familyText !== null ? ` (${block.familyText})` : ''
          }`"
          >Compare</NuxtLink
        >
      </template>
    </SourceFamilyBlocks>
  </li>
</template>
