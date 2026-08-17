<script setup lang="ts">
// One declared value as the text a row shows for it (FR-025).
//
// Its own component because a mapping entry and a list item are different
// markup — a `dd` of a description list and a `span` inside an `li` — while the
// value inside them is the same decision every time. Written twice, the two
// copies would answer "what does an empty mapping look like" separately.
//
// Every value is rendered through a Vue text binding. Nothing here is markup, a
// link, or a URI, and no value is masked, shortened, or reflowed into something
// the file does not contain (FR-025, FR-033).
import { encodeRootPresentation, rendersNothingVisible } from '../../../shared/entities';
import type { FrontmatterValueDto } from '../../../shared/api-types';

defineProps<{
  /** The value this row declares; never one that opens a block of its own. */
  value: FrontmatterValueDto;
}>();
</script>

<template>
  <!-- A value that draws nothing would render as blank, which reads as a value
       that was not shown at all, so each case says which nothing it is: an
       empty mapping and an empty string are different declarations. -->
  <span v-if="value.kind === 'absent'" class="aci-muted">(no value)</span>
  <span v-else-if="value.kind === 'sequence'" class="aci-muted">(empty list)</span>
  <span v-else-if="value.kind === 'mapping'" class="aci-muted">(empty mapping)</span>
  <span v-else-if="value.text === ''" class="aci-muted">(empty text)</span>
  <!-- Text made only of characters that draw nothing is still rendered, and the
       note is added beside it rather than put in its place: one space and two
       spaces are different declarations, and a surface that showed the same
       words for both would report a value it publishes as something shorter
       (FR-025). The note carries the spelled-out form, because a flat
       reading collapses whitespace and would read the two declarations as
       one. The span hugs its binding because it renders authored
       whitespace, and it is atomic because it sits beside the product's note
       (see `.aci-authored-atomic`). -->
  <template v-else-if="rendersNothingVisible(value.text)"
    ><span class="aci-authored-text aci-authored-atomic">{{ value.text }}</span>
    <span class="aci-muted"
      >(no visible characters: {{ encodeRootPresentation(value.text) }})</span
    ></template
  >
  <!-- Atomic too: in a sequence this span shares its line with the product's
       list marker. An authored text that happens to spell one of the notes
       above stays as authored — the muted styling is what tells a note from
       authored text, because matching this product's own copy against
       authored text would turn display wording into load-bearing syntax,
       and the complete source beside every surface keeps the exact
       spelling (FR-025). -->
  <span v-else class="aci-authored-text aci-authored-atomic">{{ value.text }}</span>
</template>
