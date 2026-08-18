<script setup lang="ts">
// The row for a file that appears in no kind's inventory (T071): its bytes were
// never accepted, so nothing was recognized in it.
//
// It states the read outcome rather than hiding it. For an unreadable file that
// outcome plus its diagnostic is the entire finding, and dropping it would
// leave a `partial` generation unable to say which file made it partial
// (FR-028). There is no kind to name here — a kind's inventory would have
// listed the file if one had recognized it.
import { computed } from 'vue';
import RowDiagnostics from './RowDiagnostics.vue';
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

/** Always shown here: this row exists because of how it read, or how it did not. */
const readOutcome = computed(() => FILE_ENCODING_TEXT[props.file.encoding]);

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
    <p class="aci-note">{{ readOutcome }}</p>
    <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
  </li>
</template>
