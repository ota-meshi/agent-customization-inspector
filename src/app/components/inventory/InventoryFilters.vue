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
import { SUPPORTED_TOOL_TEXT, type SupportedTool } from '../../../shared/entities';
import type { SourceDto } from '../../../shared/api-types';

defineProps<{
  /** The Sources the current generation published. */
  availableSources: readonly SourceDto[];
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

/** Selected Source, or null for every Source. */
const sourceId = defineModel<string | null>('sourceId', { required: true });
/** Selected recognizing tool, or null for every tool. */
const tool = defineModel<SupportedTool | null>('tool', { required: true });
/** Case-insensitive Source-relative-path substring. */
const pathQuery = defineModel<string>('pathQuery', { required: true });

/** The Repository Source has no tool of its own, so it is labelled by kind. */
function sourceLabel(source: SourceDto): string {
  return source.tool === null ? 'Repository' : SUPPORTED_TOOL_TEXT[source.tool];
}

// A native `<select>` cannot hold null, so the empty option stands for "no
// filter" and is mapped back on the way in and out.
function toSelectValue(value: string | null): string {
  return value ?? '';
}
</script>

<template>
  <section class="aci-filters" aria-labelledby="aci-filters-heading">
    <h3 id="aci-filters-heading">Filters</h3>
    <div class="aci-filter-grid">
      <p>
        <label for="aci-filter-source">Source</label>
        <select
          id="aci-filter-source"
          :value="toSelectValue(sourceId)"
          @change="sourceId = ($event.target as HTMLSelectElement).value || null"
        >
          <option value="">All sources</option>
          <option v-for="source in availableSources" :key="source.sourceId" :value="source.sourceId">
            {{ sourceLabel(source) }}
          </option>
        </select>
      </p>
      <p>
        <label for="aci-filter-tool">Tool</label>
        <select
          id="aci-filter-tool"
          :value="toSelectValue(tool)"
          @change="tool = (($event.target as HTMLSelectElement).value || null) as SupportedTool | null"
        >
          <option value="">All tools</option>
          <option v-for="candidate in availableTools" :key="candidate" :value="candidate">
            {{ SUPPORTED_TOOL_TEXT[candidate] }}
          </option>
        </select>
      </p>
      <p>
        <label for="aci-filter-path">Path contains</label>
        <input id="aci-filter-path" v-model="pathQuery" type="search">
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
