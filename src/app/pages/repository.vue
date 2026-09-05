<script setup lang="ts">
// The Repository Source's own state surface (T1150, FR-002, FR-030).
//
// A route rather than a panel over the inventory. A selected root, a Source
// status, a committed generation, and this Source's own rescan are facts about
// the Source, not an inventory of files, so they have a surface of their own —
// the personal setup's is `/global-consent`, which already explains and manages
// what is inspected outside the repository, which is why only this one is new.
// The inventory therefore opens at the list, and the rail states this Source's
// status beside the way here, so a reader learns a scan came back partial
// without leaving the list (FR-030).
//
// The escaped root label is stated here and nowhere else. It is a one-way
// escaping of the selected root: it grants no read authority, is not a
// `SourceRelativePath`, and is never used as a navigation or read locator
// (FR-002). It is therefore rendered in its own labelled field with the note
// saying what it is, well away from the Source-relative paths the inventory
// lists.
//
// The scan status and the rescan control are `ScanProgress.vue`'s, unchanged
// and rendered here: the panel already correlates a status with the request
// that was admitted, which is the invariant that matters and not something to
// rewrite for a new address.
import { computed, onMounted, ref } from 'vue';
import ScanProgress from '../components/inventory/ScanProgress.vue';
import DetailNavigation from '../components/inspection/DetailNavigation.vue';
import { useSessionViewState } from '../composables/session-view-state';
import { SOURCE_BOUNDARY_ORIGIN_TEXT } from '../../shared/entities';

const sessionViewState = useSessionViewState();

/** The one Repository Source; null until bootstrap adopts a snapshot. */
const repositorySource = computed(
  () =>
    sessionViewState.snapshot.value?.sources.find((source) => source.kind === 'repository') ?? null,
);

/** The page's own heading, which takes focus when the page is entered. */
const heading = ref<HTMLHeadingElement | null>(null);

// Following a link in an SPA moves no focus by itself, so every routed surface
// puts it on its own heading — the same move the detail pages make. Without it
// focus stayed on the shell's `h1`, which names the application rather than the
// page a reader just opened (WCAG 2.4.3).
onMounted(() => {
  heading.value?.focus();
});
</script>

<template>
  <div class="aci-repository-page aci-route">
    <!-- The way back, drawn in the bar with every other route's moves
         (`DetailNavigation.vue`): a reader looks for it in one place whatever
         surface they are on. A Source page has no neighbouring row to step to,
         so it offers neither move. -->
    <DetailNavigation list-route="/" list-text="the inventory" :previous="null" :next="null" />
    <h2 ref="heading" tabindex="-1">Repository</h2>
    <template v-if="repositorySource">
      <dl class="aci-definition-grid">
        <dt>Selected root</dt>
        <dd class="aci-repository-page__display-root">
          {{ repositorySource.boundary.displayRoot }}
          ({{ SOURCE_BOUNDARY_ORIGIN_TEXT[repositorySource.boundary.origin] }})
        </dd>
      </dl>
      <p class="aci-note">
        This label is an escaped presentation of the selected root. It is not a path you can open
        and grants no read access.
      </p>

      <ScanProgress />
    </template>
    <p v-else class="aci-empty">
      This session has not adopted a Repository Source yet. Return to the inventory and try again.
    </p>
  </div>
</template>

<style scoped>
/* An escaped root label has no break opportunities of its own; without this the
   shell scrolls sideways. It is not a `.aci-path`: the label is a presentation
   of a root, not a path anything can open. */
.aci-repository-page__display-root {
  font-family: ui-monospace, monospace;
  overflow-wrap: anywhere;
}
</style>
