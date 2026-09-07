<script setup lang="ts">
// The line of facts about the file a detail page opened (FR-007): what the
// read produced, which products recognize it, and the command that opens it.
// A reader deciding whether to trust what is below the line reads it first, so
// every kind states the same three in the same order and a reader who found
// them on one detail finds them on the next.
//
// No product is quoted for what it would decide: existence is what an
// admission proves (FR-009), so the marks say which products read the file and
// where they document reading it, never what any of them would do with it.
//
// What precedes them is the kind's own and arrives through the default slot —
// the range an instruction file applies to, the carrier a declaration was
// declared in — because those are facts about that kind rather than about the
// file every kind opened.
//
// `.aci-detail-attributes` itself is styled in the global sheet, because the
// comparison pages draw the same line with a subject of their own; what closes
// the line is styled here, because this is the only component that draws it
// (AGENTS.md § Stylesheet scope policy).
import RecognitionMarks from '../inventory/RecognitionMarks.vue';
import OpenFileButton from './OpenFileButton.vue';
import { FILE_ENCODING_TEXT, isReadableFile } from '../../../shared/entities';
import type { SourceSelector } from '../detail-route';
import type { CustomizationFileSummaryDto, FileRecognitionDto } from '../../../shared/api-types';

defineProps<{
  /**
   * The file this page opened, for its read outcome and its identity. The
   * summary projection, because nothing on this line reads authored source —
   * a detail's own file satisfies it too.
   */
  file: CustomizationFileSummaryDto;
  /**
   * The products that recognize the file and the surfaces they recognize it
   * on, restated from the inventory row so the page and the list agree
   * (FR-007). Already in the closed tool order, each one's surfaces in the
   * closed surface order.
   *
   * Omitted by a kind that states its recognizing products elsewhere on the
   * page — a skill lists the name each product invokes it by, which is more
   * than a mark can say, so a line of marks above it would answer the same
   * question twice.
   */
  recognitions?: readonly FileRecognitionDto[];
  /**
   * Which Source holds the file — the other half of its identity (FR-030) —
   * so the open control hands the host the file this page is showing.
   */
  source: SourceSelector;
  /**
   * Whether this line is where the read outcome is stated in full, which adds
   * the removed byte-order mark to the encoding and the size (FR-025).
   *
   * A kind that shows the file on a panel of its own states the mark there
   * instead, beside the text it was removed from, and this line then carries
   * the short summary alone: the mark is a fact about the decoding, and a page
   * that said it twice would read as two different readings of one file.
   */
  statesByteOrderMark?: boolean;
}>();
</script>

<template>
  <p class="aci-detail-attributes">
    <!-- Whatever this kind states about its own subject, ahead of the facts
         every kind states about the file. -->
    <slot />
    <span
      >{{ FILE_ENCODING_TEXT[file.encoding]
      }}<template v-if="file.encoding !== 'unknown'"> · {{ file.sizeBytes }} bytes</template
      ><template v-if="statesByteOrderMark && isReadableFile(file) && file.hadLeadingBom">
        · byte-order mark removed before decoding</template
      ></span
    >
    <RecognitionMarks v-if="recognitions !== undefined" :recognitions="recognitions" named />
    <!-- Outside the heading so it does not join the heading's accessible
         name: a reader hearing the page's landmarks should hear the file,
         not an action on it (WCAG 2.4.6). -->
    <span class="aci-detail-attributes__end">
      <OpenFileButton :source-relative-path="file.sourceRelativePath" :source="source" />
    </span>
  </p>
</template>

<style scoped>
/* Whatever closes the line — the command that opens the file in an editor. */
.aci-detail-attributes__end {
  margin-inline-start: auto;
}
</style>
