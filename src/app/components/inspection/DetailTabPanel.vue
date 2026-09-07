<script setup lang="ts" generic="Tab extends string">
// One half of a detail page, shown while its tab is the current one.
//
// Both panels stay in the document and the unselected one is hidden rather
// than removed, so Monaco keeps its model and the reader keeps their scroll
// position across a switch. Every tab therefore names its panel and every
// panel names its tab: both IDREFs resolve, and omitting one would drop a
// relationship assistive technology uses to move between them.
//
// The two `id`s come from the same strip the tab's do (`detail-tabs.ts`
// § DetailTabs), which is what keeps `aria-controls` and `aria-labelledby`
// pointing at each other rather than at two spellings of one name.
//
// It takes focus of its own (`tabindex="0"`), because a panel a reader
// arrives at by Tab has to be reachable when nothing inside it is
// (WAI-ARIA tabs pattern, QR-004).
import type { DetailTabs } from '../../composables/detail-tabs';

defineProps<{
  /** The strip this panel belongs to (`detail-tabs.ts` § DetailTabs). */
  tabs: DetailTabs<Tab>;
  /** Which tab shows this panel. */
  tab: Tab;
}>();
</script>

<template>
  <div
    v-show="tabs.activeTab === tab"
    :id="tabs.panelId(tab)"
    role="tabpanel"
    :aria-labelledby="tabs.tabId(tab)"
    tabindex="0"
  >
    <slot />
  </div>
</template>
