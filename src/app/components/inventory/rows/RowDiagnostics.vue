<script setup lang="ts">
// The per-row diagnostic list, shared by every kind's row component (T071).
//
// Diagnostics read the same whatever the row is: a file-confined outcome is
// about the file, not about what was recognized in it. Factoring it here keeps
// each kind's component about that kind, and keeps one place to change when the
// presentation of a file-confined outcome changes (FR-028).
import { computed } from 'vue';
import { DIAGNOSTIC_REGISTRY } from '../../../../shared/diagnostics';
import type { SerializedDiagnostic } from '../../../../shared/api-types';

const props = defineProps<{
  /** The IDs this row owns, from the committed generation. */
  diagnosticIds: readonly string[];
  /** The generation's diagnostics, resolved against those IDs here. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

const rowDiagnostics = computed(() =>
  props.diagnostics.filter((diagnostic) => props.diagnosticIds.includes(diagnostic.diagnosticId)),
);
</script>

<template>
  <ul v-if="rowDiagnostics.length > 0" role="list" class="aci-list">
    <!-- The registry fixes each code's severity: a binary file or a parse
         failure is a warning, not an error, and painting both alike would
         overstate what the row found. -->
    <li
      v-for="diagnostic in rowDiagnostics"
      :key="diagnostic.diagnosticId"
      :class="DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'"
    >
      {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
    </li>
  </ul>
</template>
