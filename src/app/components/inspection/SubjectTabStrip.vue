<script setup lang="ts" generic="Tab extends string">
// The strip itself: one real `tablist`, because assistive technology has to
// announce "tab 1 of 2, selected" for it to be usable at all (QR-004,
// contracts/accessibility-acceptance.md) — which obliges the roving tabindex
// and arrow keys the WAI-ARIA tabs pattern specifies.
//
// What each tab says is the caller's, through the slot: the kind's own caption
// table, and the count a tab over a list carries.
import type { SubjectTabs } from '../../composables/subject-tabs';

defineProps<{
  /** The strip's state and moves (`subject-tabs.ts` § SubjectTabs). */
  tabs: SubjectTabs<Tab>;
  /** What the strip is a strip of, for assistive technology (WCAG 2.4.6). */
  label: string;
}>();
</script>

<template>
  <div class="aci-subject-tab-strip" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs.tabs"
      :id="tabs.tabId(tab)"
      :key="tab"
      class="aci-subject-tab-strip__tab"
      type="button"
      role="tab"
      :aria-controls="tabs.panelId(tab)"
      :aria-selected="tab === tabs.activeTab"
      :tabindex="tab === tabs.activeTab ? 0 : -1"
      @click="tabs.select(tab)"
      @keydown="tabs.onKeydown($event, index)"
    >
      <slot name="tab" :tab="tab" />
    </button>
  </div>
</template>

<style scoped>
/* The two or three halves of one subject, shown one at a time.
   Colors come from the same system-color tokens as the rest of the shell, so
   the strip follows the OS light/dark scheme instead of pinning one palette.
   The selected tab is marked by weight and a border as well as color, so it
   survives a monochrome or forced-colors rendering (WCAG 2.2 AA, QR-004).

   A surface's tabs are a fixed handful named by its own module, so the strip
   is a row that fits. The inventory's entries are not: that list is the
   closed customization catalog plus the one list that belongs to no kind,
   which outgrew a row and is a rail of its own (`InventoryRail.vue`). */
/* The edge the tabs sit on. */
.aci-subject-tab-strip {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid var(--aci-line);
  margin: 0.875rem 0 0.625rem;
}

/* Underlined rather than outlined: the strip's own rule is the line these sit
   on, and a tab that draws its own box on three sides makes the row read as a
   set of buttons above a panel instead of one edge with a marker on it. What
   marks the selected one is a segment of that edge in the accent, drawn thicker
   so it survives a forced-colors rendering where the accent does not
   (WCAG 1.4.11). */
.aci-subject-tab-strip__tab {
  background: none;
  border: 0;
  border-block-end: 2px solid transparent;
  border-radius: 0;
  color: var(--aci-muted);
  cursor: pointer;
  font: inherit;
  /* Covers the strip's own bottom border, so the marker sits on that edge
     rather than above it. */
  margin-block-end: -1px;
  padding: 0.3125rem 0.625rem;
}

.aci-subject-tab-strip__tab:hover {
  color: var(--aci-text);
}

.aci-subject-tab-strip__tab[aria-selected='true'] {
  border-block-end-color: var(--aci-accent);
  color: var(--aci-text);
  font-weight: 600;
}

.aci-subject-tab-strip__tab:focus-visible {
  outline: 2px solid var(--aci-accent);
  outline-offset: -2px;
}
</style>
