<script setup lang="ts" generic="Tab extends string">
// One half of a subject view, shown while its tab is the current one.
//
// Both panels stay in the document and the unselected one is hidden rather
// than removed, so the source box keeps its text and the reader keeps their scroll
// position across a switch. Every tab therefore names its panel and every
// panel names its tab: both IDREFs resolve, and omitting one would drop a
// relationship assistive technology uses to move between them.
//
// The two `id`s come from the same strip the tab's do (`subject-tabs.ts`
// § SubjectTabs), which is what keeps `aria-controls` and `aria-labelledby`
// pointing at each other rather than at two spellings of one name.
//
// It takes focus of its own (`tabindex="0"`), because a panel a reader
// arrives at by Tab has to be reachable when nothing inside it is
// (WAI-ARIA tabs pattern, QR-004).
//
// `standalone` is for the subject that turns out to have no sibling: a skill
// that is one file has no directory, so its detail shows the skill alone and
// draws no strip (spec.md § FR-004). The tab semantics have to go with the
// strip rather than merely be hidden — a `tabpanel` whose `aria-labelledby`
// names a tab that was never rendered is a dangling IDREF, and a panel is a
// `tabpanel` only while a `tablist` controls it. What is left is an ordinary
// region holding the same content.
import type { SubjectTabs } from '../../composables/subject-tabs';

defineProps<{
  /** The strip this panel belongs to (`subject-tabs.ts` § SubjectTabs). */
  tabs: SubjectTabs<Tab>;
  /** Which tab shows this panel. */
  tab: Tab;
  /**
   * Render a plain region instead of a `tabpanel`, for a subject whose strip
   * was not drawn because it has no sibling; see the module comment.
   */
  standalone?: boolean;
}>();
</script>

<template>
  <div v-if="standalone">
    <slot />
  </div>
  <div
    v-else
    v-show="tabs.activeTab === tab"
    :id="tabs.panelId(tab)"
    role="tabpanel"
    :aria-labelledby="tabs.tabId(tab)"
    tabindex="0"
  >
    <slot />
  </div>
</template>
