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
//
// Each code's sentence is stated once. Every caller hands over one file's
// records, and two records of one code are two readings of that file failing
// the same way — a `.claude/settings.json` holding a comment fails both the
// permission policy's strict reading and the hooks' (data-model.md
// § Diagnostic) — while the sentence names neither reading, so a second copy
// would tell the reader nothing the first did not.
import { computed } from 'vue';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import type { SerializedDiagnostic } from '../../../shared/api-types';

const props = defineProps<{
  /**
   * The records this surface owns, in the generation's order. Empty draws
   * nothing, so a caller states no condition of its own.
   */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The codes the records carry, each once, in the order the records first name them. */
const codes = computed(() => new Set(props.diagnostics.map((diagnostic) => diagnostic.code)));
</script>

<template>
  <ul v-if="codes.size > 0" class="aci-list" role="list">
    <li
      v-for="code in codes"
      :key="code"
      :class="DIAGNOSTIC_REGISTRY[code].severity === 'error' ? 'aci-error' : 'aci-note'"
    >
      {{ DIAGNOSTIC_REGISTRY[code].message }}
    </li>
  </ul>
</template>
