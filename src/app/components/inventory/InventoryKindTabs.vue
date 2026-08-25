<script setup lang="ts">
// The customization-kind rail (T071). Kind is navigation, not a filter: each
// kind is presented differently, so exactly one is ever in view and there is
// no "all kinds" tab to fall back to.
//
// Only kinds the committed generation actually recognizes get a tab. Showing
// the whole closed catalog would advertise kinds this release cannot recognize
// yet and turn the rail into a second, silently drifting copy of the shipped
// rule catalog.
//
// The kinds run down a column rather than across a strip, because the closed
// catalog is longer than one line at the widths this page is read at: as a row
// it wrapped into stacked part-rows, and the tab that joins the panel can only
// be drawn from the row the panel's rule runs along. A column has one tab per
// line at any width and no name is ever pushed out of sight, which a
// horizontally scrolled strip cannot promise.
//
// One column at every width, including the one-column page layout where the
// rail sits above the rows and is wide enough to tile them. Tiling would put
// two kinds on one line, and this strip's arrow keys and `aria-orientation`
// both say vertical: `ArrowDown` would move to what the reader sees as the
// right-hand neighbour and `ArrowRight` would do nothing. Which arrow moves
// where is the tab pattern's promise (QR-004), so the layout follows the
// keyboard rather than the other way round.
//
// This is a real `tablist` rather than a row of buttons, because assistive
// technology has to announce "tab 2 of 5, selected" for the strip to be usable
// at all (QR-004, contracts/accessibility-acceptance.md). That obliges the
// roving-tabindex and arrow-key behavior the WAI-ARIA tabs pattern specifies:
// one stop in the page tab order, arrows to move between tabs, Home/End to the
// ends. The column declares `aria-orientation="vertical"`, so the arrows that
// step it are the vertical pair the pattern names for that orientation.
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
  const next = nextTabForKey(event.key, props.kinds, index, 'vertical');
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior: swallowing
    // it here would break Tab out of the rail.
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
  <div
    v-if="kinds.length > 0"
    class="aci-inventory-kind-tabs"
    role="tablist"
    aria-orientation="vertical"
    aria-label="Customization kind"
  >
    <button
      v-for="(candidate, index) in kinds"
      :id="tabId(candidate)"
      :key="candidate"
      class="aci-inventory-kind-tabs__tab"
      type="button"
      role="tab"
      :aria-controls="candidate === activeKind ? panelIdFor(candidate) : undefined"
      :aria-selected="candidate === activeKind"
      :tabindex="candidate === activeKind ? 0 : -1"
      @click="emit('select', candidate)"
      @keydown="onKeydown($event, index)"
    >
      {{ CUSTOMIZATION_KIND_TEXT[candidate] }}
      <span class="aci-inventory-kind-tabs__count">{{ counts.get(candidate) ?? 0 }}</span>
    </button>
  </div>
</template>

<style scoped>
/* Colors come from the same system-color tokens as the rest of the shell, so
   the rail follows the OS light/dark scheme instead of pinning one palette.
   The selected tab is marked by weight and a border as well as color, so it
   survives a monochrome or forced-colors rendering (WCAG 2.2 AA, QR-004).

   The rail's own rule is the edge the rows begin at, and the selected tab
   covers it — the vertical spelling of what a tab strip does along its bottom
   border. */
.aci-inventory-kind-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-inline-end: 1px solid var(--aci-border);
}

.aci-inventory-kind-tabs__tab {
  background: none;
  border: 1px solid transparent;
  border-inline-end: none;
  border-radius: 0.25rem 0 0 0.25rem;
  color: var(--aci-muted);
  cursor: pointer;
  /* The label leads and the count closes the line, so the counts form a column
     of their own that a reader can compare down. */
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  font: inherit;
  padding: 0.4rem 0.6rem;
  text-align: start;
}

.aci-inventory-kind-tabs__tab:hover {
  color: var(--aci-text);
}

.aci-inventory-kind-tabs__tab[aria-selected='true'] {
  background: var(--aci-surface);
  border-color: var(--aci-border);
  color: var(--aci-text);
  font-weight: 600;
  /* Covers the rail's own rule so the selected tab joins the rows beside it. */
  margin-inline-end: -1px;
}

.aci-inventory-kind-tabs__tab:focus-visible {
  outline: 2px solid var(--aci-accent);
  outline-offset: -2px;
}

.aci-inventory-kind-tabs__count {
  color: var(--aci-muted);
  font-variant-numeric: tabular-nums;
}

.aci-inventory-kind-tabs__tab[aria-selected='true'] .aci-inventory-kind-tabs__count {
  color: inherit;
}
</style>
