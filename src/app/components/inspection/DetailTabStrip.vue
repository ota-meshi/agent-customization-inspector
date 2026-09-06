<script setup lang="ts" generic="Tab extends string">
// The strip itself: one real `tablist`, because assistive technology has to
// announce "tab 1 of 2, selected" for it to be usable at all (QR-004,
// contracts/accessibility-acceptance.md) — which obliges the roving tabindex
// and arrow keys the WAI-ARIA tabs pattern specifies.
//
// What each tab says is the caller's, through the slot: the kind's own caption
// table, and the count a tab over a list carries.
import type { DetailTabs } from '../../composables/detail-tabs';

defineProps<{
  /** The strip's state and moves (`detail-tabs.ts` § DetailTabs). */
  tabs: DetailTabs<Tab>;
  /** What the strip is a strip of, for assistive technology (WCAG 2.4.6). */
  label: string;
}>();
</script>

<template>
  <div class="aci-kind-tabs" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs.tabs"
      :id="tabs.tabId(tab)"
      :key="tab"
      class="aci-kind-tab"
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
