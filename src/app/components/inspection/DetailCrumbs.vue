<script setup lang="ts">
// Where a detail page sits, which is location rather than a way out: the
// Source family the file came from (FR-007 "show its source"), the kind whose
// list the page belongs to, and the page's own subject.
//
// The subject is a slot because it is not one thing across the kinds. Most
// pages are headed by a path and draw it here; a page whose URL selects a
// declared name inside a carrier — a hook event, an MCP server, a plugin —
// names that instead, and falls back to the path until the name resolves,
// which is what a `v-if` on the slot template expresses: with no slot the
// path below stands.
//
// A kind whose subject resolves separately from its address asks for the
// separator to stand with it ({@link
// DetailCrumbsProps.omitsUnresolvedSubject}). The condition asks whether a
// slot was passed rather than what it drew, because a slot that renders only
// a false `v-if` falls back to the content below (`runtime-core`
// § renderSlot), so an empty subject cannot be expressed by the caller.
//
// `.aci-detail-crumbs` and its subject are styled in the global sheet rather
// than here, because the comparison pages draw the same trail with a subject
// of their own (AGENTS.md § Stylesheet scope policy: a rule whose subject
// more than one component renders belongs to the sheet).
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
  /**
   * Whether an unresolved subject ends the trail at the kind, taking the
   * separator with it. Passed by a kind whose subject is not the path its
   * address names — a skill's directory resolves through the inventory row,
   * so a link this scan holds nothing at has no third step, and a separator
   * with nothing after it reads as a step that failed to render. Omitted, the
   * trail always draws both, which is what a kind addressed by its own file
   * does: its subject is the path, so it is there whenever the page is.
   */
  omitsUnresolvedSubject?: boolean;
}>();
</script>

<template>
  <p class="aci-detail-crumbs">
    <template v-if="sourceFamilyCrumbText !== null"
      >{{ sourceFamilyCrumbText }} <span>›</span> </template
    >{{ kindText }}
    <template v-if="!omitsUnresolvedSubject || $slots.subject !== undefined || pathText !== ''"
      ><span>›</span>
      <slot name="subject"
        ><span class="aci-detail-crumbs__subject aci-path">{{ pathText }}</span></slot
      ></template
    >
  </p>
</template>
