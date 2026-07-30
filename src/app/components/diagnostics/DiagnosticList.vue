<script setup lang="ts">
// Actionable diagnostics for the current session (T072).
//
// Every diagnostic's text, severity, and scope come from
// `DIAGNOSTIC_REGISTRY`, keyed by the code the wire DTO carries. Nothing is
// composed here: a message states what happened and what the user can do
// about it, and those sentences are fixed beside the closed code union so a
// new code cannot ship without one.
//
// A diagnostic is an Inspector-side outcome, never a verdict about the
// inspected file. "Could not be read" is a fact about this scan; it is not a
// claim that the file is invalid, unsupported, or wrong for its vendor.
//
// File-scoped records are rendered on their own row by each kind's row
// component, so this list shows the session- and source-scoped records that
// have no row to attach to — otherwise the same record would appear twice.
import { computed } from 'vue';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import type { SerializedDiagnostic } from '../../../shared/api-types';

const props = defineProps<{
  /** Every diagnostic the snapshot published. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

const unattached = computed(() =>
  props.diagnostics.filter((diagnostic) => diagnostic.fileId === null),
);
</script>

<template>
  <!-- Scoped to what this list owns. File-scoped records are shown on their
       own rows, so "no diagnostics" would deny records visible on the same
       screen. -->
  <p v-if="unattached.length === 0" class="aci-empty">No session- or source-level diagnostics.</p>
  <ul v-else class="aci-list" role="list">
    <li
      v-for="diagnostic in unattached"
      :key="diagnostic.diagnosticId"
      :class="DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'"
    >
      {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
    </li>
  </ul>
</template>
