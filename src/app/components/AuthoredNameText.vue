<script setup lang="ts">
// Where a name goes when the file declared none (FR-025, WCAG 1.4.1).
//
// A carrier can declare both `""` and a name spelling this product's own
// words for it, and those two rows drew the same characters and announced the
// same characters — the only difference reaching the screen was a colour, and
// a difference carried by colour alone is not a difference. The distinction
// itself already existed; what it lacked was a shape.
//
// So the undeclared name is drawn in this product's shape for its own words —
// the badge a carrier kind carries, which a reader has already met on other
// rows (`main.css` § .aci-carrier-kind). No string can do this instead:
// whatever words the badge holds, a file may declare a name spelling them
// (FR-025).
//
// It renders the badge and nothing else, passing every declared name back to
// the caller. Each surface already styles a declared name its own way — a row
// mutes a spelled-out one, a crumb does not — and unifying that here would
// change what those surfaces draw for names that are not this case.
import { EMPTY_NAME_BADGE_TEXT } from './authored-name';
import type { AuthoredName } from './authored-name';

defineProps<{
  /** The name this position holds, declared or not. */
  name: AuthoredName;
}>();

defineSlots<{
  /** How the caller draws this name when the file did declare one. */
  default(): unknown;
}>();
</script>

<template>
  <span v-if="name.isEmpty" class="aci-carrier-kind">{{ EMPTY_NAME_BADGE_TEXT }}</span>
  <slot v-else />
</template>
