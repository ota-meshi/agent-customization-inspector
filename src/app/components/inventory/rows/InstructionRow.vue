<script setup lang="ts">
// One applicability range as the instructions list shows it: the range, then
// its files in one block per Source family, rendered through the shared
// family blocks exactly as every sibling row renders its members
// (`SourceFamilyBlocks.vue`; T214, linked to its detail by T224, grouped by
// what its files govern by T1095, family blocks by T1127).
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
import RowDiagnostics from './RowDiagnostics.vue';
import SourceFamilyBlocks from '../SourceFamilyBlocks.vue';
import SourceRootLine from '../SourceRootLine.vue';
import { detailRoute, familyComparisonPairsOf } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { instructionComparisonRouteFor } from '../../../composables/instruction-comparison';
import {
  SUPPORTED_TOOL_TEXT,
  applicabilityRangePresentation,
  fileIdentityKey,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
} from '../../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
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
 * ({@link applicabilityRangePresentation}). The no-range group gets plain
 * copy, because there is no glob to show. The copy says no range is known
 * rather than that none is declared, because the group also holds files whose
 * declarations could not be read at all — such a file may well declare one,
 * and its own diagnostic below says why nothing could be read (FR-028).
 */
const rangeText = computed(() =>
  props.group.applicabilityRange === null
    ? 'No known applicability range'
    : applicabilityRangePresentation(props.group.applicabilityRange),
);

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
      pathAccessibleText: inlinePresentationLabel(file.sourceRelativePath),
      recognitions: file.recognitions.map((recognition) => ({
        tool: recognition.tool,
        toolText: SUPPORTED_TOOL_TEXT[recognition.tool],
        surfacesText: recognition.surfaces
          .map((surface) => VENDOR_SURFACE_TEXT[surface])
          .join(', '),
      })),
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
    <!-- What the group's files govern, rendered exactly as derived and never as
         a locator anything can open (FR-024). -->
    <p class="aci-instruction-row__range aci-authored-text">{{ rangeText }}</p>

    <SourceFamilyBlocks
      :members="rowFiles"
      :member-key="(file) => fileIdentityKey(file.sourceId, file.sourceRelativePath)"
      :identities="group.fileIdentities"
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
        <p class="aci-instruction-row__owner">
          <NuxtLink
            :to="file.detailRoute"
            class="aci-path aci-authored-text"
            :aria-label="file.pathAccessibleText"
            >{{ file.pathText }}</NuxtLink
          >
          <span
            v-for="recognition in file.recognitions"
            :key="recognition.tool"
            class="aci-instruction-row__tool aci-muted"
            >{{ recognition.toolText }}
            <span class="aci-instruction-row__surfaces">{{ recognition.surfacesText }}</span></span
          >
        </p>

        <!-- Which directory the file was in, where its family holds more than
             one Source: an escaped presentation of the admitted root, never a
             path anything can open (FR-002, FR-030). -->
        <SourceRootLine :source-id="file.sourceId" />

        <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
      </template>

      <!-- The block's own comparison entry (FR-011): the family is where a
           pair of this row's files lives, so each block that holds two
           comparable files offers its own — the shape every sibling row's
           blocks carry. The accessible name carries the range always, and the
           family where two blocks each offer one (WCAG 2.4.6). -->
      <template #entry="{ block }">
        <p v-if="blockCompareRoutes.get(block.kind)" class="aci-instruction-row__compare">
          <NuxtLink
            :to="blockCompareRoutes.get(block.kind)!"
            :aria-label="`Compare this range's files: ${rangeText}${
              blockCompareRoutes.size > 1 && block.familyText !== null
                ? ` (${block.familyText})`
                : ''
            }`"
            >Compare this range's files</NuxtLink
          >
        </p>
      </template>
    </SourceFamilyBlocks>
  </li>
</template>

<style scoped>
.aci-instruction-row__range {
  margin: 0;
  font-weight: 600;
}

/* The path and the products that recognize it on one line, the way an MCP or
   agent row lays out a carrier and its recognitions: the path is the subject
   and the products qualify it. */
.aci-instruction-row__owner {
  margin: 0;
}

.aci-instruction-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-instruction-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

.aci-instruction-row__surfaces {
  font-size: 0.85em;
}

.aci-instruction-row__surfaces::before {
  content: '(';
}

.aci-instruction-row__surfaces::after {
  content: ')';
}

/* The comparison entry under the files it is about, set off by space rather
   than by an indent: it belongs to the block, not to any one file. */
.aci-instruction-row__compare {
  margin: 0.3rem 0 0;
}
</style>
