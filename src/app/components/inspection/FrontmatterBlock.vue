<script setup lang="ts">
// One authored frontmatter block, drawn the way the file wrote it (FR-007).
//
// Recursive because the shape is: a key may declare a scalar, a list, or a
// mapping whose entries declare their own. A nested block is drawn *below* the
// key that opens it, indented a fixed step — not beside it. Beside it, each
// level would start after the level above's key column, and four levels of
// `hooks` would walk off the right of the screen.
//
// Every block draws in the same two columns as the block above it, through a
// CSS subgrid: one column for the keys, one for the values, so a value at any
// depth lands in the one column every other value is in. Indentation is each
// block's own padding, which shortens the key column from the left and leaves
// the value column where it was. A grid per block would give each depth its
// own value column, and the reader would have as many value columns to follow
// as the file has levels.
//
// Every value is rendered through a Vue text binding. Nothing here is markup, a
// link, or a URI, and no value is masked, shortened, or reflowed into something
// the file does not contain (FR-025, FR-033).
import { computed } from 'vue';
import FrontmatterValueText from './FrontmatterValueText.vue';
import { rendersNothingVisible } from '../../../shared/entities';
import type { FrontmatterEntryDto, FrontmatterValueDto } from '../../../shared/api-types';

const props = defineProps<{
  /** The value whose children this block draws; a mapping or a sequence. */
  value: FrontmatterValueDto;
  /** How many blocks stand above this one; 0 at the frontmatter's own level. */
  depth?: number;
}>();

/**
 * How many levels of indentation a block can take. YAML nests without limit,
 * and every level here eats into the key column, which is itself capped: past
 * some depth the keys have nowhere left to go and the list overflows sideways,
 * which is the one thing a narrow viewport must never do (WCAG 1.4.10). Past
 * the cap the rules still stack, so the nesting is still visible; only the
 * indent stops growing.
 */
const MAX_INDENTED_DEPTH = 6;

/** Whether this block still indents, or has reached the cap. */
const indents = computed(() => (props.depth ?? 0) < MAX_INDENTED_DEPTH);

/**
 * The step this block indents by. Every part of the step is capped together —
 * the rule's own offset, the padding after it, and (in the stylesheet) the
 * gutter a list marker draws into — because a cap on one of them alone would
 * let the others keep carrying a deep block off the side of a narrow viewport.
 * Past the cap a list marker flows inline instead, so it still draws without
 * overlapping what it labels.
 */
const indentStep = computed(() => ({
  marginInlineStart: indents.value ? '0.35rem' : '0',
  paddingInlineStart: indents.value ? '0.75rem' : '0',
  // The rule is drawn by the step, so it stops with it. A border kept past the
  // cap would still take a pixel per level, which is the same unbounded growth
  // in a smaller unit.
  borderInlineStartWidth: indents.value ? '1px' : '0',
}));

/**
 * One drawn line: the key the file wrote, or a list marker, and its value.
 *
 * The two ways a row comes to exist are the two factories, so what a mapping
 * entry and a list item each contribute is stated where it is decided rather
 * than assembled at the call site.
 */
class BlockRow {
  /** Stable identity within this block. */
  public readonly id: string;

  /** The declared key, or `-` for one item of a list, as YAML writes one. */
  public readonly label: string;

  /** What that label declares. */
  public readonly value: FrontmatterValueDto;

  /**
   * Whether the row is one item of a list rather than a declared key. Its
   * label is this product's marker rather than authored text, and a block it
   * opens carries that marker itself instead of spending a row on it.
   */
  public readonly fromListItem: boolean;

  /** Reached only through the factories, which fix how a row was made. */
  private constructor(
    id: string,
    label: string,
    value: FrontmatterValueDto,
    fromListItem: boolean,
  ) {
    this.id = id;
    this.label = label;
    this.value = value;
    this.fromListItem = fromListItem;
  }

  /**
   * Whether the label draws nothing: an empty key, or one made only of
   * whitespace and zero-width characters. A list marker always draws.
   */
  public get labelIsInvisible(): boolean {
    return !this.fromListItem && (this.label === '' || rendersNothingVisible(this.label));
  }

  /**
   * The note shown for a key that draws nothing, naming which case it is. It
   * stands beside the authored key rather than in its place: two keys made of
   * different runs of whitespace are two different declarations, and one note
   * for both would report a key the surface publishes as something shorter
   * (FR-025).
   */
  public get invisibleLabelText(): string {
    return this.label === '' ? '(empty key)' : '(key with no visible characters)';
  }

  /**
   * Whether the value opens a block of its own rather than filling this row.
   * An empty list or mapping fills its row: it has no children to draw, and a
   * key that opened nothing would read as a missing value rather than an empty
   * one.
   */
  public get opensBlock(): boolean {
    return (
      (this.value.kind === 'sequence' && this.value.items.length > 0) ||
      (this.value.kind === 'mapping' && this.value.entries.length > 0)
    );
  }

  /**
   * One declared key of a mapping. Identified by its position, not by the key
   * itself: two keys can resolve to the same text — YAML's numeric `1` and
   * string `"1"` are different keys of one mapping — and a repeated render key
   * makes the framework patch the wrong row.
   */
  public static forEntry(entry: FrontmatterEntryDto, index: number): BlockRow {
    return new BlockRow(String(index), entry.key, entry.value, false);
  }

  /** One item of a list, identified by its position and marked as YAML marks it. */
  public static forItem(item: FrontmatterValueDto, index: number): BlockRow {
    return new BlockRow(String(index), '-', item, true);
  }
}

/**
 * The rows this block draws. A mapping contributes its entries by key and a
 * sequence its items by marker, so both shapes read as the same kind of list
 * and neither needs a second component.
 */
const rows = computed<BlockRow[]>(() => {
  if (props.value.kind === 'mapping') {
    return props.value.entries.map(BlockRow.forEntry);
  }
  if (props.value.kind === 'sequence') {
    return props.value.items.map(BlockRow.forItem);
  }
  return [];
});
</script>

<template>
  <!-- A mapping is a description list and a sequence is an ordered list,
       because that is what each one is: a `dl` for a sequence would make every
       item either the description of the term above it or a description with no
       term at all, which is what assistive technology would then announce. -->
  <dl v-if="value.kind === 'mapping'" class="aci-frontmatter-block">
    <template v-for="row in rows" :key="row.id">
      <dt class="aci-frontmatter-block__key aci-authored-text">
        <!-- A key can draw nothing as easily as a value can — an empty key, or
             one made only of zero-width characters — and a row with no label
             reads as a value belonging to the row above it. The key is still
             rendered as authored and the note is added beside it, so two keys
             differing only in whitespace stay two rows a reader can tell apart
             (FR-025). An empty key has nothing to render, so it is the note
             alone. -->
        <!-- The authored run is atomic, not merely isolated, before the note:
             a key of only bidi controls is invisible too, and an authored PDI
             would pop a plain isolate from inside, letting a following
             override reorder the product's note beside it. -->
        <template v-if="row.labelIsInvisible"
          ><span class="aci-authored-text aci-authored-atomic">{{ row.label }}</span
          ><span class="aci-muted">{{ row.invisibleLabelText }}</span></template
        >
        <template v-else>{{ row.label }}</template>
      </dt>
      <!-- An authored value that draws nothing — empty, or whitespace and
           zero-width characters only — would render as blank, which reads as a
           value that was not shown at all. The label says which it is; the
           value itself is never altered (FR-025). -->
      <dd v-if="!row.opensBlock" class="aci-frontmatter-block__value">
        <FrontmatterValueText :value="row.value" />
      </dd>
      <!-- A key opens its block on the row beneath it, so one level costs one
           fixed step whatever the key above happened to be called. -->
      <dd v-else class="aci-frontmatter-block__nested" :style="indentStep">
        <FrontmatterBlock :value="row.value" :depth="(depth ?? 0) + 1" />
      </dd>
    </template>
  </dl>

  <!-- `role="list"` because the markers are drawn by this component rather than
       by `list-style`, and WebKit drops list semantics from a markerless list. -->
  <ol v-else-if="value.kind === 'sequence'" class="aci-frontmatter-block" role="list">
    <li v-for="row in rows" :key="row.id" class="aci-frontmatter-block__item">
      <template v-if="!row.opensBlock">
        <span class="aci-frontmatter-block__key">{{ row.label }}</span>
        <span class="aci-frontmatter-block__value">
          <FrontmatterValueText :value="row.value" />
        </span>
      </template>
      <!-- An item that opens a block draws its marker on the block's own first
           line, where YAML writes it, rather than spending a line on a marker
           with the item's contents on the next. -->
      <div
        v-else
        class="aci-frontmatter-block__nested aci-frontmatter-block__nested--list-item"
        :class="{ 'aci-frontmatter-block__nested--capped': !indents }"
        :style="indentStep"
      >
        <FrontmatterBlock :value="row.value" :depth="(depth ?? 0) + 1" />
      </div>
    </li>
  </ol>
</template>

<style scoped>
/* The declared keys as a two-column list: the key the file wrote, then what it
   resolves to. `name` and `description` lead it, so the first two rows are the
   two a reader looks for.

   The root block declares the two tracks every nested block then draws in, so
   the key column is sized over every key at every depth, indentation included,
   and the value column starts where the widest of them ends. */
ol.aci-frontmatter-block {
  /* Markerless: the marker is drawn in the key column so it lines up with the
     keys around it, which `list-style` cannot do. `role="list"` on the element
     keeps the semantics WebKit drops from a markerless list. */
  list-style: none;
  padding: 0;
}

/* One item draws in the two tracks its list spans, so a list item value lands
   in the same column as a mapping entry's. */
.aci-frontmatter-block__item {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
}

.aci-frontmatter-block {
  display: grid;
  gap: 0.15rem 1rem;
  /* `fit-content`, not `max-content`: the key column takes what its keys need
     but never more than 40% of the list, because `max-content` cannot shrink —
     one long key then claims the whole grid, the value column resolves to zero
     width, and every value at every depth becomes invisible while the page
     scrolls sideways (WCAG 1.4.10). Past the cap a key wraps instead. */
  grid-template-columns: fit-content(40%) minmax(0, 1fr);
  margin: 0;
}

/* A key and its value sit on one line, so they share a baseline. Stretched,
   each would start at the top of its own box and the smaller key would ride
   above the value it labels — the two are one statement and have to read as one.

   Declared per item rather than as the list's `align-items`, because a nested
   block is a grid item of the same list and it is a subgrid: a subgrid has no
   baseline of its own to align to, and Chromium answers with an offset near its
   minimum layout unit, which puts the block millions of pixels above the
   viewport and renders it as empty space. Naming the two items that are plain
   boxes keeps every block out of the baseline group. */
.aci-frontmatter-block__key,
.aci-frontmatter-block__value {
  align-self: baseline;
}

.aci-frontmatter-block__key {
  color: var(--aci-muted);
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  /* An authored key has no break opportunities of its own, so at the column's
     cap it would overflow rather than wrap. */
  overflow-wrap: anywhere;
}

.aci-frontmatter-block__value {
  margin: 0;
  min-width: 0;
}

/* A nested block sits under the key that opens it and spans the row, so each
   level costs one fixed step rather than the width of the key above it. The
   rule draws where the block begins and where it ends.

   It draws in the tracks it spans rather than tracks of its own: a subgrid puts
   its keys in the key column and its values in the value column, so however
   deep it is, its values line up with the values at the top. Both the wrapper
   and the list inside it are subgrids — the chain from the root cannot skip a
   level. Indentation is the wrapper's padding, which inserts before the key
   column and leaves the value column where the root put it. */
.aci-frontmatter-block__nested,
.aci-frontmatter-block__nested > .aci-frontmatter-block {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
}

/* The rule ends where the block's last row ends: no trailing margin, because
   the border is drawn through one and a block closing inside four others would
   leave that many rules running down past the last thing they group. The row
   gap already separates the block from what follows. */
.aci-frontmatter-block__nested {
  border-inline-start: 1px solid var(--aci-border);
  margin-block-start: 0.1rem;
  min-width: 0;
}

/* One item of a list is drawn as YAML writes it: the marker on the first line
   of the item, not on a line of its own with the item's contents below it. The
   item indents past the marker so its later lines start under the first, and the
   marker is drawn back into that gutter from the first line itself — which is
   what puts the two on one baseline, without a second box to align. */
.aci-frontmatter-block__nested--list-item > .aci-frontmatter-block {
  padding-inline-start: 1rem;
}

/* Past the depth cap the gutter stops too — kept, it would grow one marker
   width per list level, which is the same unbounded march off a narrow
   viewport the cap exists to stop (WCAG 1.4.10). The marker still draws: with
   no gutter it flows inline before the first key or value, the way YAML spells
   a deep `- - -` chain on one line, instead of overlapping it from a gutter
   that is no longer there. */
.aci-frontmatter-block__nested--capped > .aci-frontmatter-block {
  padding-inline-start: 0;
}

.aci-frontmatter-block__nested--list-item > .aci-frontmatter-block > :first-child {
  position: relative;
}

.aci-frontmatter-block__nested--list-item > .aci-frontmatter-block > :first-child::before {
  color: var(--aci-muted);
  content: '-';
  /* Drawn back into the gutter the item's own padding made. */
  inset-inline-start: -1rem;
  position: absolute;
}

.aci-frontmatter-block__nested--capped > .aci-frontmatter-block > :first-child::before {
  /* In flow: the capped block has no gutter to draw back into. */
  inset-inline-start: auto;
  margin-inline-end: 0.5ch;
  position: static;
}
</style>
