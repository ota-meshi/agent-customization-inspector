<script setup lang="ts">
// Inventory filter controls (T071). Every control is a native form element so
// it is keyboard-operable and labelled without custom ARIA
// (contracts/accessibility-acceptance.md).
//
// Filtering is local to the committed snapshot: no value chosen here reaches
// the host, becomes a path, or widens what was scanned. The path box in
// particular is a display-string substring match, never a locator — a
// Source-relative Path is presentation identity and never reconstructs a
// filesystem path (FR-024).
//
// The selections are two-way models rather than a passed-in filter object:
// the page owns the filter state, and this component only reads and writes
// the three values, so there is one owner and no hidden mutation.
//
// Kind is deliberately absent. It is navigation rather than a filter — each
// kind is presented differently, so one is always in view — and it lives in the
// tab strip beside this section.
import { nextTick, useTemplateRef } from 'vue';
import { SUPPORTED_TOOL_TEXT, isSupportedTool, type SupportedTool } from '../../../shared/entities';
import type { SourceSelector } from '../../../shared/api-types';

const props = defineProps<{
  /**
   * One option per published Source, in the fixed order (`filters.ts`
   * § availableSources): the repository, then each consented home under its
   * member's name. Per Source rather than per family, because which Source
   * holds a file is the question this filter answers (FR-006) — the Tool
   * filter beside it answers which product recognized one, and a family
   * option could not separate two homes of one family.
   */
  availableSources: readonly { readonly selector: SourceSelector; readonly label: string }[];
  /** The tools the current inventory actually recognizes. */
  availableTools: readonly SupportedTool[];
  /** How many rows the current filters admit, for the result summary. */
  matchCount: number;
  /** How many rows the committed generation published in total. */
  totalCount: number;
  /** True while any filter narrows the inventory. */
  narrowed: boolean;
}>();

const emit = defineEmits<{
  /** The user asked to clear every filter. */
  clear: [];
}>();

/**
 * The tool the reader chose, read out of the control's own text.
 *
 * A `<select>` hands back the raw text of the chosen option, so the closed
 * catalog is what turns it into a tool — the empty option is "all tools", and
 * anything the catalog does not name selects nothing rather than being
 * declared a tool the inventory has no rows for.
 */
function toolFromSelection(value: string): SupportedTool | null {
  return isSupportedTool(value) ? value : null;
}

/**
 * The row-count line, which is where focus goes when the button that had it
 * removes itself.
 */
const matchSummary = useTemplateRef<HTMLElement>('matchSummary');

/**
 * Clears every filter and then moves focus, because the button the user
 * pressed is gone by the next render: focus left on a removed element falls to
 * the document body, and a keyboard user loses their place with nothing
 * announced (WCAG 2.4.3).
 */
async function clearFilters(): Promise<void> {
  emit('clear');
  await nextTick();
  matchSummary.value?.focus();
}

/** Selected Source family, or null for every Source. */
const source = defineModel<SourceSelector | null>('source', { required: true });
/** Selected recognizing tool, or null for every tool. */
const tool = defineModel<SupportedTool | null>('tool', { required: true });
/** Case-insensitive Source-relative-path substring. */
const pathQuery = defineModel<string>('pathQuery', { required: true });

/**
 * The family the reader chose, read out of the control's own text.
 *
 * A `<select>` hands back the raw text of the chosen option, so the offered
 * families are what turn it into one — the empty option is "all sources", and
 * anything this generation does not publish selects nothing rather than being
 * declared a family the inventory has no rows for. The comparison is what
 * narrows the type, so no assertion is made about the string.
 */
function sourceFromSelection(value: string): SourceSelector | null {
  for (const { selector: candidate } of props.availableSources) {
    if (candidate === value) {
      return candidate;
    }
  }
  return null;
}

// A native `<select>` cannot hold null, so the empty option stands for "no
// filter" and is mapped back on the way in and out.
function toSelectValue(value: string | null): string {
  return value ?? '';
}
</script>

<template>
  <section class="aci-inventory-filters aci-panel" aria-labelledby="aci-inventory-filters-heading">
    <h3 id="aci-inventory-filters-heading">Filters</h3>
    <div class="aci-inventory-filters__grid">
      <!-- Only where it can narrow something. One family is the ordinary
           session — nothing outside the selected repository is inspected until
           a reader confirms it — and there the control's two options would name
           the same population, which is a question with one answer put in front
           of every reader who has not asked it. -->
      <p v-if="availableSources.length > 1">
        <label for="aci-inventory-filters-source">Source</label>
        <select
          id="aci-inventory-filters-source"
          :value="toSelectValue(source)"
          @change="source = sourceFromSelection(($event.target as HTMLSelectElement).value)"
        >
          <option value="">All sources</option>
          <option
            v-for="candidate in availableSources"
            :key="candidate.selector"
            :value="candidate.selector"
          >
            {{ candidate.label }}
          </option>
        </select>
      </p>
      <p>
        <label for="aci-inventory-filters-tool">Tool</label>
        <select
          id="aci-inventory-filters-tool"
          :value="toSelectValue(tool)"
          @change="tool = toolFromSelection(($event.target as HTMLSelectElement).value)"
        >
          <option value="">All tools</option>
          <option v-for="candidate in availableTools" :key="candidate" :value="candidate">
            {{ SUPPORTED_TOOL_TEXT[candidate] }}
          </option>
        </select>
      </p>
      <p>
        <label for="aci-inventory-filters-path">Path contains</label>
        <input id="aci-inventory-filters-path" v-model="pathQuery" type="search" />
      </p>
    </div>
    <p ref="matchSummary" class="aci-note" role="status" aria-live="polite" tabindex="-1">
      Showing {{ matchCount }} of {{ totalCount }} row(s) in this kind.
    </p>
    <!-- The button disappears the moment it does its job, so focus is moved
         before it goes: leaving it on a removed element drops the keyboard
         user to the document body, with no announced position
         (WCAG 2.4.3; contracts/accessibility-acceptance.md). The count line
         above is the outcome they asked for, so that is where focus lands. -->
    <p v-if="narrowed">
      <button type="button" @click="clearFilters">Clear filters</button>
    </p>
  </section>
</template>

<style scoped>
/* One control per line, each as wide as the panel: the panel sits in the kind
   rail, a column narrow enough that a row of controls would scroll sideways
   and hide one (WCAG 1.4.10). */
.aci-inventory-filters__grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.aci-inventory-filters__grid p {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin: 0;
}

/* A control fills the column rather than sizing to its widest option: a Source
   label is a display root, so left to itself the select would decide the rail's
   width. */
.aci-inventory-filters__grid select,
.aci-inventory-filters__grid input {
  inline-size: 100%;
  min-inline-size: 0;
}

.aci-inventory-filters__grid label {
  color: var(--aci-muted);
  font-size: 0.875rem;
}
</style>
