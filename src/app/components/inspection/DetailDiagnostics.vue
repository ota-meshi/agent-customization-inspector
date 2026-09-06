<script setup lang="ts">
// The file-confined outcomes a detail page states beside what it could read
// (FR-028): the registry fixes each code's sentence and its severity, and the
// list draws that severity rather than restating it — an error takes the
// leading edge the shell gives a failure, anything else the weight of a note.
//
// Nothing here rests on the treatment alone (WCAG 1.4.1): the sentence says
// what happened, and the edge only tells a reader scanning the page that one
// of these is the reason a panel is empty.
//
// Why each list is drawn is the caller's, so the reason stays where the panel
// it explains is: a failed extraction on the parse tab, a companion that could
// not be read on the files tab.
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import type { SerializedDiagnostic } from '../../../shared/api-types';

defineProps<{
  /**
   * The records this surface owns, in the generation's order. Empty draws
   * nothing, so a caller states no condition of its own.
   */
  diagnostics: readonly SerializedDiagnostic[];
}>();
</script>

<template>
  <ul v-if="diagnostics.length > 0" class="aci-list" role="list">
    <li
      v-for="diagnostic in diagnostics"
      :key="diagnostic.diagnosticId"
      :class="DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'"
    >
      {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
    </li>
  </ul>
</template>
