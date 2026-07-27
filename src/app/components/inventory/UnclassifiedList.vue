<script setup lang="ts">
// The files that appear in no kind's inventory (T1077). They are listed apart
// from every kind tab rather than dropped: a file whose bytes were never
// accepted has no kind to be listed under, and these are exactly the rows
// carrying a file-confined diagnostic, so a generation that says `partial` has
// to be able to say which file made it partial (FR-028).
//
// It carries no empty state of its own. The caller renders this section only
// when there is something to list, because a heading that says nothing could
// not be read is a finding, not a placeholder.
import UnclassifiedRow from './rows/UnclassifiedRow.vue';
import type { CustomizationFileSummaryDto, SerializedDiagnostic } from '../../../shared/api-types';

defineProps<{
  /** The unrecognized files that passed the active filters, in snapshot order. */
  files: readonly CustomizationFileSummaryDto[];
  /** The generation's diagnostics, resolved per row. */
  diagnostics: readonly SerializedDiagnostic[];
}>();
</script>

<template>
  <ul class="aci-list aci-inventory" role="list">
    <UnclassifiedRow
      v-for="file in files"
      :key="file.fileId"
      :file="file"
      :diagnostics="diagnostics"
    />
  </ul>
</template>
