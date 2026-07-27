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
import { FILE_ENCODING_TEXT } from '../../../../shared/entities';
import type { CustomizationFileSummaryDto, SerializedDiagnostic } from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed inventory row to render. */
  file: CustomizationFileSummaryDto;
  /** The generation's diagnostics, resolved per row by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** Always shown here: this row exists because of how it read, or how it did not. */
const readOutcome = computed(() => FILE_ENCODING_TEXT[props.file.encoding]);
</script>

<template>
  <li class="aci-item">
    <p class="aci-path">{{ file.sourceRelativePath }}</p>
    <p class="aci-note">{{ readOutcome }}</p>
    <RowDiagnostics :diagnostic-ids="file.diagnosticIds" :diagnostics="diagnostics" />
  </li>
</template>
