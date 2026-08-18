<script setup lang="ts">
// An instructions row (T214, linked to its detail by T224, grouped by what its
// files govern by T1095). The row's unit is one applicability range
// (data-model.md § Inventory unit): no authored declaration names an
// instructions file, so a file is identified by its Source-relative Path and
// grouped by the range it governs — which is why the root `AGENTS.md` and
// `CLAUDE.md` are one row, and a `packages/api/CLAUDE.md` its own.
//
// A row shows what was found, how it was classified, and what it governs —
// never what it says. The snapshot carries no `sourceText`, and complete
// authored content is served only by the detail route, one file at a time
// (FR-027).
//
// A range is where a file sits, not what a session loaded. Codex selects at
// most one non-empty instruction file per directory, and Claude loads a file at
// session start or only once it reads a file beside it — outcomes that turn on
// runtime this tool does not observe, so the row states no winner, no order,
// and no loading condition (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary).
//
// Nothing here renders an exclusion: an unsupported instruction location is a
// path no shipped selector reaches, so it is simply absent from the inventory
// rather than a row saying it was left out.
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import { instructionDetailRoute } from '../../instruction-detail-route';
import {
  SUPPORTED_TOOL_TEXT,
  applicabilityRangePresentation,
  pathPresentationLabel,
} from '../../../../shared/entities';
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
  /** The generation's diagnostics, resolved per file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The range in its presentation form (data-model.md § Inventory unit): a name
 * spanning lines cannot make one range read as two, while the backslashes the
 * range uses to spell a literal directory name stay the glob syntax they are
 * ({@link applicabilityRangePresentation}).
 */
const rangeText = computed(() => applicabilityRangePresentation(props.entry.applicabilityRange));

/**
 * Each file this range governs, with the text and route the row renders for
 * it. The detail route is the file's own — one route however many products
 * recognize it, because no per-tool fact distinguishes what the page would
 * show (T224) — and the diagnostics are the file's own too, which is the only
 * place an instruction file's file-confined outcome can be named: it is
 * recognized, so it appears under no "files in no kind" heading, and a
 * `partial` generation would otherwise state no cause (FR-028).
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
    detailRoute: instructionDetailRoute(file.sourceRelativePath),
    tools: file.tools,
    diagnosticIds: props.filesByPath.get(file.sourceRelativePath)?.diagnosticIds ?? [],
  })),
);
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
             instruction is how its complete inert detail opens (T224). -->
        <ul class="aci-instruction-row__tools" role="list">
          <li v-for="tool in file.tools" :key="tool">
            <NuxtLink :to="file.detailRoute">{{ SUPPORTED_TOOL_TEXT[tool] }}</NuxtLink>
          </li>
        </ul>

        <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>
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
</style>
