<script setup lang="ts">
// Where a detail page sits, which is location rather than a way out: the
// Source family the file came from (FR-007 "show its source"), the kind whose
// list the page belongs to, and the page's own subject.
//
// The subject is a slot because it is not one thing across the kinds. Most
// pages are headed by a path and draw it here; a page whose URL selects a
// declared name inside a carrier — a hook event, an MCP server, a plugin —
// names that instead, and falls back to the path until the name resolves,
// which is what the slot's own fallback content expresses.
//
// The trail ends at the kind where the subject draws nothing, and no kind is
// exempt: every one of them takes its path from the same address, which is
// empty whenever the leading segment names no Source (`detail-address.ts`
// § DetailAddress.openPath). Whether the subject drew anything is settled in
// the style below, because it is the one thing this component cannot ask: it
// holds a slot, and a slot forwarded unconditionally is one every wrapper
// between here and the page reports as passed, so slot presence answers about
// the nearest wrapper rather than about the page.
//
// The trail's own look — `.aci-detail-crumbs` and the subject's colour — is in
// the global sheet instead, because the comparison pages draw the same trail
// with a subject of their own (AGENTS.md § Stylesheet scope policy: a rule
// whose subject more than one component renders belongs to the sheet). What
// stays here is what only this component renders: the separator, and the
// subject it draws where the page names none.
defineProps<{
  /**
   * The family of place the open file came from, leading the trail, or null
   * while the Source is not in the snapshot (`source-facts.ts`).
   */
  sourceFamilyCrumbText: string | null;
  /** The kind's own caption, whose list this page belongs to. */
  kindText: string;
  /**
   * The open path as the page draws it (`detail-address.ts`
   * § usePathPresentation) — the subject wherever no name is resolved, and
   * empty where the address resolves nothing.
   */
  pathText: string;
}>();
</script>

<template>
  <p class="aci-detail-crumbs">
    <template v-if="sourceFamilyCrumbText !== null"
      >{{ sourceFamilyCrumbText }} <span class="aci-detail-crumbs__separator">›</span> </template
    >{{ kindText }}
    <span class="aci-detail-crumbs__separator">›</span>
    <slot name="subject"
      ><span class="aci-detail-crumbs__subject aci-path">{{ pathText }}</span></slot
    >
  </p>
</template>

<style scoped>
/* The last step goes when its subject draws nothing, which is the state an
   address that names no Source leaves every kind in: the fallback above draws
   the path, and there is no path. A separator with nothing after it reads as a
   step that failed to draw rather than as a trail that ends at the kind, and
   the page below already states that the link is not in this scan — a trail
   that looks broken tells a reader nothing the page has not said. Both go, so
   the flex gap that would hold their places goes with them.

   Written as a style rather than as a condition on the markup because what
   settles it is what the subject drew, which is the one thing this component
   cannot ask: it holds a slot, and a slot forwarded unconditionally is one
   every wrapper between here and the page reports as passed.

   Scoping is what keeps the question about the page's own subject. The subject
   the second rule hides is the fallback written in the template above, which
   only this component renders, so a subject the page passed is never matched
   however it is drawn — and the first rule's `:has()` argument is left
   unscoped, so the separator answers to that subject wherever it came from. */
.aci-detail-crumbs__separator:has(+ .aci-detail-crumbs__subject:empty),
.aci-detail-crumbs__subject:empty {
  display: none;
}
</style>
