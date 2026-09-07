<script setup lang="ts">
// What a detail page's heading names: the row's own identity, in the same
// spelling the inventory lists — escaped for presentation, never a locator
// anything can open (FR-024, FR-030). A path whose escaped spelling draws
// nothing is spelled out in full instead — a spelled presentation, not the
// authored run, so it drops the authored-text treatment (data-model.md
// § SourceRelativePath) — and a URL with no path segments at all is headed by
// the kind, so the heading always describes the page (WCAG 2.4.6).
//
// A kind whose subject is a declared name inside a carrier — a hook event, an
// MCP server — passes that name through the slot, and the path below stands
// wherever the name has not resolved. The slot is not consulted for the
// pathless URL above: a heading with no path to draw has no declaration to
// name either, so the kind leads whatever the caller would have passed.
defineProps<{
  /** The kind's own caption, which heads a URL that names no path. */
  kindText: string;
  /**
   * The path as the heading draws it (`detail-address.ts`
   * § PathPresentation.pathText). Empty exactly when the address names no
   * path: every non-empty path draws at least one character, because the
   * spelled-out form stands in wherever the escaped spelling would draw
   * nothing (`entities.ts` § pathPresentationLabel).
   */
  pathText: string;
  /**
   * Whether {@link pathText} is this product's spelling rather than the
   * file's, which drops the authored-text treatment
   * (`detail-address.ts` § PathPresentation.pathIsSpelledOut).
   */
  pathIsSpelledOut: boolean;
}>();
</script>

<template>
  <template v-if="pathText === ''">{{ kindText }}</template>
  <slot v-else name="name"
    ><span class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{
      pathText
    }}</span></slot
  >
</template>
