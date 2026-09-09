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
// Each entry reaches that file's own detail through its path, with the
// products that recognize it drawn beside it as marks. The path is the link on
// every kind, because the strip offers the next file rather than another
// reading of one ({@link FileStripEntry.opens}). It states no order, no precedence, and
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
  /**
   * Whether the strip is the last row of a bordered box rather than a line of
   * the page's own stack. The strip carries its own outer margins, which is
   * right where it sits in that stack between the attributes and the tabs —
   * every kind but one draws it there, and this is the default. The skill
   * detail draws one strip inside each invocation name's box, under that
   * name's recognition rows, because a copy is a copy of the name; there the
   * spacing and the rule are the box's rows', so a box row drops the margins
   * and takes the rows' inset and hairline instead.
   */
  boxRow?: boolean;
}>();
</script>

<template>
  <!-- A navigation landmark rather than a plain list: the entries go to other
       pages, and a reader stepping the page's landmarks should meet them as a
       way out rather than as more of this file's own facts (WCAG 2.4.1). -->
  <nav
    v-if="entries.length > 0"
    class="aci-file-strip"
    :class="{ 'aci-file-strip--box-row': boxRow }"
    :aria-label="accessibleLabel ?? label"
  >
    <span class="aci-file-strip__label">{{ label }}</span>
    <span v-for="entry in entries" :key="entry.key" class="aci-file-strip__item">
      <SourceHomeBadge v-if="entry.sourceId !== openSourceId" :source-id="entry.sourceId" />
      <NuxtLink
        :to="entry.opens.route"
        class="aci-path aci-authored-text"
        :aria-label="entry.opens.accessibleText"
        >{{ entry.pathText }}</NuxtLink
      >
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
  /* The scroll stays inside this box. `overflow-x: auto` alone does not keep
     it there: the entries still counted towards the document's own scrollable
     area, so a strip 3,940px wide made the whole page scroll 3,928px sideways
     at a 1,280px viewport — the failure the line above says cannot happen
     (WCAG 1.4.10). Measured: hiding the strip took the document back to
     1,280px and hiding the source viewers changed nothing, so the overflow was
     this box's. Clipping an ancestor does not fix it either; paint containment
     does, because it makes this box the boundary its descendants are painted
     and scrolled within. */
  contain: paint;
  display: flex;
  gap: 0.3125rem;
  margin-block: 0.5625rem 0.4375rem;
  overflow-x: auto;
  padding-block-end: 0.1875rem;
}

/* The strip as the last row of a bordered box ({@link boxRow}). Spacing and
   rule are then the box's rows': the outer margins the page stack asks for
   go, and the strip takes the rows' 0.625rem inset — so the label lines up
   with the rows above it — and the hairline that parts rows inside a box
   `--aci-line` has already identified (main.css § --aci-hairline). The
   block-end padding is the row's 0.25rem plus the 0.1875rem scrollbar
   groove above, so the content sits 0.25rem from each edge and the
   scrollbar keeps its groove below. */
.aci-file-strip--box-row {
  border-block-start: 1px solid var(--aci-hairline);
  margin-block: 0;
  padding-block: 0.25rem 0.4375rem;
  padding-inline: 0.625rem;
}

/* What the set is, said once at the head of the line rather than on each
   entry. It scrolls away with them, because it names what the reader is
   scrolling through. It sits in the line rather than above it: the flex
   default, `stretch`, would draw the label's box as tall as the tallest entry
   and put its text at the top of that box, 5px above the text the entries
   centre in theirs, so the two texts on one line would not line up. */
.aci-file-strip__label {
  align-self: center;
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
