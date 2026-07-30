<script setup lang="ts">
// The disclosed part of one recognition (T101): why the file was inspected,
// what the answer depends on, and how well the vendor documents any of it.
//
// It is separate from `RecognitionSummary.vue` because it answers a different
// question. The summary says what the file is, which a reader needs before
// anything else; this says whether the product would use it and how that was
// arrived at, which a reader wants occasionally and never while reading a
// skill's `scripts/run.sh`. Keeping it behind a disclosure is what lets a skill and its
// files share one screen without either being scrolled away.
//
// It carries the declared values a second time, unclipped. The summary clips a
// long one so the files below it keep their room, and a clipped value with
// nowhere to read the rest would be a value the product withheld.
//
// A recognition is never a claim that the product loaded the file: the
// applicability summary states exactly what the retained documentation proves,
// and for every shipped rule that is "depends on runtime conditions this tool
// does not evaluate".
//
// Every value is rendered through a Vue text binding. Nothing here is markup,
// a link, or a URI.
//
// Nothing here renders a contract identifier either. `codex.skill.name` and
// `codex.repo.skill` key registry records and are checked by the contract
// gates; to someone looking at their own file they are noise standing where an
// answer should be. Each one is rendered through the table beside its union, so
// the panel says what the product recognized instead of what it calls it.
import {
  APPLICABILITY_SUMMARY_TEXT,
  CONDITION_FACT_KEY_TEXT,
  CONDITION_FACT_STATUS_TEXT,
} from '../../../shared/api-text';
import type { ToolRecognitionDto } from '../../../shared/api-types';
import {
  DOCUMENTATION_STATUS_TEXT,
  LIFECYCLE_QUALIFIER_TEXT,
  escapeControlCharacters,
  rendersNothingVisible,
} from '../../../shared/entities';
import {
  METADATA_FIELD_TEXT,
  REGISTRY_SUBJECT_TEXT,
} from '../../../shared/registries/identifier-text';

defineProps<{
  /** The recognition to render, exactly as the detail result published it. */
  recognition: ToolRecognitionDto;
}>();
</script>

<template>
  <div class="aci-recognition">
    <h3>What it declares</h3>
    <!-- An empty list is two different facts, and only the parse state tells
         them apart: extraction ran and found nothing declared, or extraction
         never produced values at all. Saying "nothing was declared" after a
         failed extraction would state something this scan did not establish
         (FR-028, FR-032). -->
    <p v-if="recognition.declaredMetadata.length === 0" class="aci-note">
      <template v-if="recognition.parseStatus === 'parsed'"
        >No values this product's presentation allowlist covers were declared here. Anything else
        the file declares stays visible in its complete source.</template
      >
      <template v-else-if="recognition.parseStatus === 'failed'"
        >Extraction did not complete for this recognition, so no declared values are shown. What the
        file declares stays visible in its complete source.</template
      >
      <template v-else
        >No values are extracted for this kind yet. What the file declares stays visible in its
        complete source.</template
      >
    </p>
    <!-- The same values the summary shows, whole. The summary clips a long one
         so the files below it keep their room; this is where the rest of it
         is, which is why the clip is not a loss. -->
    <dl v-else class="aci-metadata">
      <template v-for="entry in recognition.declaredMetadata" :key="entry.fieldId">
        <dt>{{ METADATA_FIELD_TEXT[entry.fieldId] }}</dt>
        <!-- An authored value that draws nothing — empty, or whitespace and
             zero-width characters only — would render as an empty definition,
             which reads as a field that was not shown at all. The label says
             which it is; the value itself is never altered (FR-025). -->
        <dd v-if="entry.value === ''" class="aci-muted">(empty value)</dd>
        <dd v-else-if="rendersNothingVisible(entry.value)" class="aci-muted">
          (value with no visible characters)
        </dd>
        <dd v-else class="aci-declared-value-full">{{ entry.value }}</dd>
      </template>
    </dl>

    <h3>Why this file was inspected</h3>
    <ul class="aci-list" role="list">
      <!-- Keyed by position as well as rule: one rule can admit a file through
           two of its own selectors, so the rule ID alone is not unique. -->
      <li
        v-for="(provenance, index) in recognition.provenances"
        :key="`${provenance.ruleId}:${index}`"
      >
        <!-- What the admitting rule is for, rather than the ID that names it.
             The rule's own sentence is the answer to the heading above. -->
        <p>{{ REGISTRY_SUBJECT_TEXT[provenance.ruleId] }}.</p>
        <!-- Escaped for presentation (data-model.md § SourceRelativePath),
             like every rendered path. -->
        <p class="aci-note">
          Matched
          <span class="aci-path aci-authored-text">{{
            escapeControlCharacters(provenance.matchedPath)
          }}</span
          >.
        </p>
        <p class="aci-note">{{ APPLICABILITY_SUMMARY_TEXT[provenance.applicability.summary] }}.</p>
        <!-- The conditions stay visible even though the summary above already
             projects them: the summary says what is known, and these say which
             specific inputs are missing (data-model.md
             § ApplicabilityAssessment). Each is named as something the reader
             could answer about their own machine, which is what an unobserved
             input is. -->
        <details v-if="provenance.applicability.conditions.length > 0">
          <summary>What this depends on</summary>
          <ul class="aci-list" role="list">
            <li
              v-for="condition in provenance.applicability.conditions"
              :key="condition.reasonCode"
            >
              {{ CONDITION_FACT_KEY_TEXT[condition.key] }} —
              {{ CONDITION_FACT_STATUS_TEXT[condition.status] }}
            </li>
          </ul>
        </details>
        <details v-if="provenance.evidenceAssessments.length > 0">
          <summary>How well this is documented</summary>
          <ul class="aci-list" role="list">
            <!-- Keyed by kind and subject because that pair is the assessment's
                 identity; only the subject's sentence is rendered, since it
                 already says whether it is what the vendor documents or what
                 this tool does about it. -->
            <li
              v-for="assessment in provenance.evidenceAssessments"
              :key="`${assessment.subjectKind}:${assessment.subjectId}`"
            >
              {{ REGISTRY_SUBJECT_TEXT[assessment.subjectId] }} —
              {{ DOCUMENTATION_STATUS_TEXT[assessment.documentationStatus] }}
              <!-- An empty qualifier list makes no stability claim, so nothing
                   is rendered for it rather than the word "stable". -->
              <template v-if="assessment.lifecycleQualifiers.length > 0">
                ({{
                  assessment.lifecycleQualifiers
                    .map((qualifier) => LIFECYCLE_QUALIFIER_TEXT[qualifier])
                    .join('; ')
                }})
              </template>
            </li>
          </ul>
        </details>
      </li>
    </ul>
  </div>
</template>
