<script setup lang="ts">
// The other copies of the customization this detail is showing (T1167,
// FR-007).
//
// One line whatever the count. The widest row this product publishes holds
// nine files — an instruction range in the all-supported tree — and stacking
// those under the heading pushed the file's own content off the first screen,
// which is the height this page exists to spend on content. The line scrolls
// sideways instead, so the count changes what a reader scrolls past rather
// than where the content starts.
//
// Each entry reaches that file's own detail, with the products that recognize
// it drawn beside the path. The path is the link where the file has one
// detail; where the detail is one product's own reading, the marks are the
// links and the path is inert ({@link FileStripEntry.opens}). It states no order, no precedence, and
// no winner: which copy a session loads turns on runtime this tool does not
// observe (FR-009).
//
// The one on screen is not here. The heading above already spells it, and a
// page must not carry one fact in two spellings ({@link otherCopiesOf}).
import { NuxtLink } from '#components';
import RecognitionMarks from '../inventory/RecognitionMarks.vue';
import SourceHomeBadge from '../inventory/SourceHomeBadge.vue';
import type { FileStripEntry } from './file-strip';

defineProps<{
  /**
   * The copies to offer, already narrowed to the ones the page is not showing
   * ({@link otherCopiesOf}).
   */
  entries: readonly FileStripEntry[];
  /**
   * What the strip calls the set, in the words of the kind whose page renders
   * it — the other files of a name, of a range, of an event. The count is the
   * caller's too, because only the caller knows what it is counting.
   */
  label: string;
  /**
   * What the landmark is called, where {@link label} would name two of them on
   * one page: the skill detail draws a strip inside each of its invocation
   * names, and two landmarks called "Other copies of this skill" leave a
   * reader stepping them unable to tell which name they are in (WCAG 2.4.1).
   * The visible label stays the prefix, so what is read aloud starts with what
   * is on screen (WCAG 2.5.3).
   *
   * Omitted where the page draws one strip, which is every other kind's.
   */
  accessibleLabel?: string;
  /**
   * The Source of the file the page is showing, so an entry states its own
   * home only where that home differs from the page's — which is where the
   * statement distinguishes something ({@link FileStripEntry.sourceId}). Null
   * before the page's own Source resolves, where every entry states its home.
   */
  openSourceId: string | null;
}>();
</script>

<template>
  <!-- A navigation landmark rather than a plain list: the entries go to other
       pages, and a reader stepping the page's landmarks should meet them as a
       way out rather than as more of this file's own facts (WCAG 2.4.1). -->
  <nav v-if="entries.length > 0" class="aci-file-strip" :aria-label="accessibleLabel ?? label">
    <span class="aci-file-strip__label">{{ label }}</span>
    <span v-for="entry in entries" :key="entry.key" class="aci-file-strip__item">
      <SourceHomeBadge v-if="entry.sourceId !== openSourceId" :source-id="entry.sourceId" />
      <NuxtLink
        v-if="entry.opens !== undefined"
        :to="entry.opens.route"
        class="aci-path aci-authored-text"
        :aria-label="entry.opens.accessibleText"
        >{{ entry.pathText }}</NuxtLink
      >
      <!-- Inert text rather than a link: this kind's detail is one product's
           own reading of the file, so there is no single destination the path
           could open. The marks are the links, which is the reading the plugin
           row makes of its own carriers (`PluginRow.vue`). -->
      <span v-else class="aci-path aci-authored-text">{{ entry.pathText }}</span>
      <span v-if="entry.carrierText !== null" class="aci-carrier-kind">{{
        entry.carrierText
      }}</span>
      <RecognitionMarks :recognitions="entry.recognitions" />
    </span>
  </nav>
</template>

<style scoped>
/* One line whatever the count: the entries do not wrap onto a second line, and
   the line scrolls sideways when they run past it (WCAG 1.4.10 — the page
   itself never scrolls sideways, only this strip does). What scrolls is the
   move between entries; each entry itself is capped at the strip's own width
   below, so reading one never costs a sideways move. */
.aci-file-strip {
  display: flex;
  gap: 0.3125rem;
  margin-block: 0.5625rem 0.4375rem;
  overflow-x: auto;
  padding-block-end: 0.1875rem;
}

/* What the set is, said once at the head of the line rather than on each
   entry. It scrolls away with them, because it names what the reader is
   scrolling through. */
.aci-file-strip__label {
  color: var(--aci-muted);
  flex: none;
  font-size: 0.6875rem;
  white-space: nowrap;
}

/* One entry, never wider than the strip it is in. The strip runs off the right
   edge by design — moving between entries costs a sideways move, and that is
   the trade for a line that stays one line however many there are — but
   reading *one* entry never does: an authored path has no break opportunities
   of its own, so an entry left at its content width put a single path past the
   viewport at a narrow width (WCAG 1.4.10; `main.css` § .aci-path makes the
   same call for a path in a row). `box-sizing` because the cap would otherwise
   apply to the content box and the border and padding would take the entry
   past the strip anyway. */
.aci-file-strip__item {
  align-items: center;
  background: var(--aci-surface-raised);
  border: 1px solid var(--aci-line);
  border-radius: 999px;
  box-sizing: border-box;
  display: flex;
  flex: none;
  font-size: 0.6875rem;
  gap: 0.375rem;
  max-inline-size: 100%;
  overflow-wrap: anywhere;
  padding: 0.1875rem 0.625rem;
  white-space: normal;
}
</style>
