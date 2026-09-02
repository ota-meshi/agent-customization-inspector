<script setup lang="ts">
// One applicability range as the instructions list shows it: the range, then
// its files in one block per Source family, rendered through the shared
// family blocks exactly as every sibling row renders its members
// (`SourceFamilyBlocks.vue`; T214, linked to its detail by T224, grouped by
// what its files govern by T1095, family blocks by T1140).
//
// The published row is one range of one Source (data-model.md § Inventory
// unit), and this list item gathers every Source's rows of one range: a
// reader looking for what governs `**` finds one place for it instead of one
// heading per Source, with the repository's files and the consented homes'
// as two blocks rather than one merged list (FR-030). Which directory a file
// was in stays a fact of the file, stated beside it rather than in a
// heading: a heading naming two homes would name neither (FR-002).
//
// A row shows what was found, how it was classified, and what it governs —
// never what it says. The snapshot carries no `sourceText`, and complete
// authored content is served only by the detail route, one file at a time —
// with the row identity itself as FR-027's stated exception, which is why a
// declared range can stand here.
//
// A derived range is where a file sits and a declared one is what the file
// says of itself; neither is what a session loaded. Codex selects at most one
// non-empty instruction file per directory, Claude loads a file at session
// start or only once it reads a file beside it, and whether a declared
// pattern matches depends on what a session works on — outcomes that turn on
// runtime this tool does not observe, so nothing here states a winner, an
// order, or a loading condition (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary). The range itself is stated exactly as derived or declared, and
// never as a locator anything can open (FR-024).
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RecognitionMarks from '../RecognitionMarks.vue';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
import { detailRoute, familyComparisonPairsOf } from '../../detail-route';
import { ApplicabilityRange } from '../../applicability-range';
import { useSessionSources } from '../../../composables/session-sources';
import { instructionComparisonRouteFor } from '../../../composables/instruction-comparison';
import {
  fileIdentityKey,
  isReadableFile,
  pathPresentationLabel,
  accessiblePresentationLabel,
} from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
  SourceKind,
} from '../../../../shared/api-types';
import type { InstructionRangeGroup } from '../../../composables/filters';

const props = defineProps<{
  /** The range and the rows governing it, in the published family-major order. */
  group: InstructionRangeGroup;
  /**
   * Every published file by Source and Source-relative Path — the file's
   * identity (FR-030). The row states each file's path and recognitions and
   * repeats none of the file's own facts, so this lookup resolves the files
   * its members name.
   */
  filesBySource: ReadonlyMap<string, ReadonlyMap<string, CustomizationFileSummaryDto>>;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The range in its presentation form (data-model.md § Inventory unit): a name
 * spanning lines cannot make one range read as two, while the backslashes the
 * range uses to spell a literal directory name stay the glob syntax they are
 * ({@link ApplicabilityRange}), including the no-range group, which has no
 * glob to show and takes this product's copy instead.
 */
const range = computed(() => new ApplicabilityRange(props.group.applicabilityRange));

/**
 * Every file of every row in the range, in the published family-major order
 * the group already carries, with the text and routes the row renders for it.
 *
 * The detail route is the file's own — one route however many products
 * recognize it, because no per-tool fact distinguishes what the page would
 * show (T224) — and the diagnostics are the file's own too, which is the only
 * place an instruction file's file-confined outcome can be named: it is
 * recognized, so it appears under no "files in no kind" heading, and a
 * `partial` generation would otherwise state no cause (FR-028). A file that
 * also carries MCP declarations still routes here: which detail answers for a
 * file is decided by the row it is reached through, and this row's subject is
 * the file (FR-007).
 *
 * A file's path goes through the shared label rule rather than plain escaping
 * ({@link pathPresentationLabel}): a root-level name built only from
 * whitespace or default-ignorable code points draws nothing, and this line is
 * all the file is identified by.
 */
const rowFiles = computed(() =>
  props.group.rows.flatMap((row) => {
    const filesByPath = props.filesBySource.get(row.sourceId);
    const selector = sessionSources.selectorOf(row.sourceId);
    return row.files.map((file) => ({
      /** The row's Source: what the file's directory line derives from. */
      sourceId: row.sourceId,
      sourceRelativePath: file.sourceRelativePath,
      pathText: pathPresentationLabel(file.sourceRelativePath),
      // Both halves of the identity: the file's own Source leads the route, so
      // which of two identically-addressed files this link opens is part of the
      // address rather than left to whichever the session lists first (FR-030).
      detailRoute: detailRoute('instructions', file.sourceRelativePath, selector),
      /**
       * What a screen reader announces the path link as: every file of a range
       * offers one link, so the path is what tells them apart out of visual
       * context, through the whitespace-safe label (WCAG 2.4.4, FR-025).
       */
      pathAccessibleText: accessiblePresentationLabel(file.sourceRelativePath),
      recognitions: file.recognitions,
      diagnosticIds: filesByPath?.get(file.sourceRelativePath)?.diagnosticIds ?? [],
    }));
  }),
);

/**
 * Each family block's comparison entry — that family's first two comparable
 * files, for the blocks that hold a pair (FR-011): a block's comparison is
 * that family's, and a pair never spans two families
 * (contracts/http-api.md § Host requirements #5), so a row whose blocks each
 * hold one file offers no entry. Comparable means readable (FR-025: a
 * diagnostic-only file is not comparison-eligible), and the sides are drawn
 * from the group's own published identities rather than from the rows a
 * narrowing left, so a narrowing that drops one home's whole row does not
 * take the entry with it ({@link InstructionRangeGroup.fileIdentities}). The
 * compare route's own pickers take over from there
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
  const headed = sessionSources.familyLineShownFor(rowFiles.value, [
    ...blockCompareRoutes.value.keys(),
  ]);
  return headed || routes.length !== 1 ? null : routes[0]!;
});

const blockCompareRoutes = computed(() => {
  const comparable = props.group.fileIdentities.flatMap((identity) => {
    const published = props.filesBySource.get(identity.sourceId)?.get(identity.sourceRelativePath);
    return published !== undefined && isReadableFile(published)
      ? [
          {
            source: sessionSources.selectorOf(identity.sourceId),
            sourceRelativePath: identity.sourceRelativePath,
          },
        ]
      : [];
  });
  const routes = new Map<SourceKind, ReturnType<typeof instructionComparisonRouteFor>>();
  for (const [kind, [first, second]] of familyComparisonPairsOf(comparable)) {
    routes.set(kind, instructionComparisonRouteFor(kind, first, second));
  }
  return routes;
});
</script>

<template>
  <li class="aci-item">
    <p class="aci-row-head">
      <!-- What the group's files govern, rendered exactly as derived and never
           as a locator anything can open (FR-024). -->
      <span class="aci-row-head__name" :class="{ 'aci-authored-text': range.isDeclared }">{{
        range.text
      }}</span>
      <span class="aci-row-head__count"
        >{{ rowFiles.length }} {{ rowFiles.length === 1 ? 'file' : 'files' }}</span
      >
      <!-- The comparison entry, where this row has one family and so no family
           line of its own to close (`SourceFamilyBlocks.vue`). -->
      <span v-if="headCompareRoute" class="aci-row-head__end">
        <NuxtLink
          :to="headCompareRoute"
          :aria-label="`Compare this range's files: ${range.singleLineText}`"
          >Compare</NuxtLink
        >
      </span>
    </p>

    <SourceFamilyBlocks
      :members="rowFiles"
      :member-key="(file) => fileIdentityKey(file.sourceId, file.sourceRelativePath)"
      :entry-kinds="[...blockCompareRoutes.keys()]"
    >
      <template #member="{ member: file }">
        <!-- The file's path is its identity within the range and the link to
             its own detail: selecting an instruction is how its complete inert
             detail opens (T224). The products that recognized it stand beside
             it, the way an MCP or agent row lays out a carrier and its
             recognitions.

             The surfaces sit beside the product because the product alone does
             not say where the file is read from: Copilot's editor, CLI, and
             cloud surfaces document different lookup bases for the same
             filenames, so a root file names all three while the same filename
             in a subdirectory names the CLI's alone. It is where a product
             documents reading the file, never a claim that a session loaded it
             (FR-009). -->
        <div class="aci-row-file">
          <span class="aci-row-file__path">
            <!-- Which home the file came from, where its family holds more than
                 one Source: the member's own name, never a path anything can
                 open (FR-002, FR-030). -->
            <SourceHomeBadge :source-id="file.sourceId" />
            <NuxtLink
              :to="file.detailRoute"
              class="aci-path aci-authored-text"
              :aria-label="sessionSources.qualifiedLinkName(file.pathAccessibleText, file.sourceId)"
              >{{ file.pathText }}</NuxtLink
            >
            <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
          </span>
          <RecognitionMarks :recognitions="file.recognitions" />
          <span class="aci-row-file__end" />
        </div>
      </template>

      <!-- The block's own comparison entry (FR-011): the family is where a
           pair of this row's files lives, so each block that holds two
           comparable files offers its own — the shape every sibling row's
           blocks carry. The accessible name carries the range always, and the
           family where two blocks each offer one (WCAG 2.4.6). -->
      <template #entry="{ block }">
        <NuxtLink
          v-if="blockCompareRoutes.get(block.kind)"
          :to="blockCompareRoutes.get(block.kind)!"
          :aria-label="`Compare this range's files: ${range.singleLineText}${
            block.familyText !== null ? ` (${block.familyText})` : ''
          }`"
          >Compare</NuxtLink
        >
      </template>
    </SourceFamilyBlocks>
  </li>
</template>
