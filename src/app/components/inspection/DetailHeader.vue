<script setup lang="ts">
// What every customization detail route opens with: the way back and the rows
// either side of this one, the trail saying where the page sits, and the
// heading naming its subject.
//
// One component rather than three calls per page, because the three are one
// arrangement: the kind's own caption names the list the way back leads to,
// heads the trail, and stands in the heading wherever the address names no
// path, so a page spelling them separately can spell them differently.
//
// It declares the heading, so it is what asks for it (`useTemplateRef`) and
// what publishes it. A route's own focus lands there
// (`detail-heading-focus.ts`), and that focus is wired by the page rather than
// here: the page's request holds it too, and a request is built before this
// component renders.
import { useTemplateRef } from 'vue';
import DetailCrumbs from './DetailCrumbs.vue';
import DetailHeadingSubject from './DetailHeadingSubject.vue';
import DetailNavigation from './DetailNavigation.vue';
import type { DetailNeighbour } from '../detail-route';

defineProps<{
  /** The kind's own caption: the list's name, the trail's step, and the heading of a pathless address. */
  kindText: string;
  /** Where the list this page was opened from is, with the kind still selected. */
  listRoute: string;
  /** The rows either side of this one in that list's order. */
  neighbours: { readonly previous: DetailNeighbour | null; readonly next: DetailNeighbour | null };
  /**
   * The family of place the open file came from, leading the trail, or null
   * while the Source is not in the snapshot (`source-facts.ts`).
   */
  sourceFamilyCrumbText: string | null;
  /** The open path as the page draws it (`detail-address.ts` § PathPresentation). */
  pathText: string;
  /** Whether {@link pathText} is this product's spelling rather than the file's. */
  pathIsSpelledOut: boolean;
  /** What a screen reader announces the heading as (WCAG 2.4.6). */
  accessibleText: string;
}>();

defineSlots<{
  /** What the trail's last step names, where the page names it (`DetailCrumbs.vue`). */
  'trail-subject'?(): unknown;
  /** What the heading names, where the page names it (`DetailHeadingSubject.vue`). */
  'heading-name'?(): unknown;
  /** What closes the heading's own line, after the subject it names. */
  'title-end'?(): unknown;
}>();

/** The heading, declared here and reached only through the two calls below. */
const heading = useTemplateRef<HTMLHeadingElement>('heading');

/**
 * Moves focus onto the heading, which is where a route's own focus lands
 * (`detail-heading-focus.ts` § DetailHeadingControls).
 */
function focusHeading(): void {
  heading.value?.focus();
}

/**
 * Whether focus is already on the heading. A move that repeated it would
 * announce the heading a second time for a page that did not change.
 */
function headingHasFocus(): boolean {
  return document.activeElement === heading.value;
}

defineExpose({ focusHeading, headingHasFocus });
</script>

<template>
  <DetailNavigation
    :list-route="listRoute"
    :list-text="kindText"
    :previous="neighbours.previous"
    :next="neighbours.next"
  />

  <DetailCrumbs
    :source-family-crumb-text="sourceFamilyCrumbText"
    :kind-text="kindText"
    :path-text="pathText"
  >
    <template #subject><slot name="trail-subject" /></template>
  </DetailCrumbs>

  <div class="aci-detail-header__line">
    <h2 ref="heading" tabindex="-1" class="aci-detail-header__title" :aria-label="accessibleText">
      <DetailHeadingSubject
        :kind-text="kindText"
        :path-text="pathText"
        :path-is-spelled-out="pathIsSpelledOut"
      >
        <template #name><slot name="heading-name" /></template>
      </DetailHeadingSubject>
    </h2>
    <slot name="title-end" />
  </div>
</template>

<style scoped>
/* The heading's own line: the subject, and whatever closes it. It wraps rather
   than pushing the page past the WCAG reference width of 320 CSS pixels, and
   the row gap is what keeps a dropped link off the heading's underside
   (WCAG 1.4.10). What closes the line is the caller's, so its own rule stays
   in the sheet (`main.css` § .aci-detail-title-end): the callers render it
   into this line's slot, and slotted markup carries the caller's scope rather
   than this component's, where a rule written here would not reach it. */
.aci-detail-header__line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin-block-end: 0.5rem;
}

/* The subject the page leads with — what the page is showing, which FR-007
   fixes as the customization rather than the file carrying it — and where
   focus lands on arrival (`router.options.ts`). Its width is the shell's
   focusable-heading rule's (`main.css`). The authored name or path it carries
   may have no break opportunities of its own, and without the wrap a long one
   forces sideways scrolling at narrow widths and 200% zoom (WCAG 1.4.10). */
.aci-detail-header__title {
  font-size: 1.0625rem;
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}
</style>
