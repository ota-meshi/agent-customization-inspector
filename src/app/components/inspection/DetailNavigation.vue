<script setup lang="ts">
// A detail page's own moves, rendered in the bar (T1168, FR-007).
//
// Three moves: back to the list this page was opened from, and the rows either
// side of the open one. They are the page's, because only the page knows which
// list it came from and which rows neighbour it ({@link detailNeighbours});
// they are drawn in the bar, because that is where every route's moves are and
// a reader looking for the way out looks in one place whatever page they are
// on.
//
// Teleported rather than passed up through shared state: the bar renders
// before the routed page, so the target exists by the time this mounts, and
// Vue removes the content again when the page unmounts. State the page wrote
// into the shell would have to be cleared on every route change instead, and a
// page that forgot would leave another page's moves in the bar.
//
// The moves are links rather than buttons: each one goes to an address a
// reader can keep, and a control that navigates is a link (WCAG 4.1.2).
import { NuxtLink } from '#components';
import PreviousIcon from '~icons/lucide/arrow-up';
import NextIcon from '~icons/lucide/arrow-down';
import BackIcon from '~icons/lucide/arrow-left';
import type { DetailNeighbour } from '../detail-route';

defineProps<{
  /** Where the list this page was opened from is, with the kind still selected. */
  listRoute: string;
  /** What that list is called, so the move says which list it goes back to. */
  listText: string;
  /** The row before this one in the list's order, or null at the start. */
  previous: DetailNeighbour | null;
  /** The row after this one, or null at the end. */
  next: DetailNeighbour | null;
}>();
</script>

<template>
  <Teleport to="#aci-app-bar-moves">
    <NuxtLink :to="listRoute" class="aci-detail-navigation__move">
      <BackIcon aria-hidden="true" />
      Back to {{ listText }}
    </NuxtLink>
    <!-- Each neighbour is named by its own subject, which is what the move is
         offering to open. The direction is drawn as an arrow and said in the
         accessible name, because an arrow beside a name states no direction to
         a reader who is not looking at it (WCAG 1.1.1). -->
    <NuxtLink
      v-if="previous"
      :to="previous.route"
      class="aci-detail-navigation__move"
      :aria-label="`Previous in ${listText}: ${previous.accessibleLabel}`"
    >
      <PreviousIcon aria-hidden="true" />
      <span class="aci-detail-navigation__label">{{ previous.label }}</span>
    </NuxtLink>
    <NuxtLink
      v-if="next"
      :to="next.route"
      class="aci-detail-navigation__move"
      :aria-label="`Next in ${listText}: ${next.accessibleLabel}`"
    >
      <NextIcon aria-hidden="true" />
      <span class="aci-detail-navigation__label">{{ next.label }}</span>
    </NuxtLink>
  </Teleport>
</template>

<style scoped>
/* Drawn as the bar's other commands are, so the row reads as one set of
   controls rather than as links dropped among buttons. */
.aci-detail-navigation__move {
  align-items: center;
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  color: var(--aci-text);
  display: inline-flex;
  font-size: 0.75rem;
  gap: 0.3125rem;
  max-inline-size: 14rem;
  padding: 0.25rem 0.6875rem;
  text-decoration: none;
  white-space: nowrap;
}

.aci-detail-navigation__move:hover {
  background: var(--aci-surface-sunken);
}

/* A neighbour is named by an authored subject, which has no length this bar
   can rely on: it is truncated rather than allowed to push the bar's own
   controls off the row. The accessible name above carries it whole. */
.aci-detail-navigation__label {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
