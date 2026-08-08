<script setup lang="ts">
// One recognition, at a glance (T101): what the file was recognized as, and
// anything that went wrong recognizing it.
//
// This is what a reader needs before deciding to look further, and it is
// deliberately short: the file's own declarations are drawn out below it and
// its complete source is one tab away, so nothing here repeats a value. There
// is no deeper account behind a disclosure either — why a rule admitted the
// file, and what its use would depend on, is documentation about the vendor
// rather than something this product reads out of the file.
//
// Every value is rendered through a Vue text binding, and no contract
// identifier reaches the screen.
import type { SerializedDiagnostic, ToolRecognitionDto } from '../../../shared/api-types';
import { CUSTOMIZATION_KIND_TEXT, SUPPORTED_TOOL_TEXT } from '../../../shared/entities';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import { computed } from 'vue';

const props = defineProps<{
  /** The recognition to summarize, exactly as the detail result published it. */
  recognition: ToolRecognitionDto;
  /** The detail's diagnostics, resolved here for this recognition's IDs. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** This recognition's own diagnostics, resolved from the detail's records. */
const recognitionDiagnostics = computed(() =>
  props.diagnostics.filter((diagnostic) =>
    props.recognition.diagnosticIds.includes(diagnostic.diagnosticId),
  ),
);
</script>

<template>
  <div class="aci-recognition-summary">
    <p class="aci-recognition-summary__kind">
      {{ SUPPORTED_TOOL_TEXT[recognition.tool] }} ·
      {{ CUSTOMIZATION_KIND_TEXT[recognition.details.kind] }}
    </p>

    <!-- A failed extraction surfaces here through its own Diagnostic (FR-028):
         the declared name is missing and the file is otherwise fine, which
         nothing else on the screen would say. -->
    <ul v-if="recognitionDiagnostics.length > 0" class="aci-list" role="list">
      <li
        v-for="diagnostic in recognitionDiagnostics"
        :key="diagnostic.diagnosticId"
        :class="
          DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'
        "
      >
        {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.aci-recognition-summary__kind {
  font-weight: 600;
  margin: 0;
}
</style>
