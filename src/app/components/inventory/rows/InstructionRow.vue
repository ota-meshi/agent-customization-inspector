<script setup lang="ts">
// An instructions row (T214, linked to its detail by T224, grouped by what its
// files govern by T1095). The row's unit is one applicability range
// (data-model.md § Inventory unit): a file is identified by its
// Source-relative Path and grouped by the range it governs — path-derived for
// most files, which is why the root `AGENTS.md` and `CLAUDE.md` are one row
// and a `packages/api/CLAUDE.md` its own, and declared by the file itself
// where its product reads one (Copilot's `applyTo`). One row has no range at
// all: the files whose product reads this filename's range from its
// declaration alone and whose declarations supply none a row can be keyed
// by — including a file whose declarations could not be read, whose range is
// unknown rather than absent.
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
// runtime this tool does not observe, so the row states no winner, no order,
// and no loading condition (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary). The no-range row keeps the same discipline: it states that no
// range is known for its files, never whether a session would use them.
//
// Nothing here renders an exclusion: an unsupported instruction location is a
// path no shipped selector reaches, so it is simply absent from the inventory
// rather than a row saying it was left out.
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import { detailRoute } from '../../detail-route';
import { instructionComparisonRouteFor } from '../../../composables/instruction-comparison';
import {
  SUPPORTED_TOOL_TEXT,
  applicabilityRangePresentation,
  isReadableFile,
  pathPresentationLabel,
} from '../../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import type {
  CustomizationFileSummaryDto,
  InstructionInventoryEntryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed instructions entry to render: one applicability range. */
  entry: InstructionInventoryEntryDto;
  /**
   * Every published file by its Source-relative Path — the file's identity
   * (FR-030). The row states each file's path and recognitions and repeats
   * none of the file's own facts, so this one lookup resolves the files it
   * names.
   */
  filesByPath: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /**
   * Every path with an MCP recognition in the committed generation. A file
   * here is a declaration carrier whose `FileDetail` is withheld by contract
   * (FR-007) — a Codex configured fallback can make the root `.mcp.json` an
   * instructions candidate too — so the row routes it to the carrier's own
   * MCP view and never composes it into a comparison.
   */
  mcpCarrierPaths: ReadonlySet<string>;
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The range in its presentation form (data-model.md § Inventory unit): a name
 * spanning lines cannot make one range read as two, while the backslashes the
 * range uses to spell a literal directory name stay the glob syntax they are
 * ({@link applicabilityRangePresentation}). The no-range row gets plain copy,
 * because there is no glob to show. The copy says no range is known rather
 * than that none is declared, because the row also holds a file whose
 * declarations could not be read at all — such a file may well declare one,
 * and its own diagnostic below says why nothing could be read (FR-028).
 */
const rangeText = computed(() =>
  props.entry.applicabilityRange === null
    ? 'No known applicability range'
    : applicabilityRangePresentation(props.entry.applicabilityRange),
);

/**
 * Each file this range governs, with the text and route the row renders for
 * it. The detail route is the file's own — one route however many products
 * recognize it, because no per-tool fact distinguishes what the page would
 * show (T224) — and the diagnostics are the file's own too, which is the only
 * place an instruction file's file-confined outcome can be named: it is
 * recognized, so it appears under no "files in no kind" heading, and a
 * `partial` generation would otherwise state no cause (FR-028). A file that
 * is also an MCP carrier routes to the carrier's own view instead: its
 * `FileDetail` is withheld by contract (FR-007), so the instruction detail
 * route would answer `stale-resource`, and the MCP view is where the file's
 * facts live.
 *
 * A file's path goes through the shared label rule rather than plain escaping
 * ({@link pathPresentationLabel}): a root-level name built only from
 * whitespace or default-ignorable code points draws nothing, and this line is
 * all the file is identified by. The range above needs none — it is built
 * from directory names and a `*`, so it always has a character that draws.
 *
 * Derived rather than computed once at setup, because the row's key is its
 * range: a filter that drops files from a range leaves the key alone, so the
 * component instance is reused and a value read once would keep rendering the
 * files the filter removed.
 */
const rowFiles = computed(() =>
  props.entry.files.map((file) => ({
    key: file.sourceRelativePath,
    pathText: pathPresentationLabel(file.sourceRelativePath),
    detailRoute: props.mcpCarrierPaths.has(file.sourceRelativePath)
      ? detailRoute('MCP', file.sourceRelativePath)
      : detailRoute('instructions', file.sourceRelativePath),
    recognitions: file.recognitions.map((recognition) => ({
      tool: recognition.tool,
      toolText: SUPPORTED_TOOL_TEXT[recognition.tool],
      surfacesText: recognition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', '),
    })),
    diagnosticIds: props.filesByPath.get(file.sourceRelativePath)?.diagnosticIds ?? [],
  })),
);

/**
 * The comparison this row links to — its first two comparable files — or
 * null when the range has fewer than two, where a link would open a
 * comparison with nothing to pair. Comparable means readable (FR-025: a
 * diagnostic-only file is not comparison-eligible) and not an MCP carrier,
 * whose source no comparison may display (FR-007). The compare route's own pickers take over from there:
 * they hold every committed instruction file, so the reader steps to any
 * other pair on the comparison itself instead of composing one here (T278).
 */
const compareRoute = computed(() => {
  const readable = props.entry.files.filter((file) => {
    const published = props.filesByPath.get(file.sourceRelativePath);
    return (
      published !== undefined &&
      isReadableFile(published) &&
      !props.mcpCarrierPaths.has(file.sourceRelativePath)
    );
  });
  const [first, second] = readable;
  return first !== undefined && second !== undefined
    ? instructionComparisonRouteFor(first.sourceRelativePath, second.sourceRelativePath)
    : null;
});
</script>

<template>
  <li class="aci-item">
    <!-- What the row's files govern, rendered exactly as derived and never as
         a locator anything can open (FR-024). -->
    <p class="aci-instruction-row__range aci-authored-text">{{ rangeText }}</p>

    <ul class="aci-instruction-row__files" role="list">
      <li v-for="file in rowFiles" :key="file.key">
        <!-- The file's path is its identity within the range. -->
        <p class="aci-path aci-authored-text">{{ file.pathText }}</p>

        <!-- Every product that recognized the file, in the closed tool order,
             each linking to the file's own detail route: selecting an
             instruction is how its complete inert detail opens (T224).

             The surfaces sit beside the product because the product alone
             does not say where the file is read from: Copilot's editor, CLI,
             and cloud surfaces document different lookup bases for the same
             filenames, so a root file names all three while the same filename
             in a subdirectory names the CLI's alone. It is where a product
             documents reading the file, never a claim that a session loaded
             it (FR-009). -->
        <ul class="aci-instruction-row__tools" role="list">
          <li v-for="recognition in file.recognitions" :key="recognition.tool">
            <NuxtLink :to="file.detailRoute">{{ recognition.toolText }}</NuxtLink>
            <span class="aci-instruction-row__surfaces aci-muted">{{
              recognition.surfacesText
            }}</span>
          </li>
        </ul>

        <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>

    <p v-if="compareRoute !== null" class="aci-instruction-row__compare">
      <!-- The accessible name carries the row's range after the visible
           phrase: in a links list every comparable row would otherwise
           announce identically (WCAG 2.4.6; label-in-name keeps the visible
           phrase as the prefix). -->
      <NuxtLink :to="compareRoute" :aria-label="`Compare this range's files: ${rangeText}`"
        >Compare this range's files</NuxtLink
      >
    </p>
  </li>
</template>

<style scoped>
.aci-instruction-row__range {
  margin: 0;
  font-weight: 600;
}

.aci-instruction-row__files {
  list-style: none;
  margin: 0.2rem 0 0;
  padding-inline-start: 0;
}

.aci-instruction-row__files > li + li {
  margin-block-start: 0.4rem;
}

.aci-instruction-row__tools {
  list-style: none;
  margin: 0.2rem 0 0;
  /* The recognitions of the file, set under the path by an indent and a rule,
     matching how a skill row groups its definitions. */
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}

/* The surfaces trail the product on the same line, set apart by a separator
   rather than by punctuation inside the text: the product is the link, and the
   surfaces qualify it. */
.aci-instruction-row__surfaces {
  margin-inline-start: 0.4rem;
}

.aci-instruction-row__surfaces::before {
  content: '·';
  margin-inline-end: 0.4rem;
}
</style>
