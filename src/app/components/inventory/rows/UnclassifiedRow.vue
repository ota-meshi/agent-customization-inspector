<script setup lang="ts">
// The row for a file that appears in no kind's inventory (T071): its bytes were
// never accepted, so nothing was recognized in it.
//
// It states the read outcome rather than hiding it. For an unreadable file that
// outcome plus its diagnostic is the entire finding, and dropping it would
// leave a `partial` generation unable to say which file made it partial
// (FR-028). There is no kind to name here — a kind's inventory would have
// listed the file if one had recognized it — but there is a Source, and where
// two are carried it is what tells one unreadable `AGENTS.override.md` from the
// other (FR-030).
import { computed } from 'vue';
import RowDiagnostics from './RowDiagnostics.vue';
import { useSessionSources } from '../../../composables/session-sources';
import { FILE_ENCODING_TEXT, pathPresentationLabel } from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed inventory row to render. */
  file: CustomizationFileSummaryDto;
  /** The generation's diagnostics, resolved per row by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/** Always shown here: this row exists because of how it read, or how it did not. */
const readOutcome = computed(() => FILE_ENCODING_TEXT[props.file.encoding]);

/**
 * Which family's file this is, and which directory it was in where that family
 * holds more than one — or null where neither distinguishes anything
 * ({@link SessionSources.familyNameOf}, {@link SessionSources.rootTextOf}).
 * This row is identified by its path alone otherwise, and two Sources can
 * hold one path: without them, one unreadable file and another are the same
 * line twice (FR-028, FR-030).
 */
const sourceText = computed(() => {
  const family = sessionSources.familyNameOf(sessionSources.familyKindOf(props.file.sourceId));
  const root = sessionSources.rootTextOf(props.file.sourceId);
  return family === null ? null : root === null ? family : `${family} · ${root}`;
});

/**
 * The path as presentation text (data-model.md § SourceRelativePath): control
 * characters escaped, so an authored name spanning lines cannot read as two
 * rows, and spelled out in full when escaping alone would still draw nothing —
 * this row's path is all it is identified by, and a blank one identifies no
 * file. A computed keeps the pre-wrap paragraph's binding on one line.
 */
const pathText = computed(() => pathPresentationLabel(props.file.sourceRelativePath));
</script>

<template>
  <li class="aci-item">
    <p class="aci-path aci-authored-text">{{ pathText }}</p>
    <!-- The Source and the read outcome on one line: both are this product's
         words about the file above, and the Source leads because it is half the
         file's identity while the outcome is what happened to it. -->
    <p class="aci-note aci-unclassified-row__facts">
      <template v-if="sourceText !== null">{{ sourceText }} · </template>{{ readOutcome }}
    </p>
    <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
  </li>
</template>

<style scoped>
/* The facts line carries a home's escaped root, which has no break
   opportunities of its own; wrapping keeps the page from scrolling sideways at
   narrow widths (WCAG 1.4.10). */
.aci-unclassified-row__facts {
  overflow-wrap: anywhere;
}
</style>
