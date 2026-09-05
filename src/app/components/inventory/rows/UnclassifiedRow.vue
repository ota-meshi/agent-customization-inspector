<script setup lang="ts">
// The row for a file that appears in no kind's inventory (T071, compressed by
// T1163): its bytes were never accepted, so nothing was recognized in it.
//
// It states the read outcome rather than hiding it. For an unreadable file that
// outcome plus its diagnostic is the entire finding, and dropping it would
// leave a `partial` generation unable to say which file made it partial
// (FR-028). There is no kind to name here — a kind's inventory would have
// listed the file if one had recognized it — but there is a Source, and where
// two are carried it is what tells one unreadable `AGENTS.override.md` from the
// other (FR-030): the family heading above the rows and the home badge on the
// row are the two halves of that, the same two every other kind's row uses.
//
// The outcome is the badge the row's diagnostic discloses, rather than a
// second statement beside one: the code's own label would otherwise say "could
// not be read" next to an outcome already saying it ({@link RowDiagnostics}).
//
// It stands beside the path rather than in the column a recognized file's marks
// take, which this row has none of. That column is sized to its content, so an
// explanation opened there would widen it and move every badge in the list; the
// path's column is the flexible one, where the sentence wraps in place — which
// is how every other kind's row discloses one.
import { computed } from 'vue';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
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
 * file.
 */
const pathText = computed(() => pathPresentationLabel(props.file.sourceRelativePath));
</script>

<template>
  <li class="aci-item">
    <!-- A row with no name of its own: the row is its file, so the file line
         starts where a name would have been. -->
    <div class="aci-row-file aci-row-file--only">
      <span class="aci-row-file__path">
        <!-- Which home the file came from, where its family holds more than
             one Source: the member's own name, never a path anything can open
             (FR-002, FR-030). -->
        <SourceHomeBadge :source-id="file.sourceId" />
        <!-- Inert text rather than a link: no kind lists this file, so there
             is no detail route addressed by kind and path to open (FR-030). -->
        <span class="aci-path aci-authored-text">{{ pathText }}</span>
        <RowDiagnostics
          :diagnostic-ids="file.diagnosticIds"
          :diagnostics="diagnostics"
          :label="readOutcome"
        />
      </span>
      <span class="aci-row-file__end" />
    </div>
  </li>
</template>
