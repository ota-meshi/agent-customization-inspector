<script setup lang="ts">
// One recognition, at a glance (T101): what the file was recognized as and the
// values that recognition admits.
//
// This is what a reader needs before deciding to look further, and it is
// deliberately short: someone reading a skill's `scripts/run.sh` is not asking
// which rule admitted the `SKILL.md` or how well that rule is documented. The
// answers to those live in `RecognitionDetails.vue`, behind a disclosure, so
// they cost no space until they are wanted.
//
// The applicability sentence is there too, and not because it is unimportant:
// it is the product's central claim that being listed is not being loaded. But
// every shipped rule projects the same `conditional`, so on this surface it is
// one constant line on every skill; the inventory states it once for the whole
// product, and a reader landing directly on a detail URL still finds it per
// recognition inside the disclosure. It returns here when a rule ships whose
// projection can differ from its neighbour's.
//
// Every value is rendered through a Vue text binding, and no contract
// identifier reaches the screen: a field is captioned by what it is.
import type { SerializedDiagnostic, ToolRecognitionDto } from '../../../shared/api-types';
import {
  CUSTOMIZATION_KIND_TEXT,
  SUPPORTED_TOOL_TEXT,
  rendersNothingVisible,
} from '../../../shared/entities';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import { METADATA_FIELD_TEXT } from '../../../shared/registries/identifier-text';
import { computed } from 'vue';

const props = defineProps<{
  /** The recognition to summarize, exactly as the detail result published it. */
  recognition: ToolRecognitionDto;
  /** The detail's diagnostics, resolved here for this recognition's IDs. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * What the extraction did, said in a sentence — but only when that changes what
 * the reader should conclude. `parsed` needs no line: the declared values below
 * it are the evidence. `failed` does: the values are missing and the file is
 * otherwise fine, which nothing else on the screen would say (FR-028).
 */
const extractionProblem = computed(() => {
  switch (props.recognition.parseStatus) {
    case 'parsed':
      return null;
    case 'not-attempted':
      return 'No metadata is extracted for this kind yet.';
    case 'failed':
      return 'Metadata could not be extracted, so none is shown. The complete source is unaffected.';
    default: {
      const unhandled: never = props.recognition.parseStatus;
      return unhandled;
    }
  }
});

/** This recognition's own diagnostics, resolved from the detail's records. */
const recognitionDiagnostics = computed(() =>
  props.diagnostics.filter((diagnostic) =>
    props.recognition.diagnosticIds.includes(diagnostic.diagnosticId),
  ),
);
</script>

<template>
  <div class="aci-recognition-summary">
    <p class="aci-recognition-kind">
      {{ SUPPORTED_TOOL_TEXT[recognition.tool] }} ·
      {{ CUSTOMIZATION_KIND_TEXT[recognition.details.kind] }}
    </p>

    <p v-if="extractionProblem" class="aci-note">{{ extractionProblem }}</p>

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

    <dl v-if="recognition.declaredMetadata.length > 0" class="aci-metadata">
      <template v-for="entry in recognition.declaredMetadata" :key="entry.fieldId">
        <dt>{{ METADATA_FIELD_TEXT[entry.fieldId] }}</dt>
        <!-- The value a product loading this file would have. It is never
             masked, and an environment reference in it stays the characters that
             were written — nothing here resolves one. A value that draws nothing
             is labelled instead of left as an empty definition, which would read
             as a field that was not shown. -->
        <dd v-if="entry.value === ''" class="aci-muted">(empty value)</dd>
        <dd v-else-if="rendersNothingVisible(entry.value)" class="aci-muted">
          (value with no visible characters)
        </dd>
        <dd v-else class="aci-declared-value aci-authored-text">{{ entry.value }}</dd>
      </template>
    </dl>
  </div>
</template>

<style scoped>
.aci-recognition-kind {
  font-weight: 600;
  margin: 0;
}

/* The value is the thing being shown, so it is set apart from the surrounding
   prose. It is clipped rather than wrapped without limit: a long description
   would otherwise push the files below it off the screen. The disclosure below
   carries the same values unclipped, which is what makes clipping here a
   layout choice rather than a value withheld. */
.aci-declared-value {
  display: -webkit-box;
  font-family: ui-monospace, monospace;
  margin: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
