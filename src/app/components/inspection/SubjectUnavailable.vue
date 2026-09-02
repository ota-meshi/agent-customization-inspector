<script setup lang="ts">
// What a routed surface says when it cannot show the subject its URL names
// (FR-030). Two things reach it, and to the reader they are one: a
// request that failed, and a link whose path the current scan has nothing at.
// Either way the answer is that this URL shows nothing, and what differs is
// only the way on — a retry for the first, the inventory for the second.
//
// So both are drawn the same, in the box a stated outcome sits in
// (`main.css` § .aci-notices) with a leading edge in the colour of what
// happened. The edge is an aid: the message states the outcome in words, and
// no surface spells a severity — the reader is told what happened, not how the
// registry rates it (WCAG 1.4.1).
//
// The copy is the caller's, because the sentence belongs to the surface that
// knows what it was trying to show — a rule file, a skill, one carrier's
// declaration (AGENTS.md § User-visible copy policy).
defineProps<{
  /**
   * What happened, which decides the leading edge's colour. `error` is this
   * side's own failure — a request that did not complete. `warning` is a
   * correct observation the reader did not want: the scan holds nothing at
   * this path.
   */
  outcome: 'error' | 'warning';
}>();
</script>

<template>
  <div class="aci-notices">
    <div class="aci-subject-unavailable">
      <span
        class="aci-subject-unavailable__edge"
        :class="`aci-subject-unavailable__edge--${outcome}`"
        aria-hidden="true"
      />
      <div class="aci-subject-unavailable__body">
        <p class="aci-subject-unavailable__message"><slot /></p>
        <!-- The way on, where there is one. A failed request has a retry and a
             dead link has the inventory; nothing else is offered, because
             nothing else would change the outcome. -->
        <p v-if="$slots.exit" class="aci-subject-unavailable__exit"><slot name="exit" /></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aci-subject-unavailable {
  display: flex;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
}

/* The leading edge, drawn as its own element rather than as a border on the
   row: it stands inside the box's rounded corners, where a row border would
   meet them. */
.aci-subject-unavailable__edge {
  border-radius: 0.125rem;
  flex: 0 0 3px;
}

.aci-subject-unavailable__edge--error {
  background: var(--aci-danger);
}

.aci-subject-unavailable__edge--warning {
  background: var(--aci-warn);
}

/* `min-inline-size` because a message can carry an authored path with no break
   opportunities, and a flex item takes every pixel such a value asks for. */
.aci-subject-unavailable__body {
  min-inline-size: 0;
}

.aci-subject-unavailable__message {
  margin: 0;
  max-inline-size: var(--aci-measure);
  overflow-wrap: anywhere;
}

/* A row, because a comparison offers both exits at once: a retry for the
   request that failed and the inventory for the pair it can no longer find. */
.aci-subject-unavailable__exit {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.5625rem 0 0;
}
</style>
