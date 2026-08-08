<script setup lang="ts">
// The customization-kind tab strip (T071). Kind is navigation, not a filter:
// each kind is presented differently, so exactly one is ever in view and there
// is no "all kinds" tab to fall back to.
//
// Only kinds the committed generation actually recognizes get a tab. Showing
// the whole closed catalog would advertise kinds this release cannot recognize
// yet and turn the strip into a second, silently drifting copy of the shipped
// rule catalog.
//
// This is a real `tablist` rather than a row of buttons, because assistive
// technology has to announce "tab 2 of 5, selected" for the strip to be usable
// at all (QR-004, contracts/accessibility-acceptance.md). That obliges the
// roving-tabindex and arrow-key behavior the WAI-ARIA tabs pattern specifies:
// one stop in the page tab order, arrows to move between tabs, Home/End to the
// ends.
import { CUSTOMIZATION_KIND_TEXT, type CustomizationKind } from '../../../shared/entities';
import { nextTabForKey } from '../tab-navigation';
import { inventoryPanelId, inventoryTabId } from './panel-ids';

const props = defineProps<{
  /** The kinds the current inventory recognizes, in the closed kind order. */
  kinds: readonly CustomizationKind[];
  /** The kind in view; null only while the inventory recognizes none. */
  activeKind: CustomizationKind | null;
  /** How many rows each tab would show, with every other filter applied. */
  counts: ReadonlyMap<CustomizationKind, number>;
}>();

const emit = defineEmits<{
  /** The user selected a kind tab. */
  select: [kind: CustomizationKind];
}>();

// Only the selected kind's panel is rendered, which the ARIA tabs pattern
// allows. `aria-controls` is therefore set on the selected tab alone: an IDREF
// naming an element that is not in the document is a broken reference, not an
// absent one, and pointing an unselected tab at the panel that does exist
// would claim it controls another kind's rows.
const tabId = inventoryTabId;
const panelIdFor = inventoryPanelId;

// Arrow keys move selection, matching the WAI-ARIA tabs pattern. Selection
// follows focus here because switching tabs only re-renders committed rows: it
// issues no request and cannot lose the user's work, so the extra Enter the
// manual-activation variant requires would be friction with nothing behind it.
function onKeydown(event: KeyboardEvent, index: number): void {
  const next = nextTabForKey(event.key, props.kinds, index);
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior: swallowing
    // it here would break Tab out of the strip.
    return;
  }
  event.preventDefault();
  emit('select', next);
  const element = document.getElementById(tabId(next));
  if (element !== null) {
    element.focus();
  }
}
</script>

<template>
  <div v-if="kinds.length > 0" class="aci-kind-tabs" role="tablist" aria-label="Customization kind">
    <button
      v-for="(candidate, index) in kinds"
      :id="tabId(candidate)"
      :key="candidate"
      class="aci-kind-tab"
      type="button"
      role="tab"
      :aria-controls="candidate === activeKind ? panelIdFor(candidate) : undefined"
      :aria-selected="candidate === activeKind"
      :tabindex="candidate === activeKind ? 0 : -1"
      @click="emit('select', candidate)"
      @keydown="onKeydown($event, index)"
    >
      {{ CUSTOMIZATION_KIND_TEXT[candidate] }}
      <span class="aci-kind-count">{{ counts.get(candidate) ?? 0 }}</span>
    </button>
  </div>
</template>
