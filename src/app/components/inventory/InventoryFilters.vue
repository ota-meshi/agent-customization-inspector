<script setup lang="ts">
// Inventory filter controls (T071, placed by T1153). Every control is a native
// form element so it is keyboard-operable and labelled without custom ARIA
// (contracts/accessibility-acceptance.md).
//
// Filtering is local to the committed snapshot: no value chosen here reaches
// the host, becomes a path, or widens what was scanned.
//
// The selections are two-way models rather than a passed-in filter object:
// the page owns the filter state, and this component only reads and writes
// the two values, so there is one owner and no hidden mutation.
//
// Two controls, not three. Kind is navigation rather than a filter — each kind
// is presented differently, so one is always in view — and it lives in the rail.
// The search over names and paths is the bar's, because it applies wherever the
// reader is rather than to the list alone (FR-006), and a second field here
// would be the same substring asked for twice.
//
// Each control appears only where it can narrow something, which is why both
// are conditional rather than always drawn: the two lists that belong to no
// kind are offered the Source control and not the Tool one. No product
// recognized a file in no kind, and a Source-level diagnostic is not tied to a
// product, so a tool selection there is a question with no answer (FR-006).
//
// They sit at the end of the list's own heading row rather than in the rail:
// what they narrow is the list beside them, and a control that changes what is
// in a panel belongs with that panel's title. The rail answers a different
// question — which list is in view at all.
//
// The labels are read rather than seen. Each select's own first option names
// what it filters (`All sources`, `All tools`), so a visible label beside it in
// a one-line heading row would be the same word twice; what a control must not
// be is unnamed to assistive technology (WCAG 3.3.2, 4.1.2).
import { nextTick, useTemplateRef } from 'vue';
import { SUPPORTED_TOOL_TEXT, isSupportedTool, type SupportedTool } from '../../../shared/entities';
import type { SourceKind } from '../../../shared/api-types';
import { SOURCE_KIND_TEXT } from '../../../shared/api-text';

const props = defineProps<{
  /**
   * The Source families the current generation published, in the fixed order
   * (`filters.ts` § availableSourceKinds): the repository, then the personal
   * setup. A family rather than one option per Source, because a per-member
   * option asks what the Tool filter beside it already answers, and one family
   * is a question with one answer (FR-006).
   */
  availableSourceKinds: readonly SourceKind[];
  /**
   * The tools that can narrow the list in view, in the closed tool order.
   * Empty for the two lists that belong to no kind, where nothing was
   * recognized by a product and the control is therefore not drawn.
   */
  availableTools: readonly SupportedTool[];
  /** How many rows the current filters admit, for the result summary. */
  matchCount: number;
  /** How many rows the committed generation published in total. */
  totalCount: number;
  /**
   * What those rows are, in the unit the entry in view counts them by
   * (`rail-selection.ts` § INVENTORY_SELECTION_UNIT_TEXT): the same word the
   * heading beside this control shows, so what a reader hears is what is on
   * the screen. Singular and plural both, because the summary uses each.
   */
  unit: { readonly one: string; readonly many: string };
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
  await settleOnSummary();
}

/**
 * Moves focus to the row-count line once the clear has rendered. Exposed
 * because the empty list draws a second `Clear filters` inside its own box —
 * the reader's eye is there, not up on this row — and two controls that do one
 * thing must leave focus in one place (WCAG 2.4.3).
 */
async function settleOnSummary(): Promise<void> {
  await nextTick();
  matchSummary.value?.focus();
}

defineExpose({ settleOnSummary });

/** Selected Source family, or null for every Source. */
const source = defineModel<SourceKind | null>('source', { required: true });
/** Selected recognizing tool, or null for every tool. */
const tool = defineModel<SupportedTool | null>('tool', { required: true });

/**
 * The family the reader chose, read out of the control's own text.
 *
 * A `<select>` hands back the raw text of the chosen option, so the offered
 * families are what turn it into one — the empty option is "all sources", and
 * anything this generation does not publish selects nothing rather than being
 * declared a family the inventory has no rows for. The comparison is what
 * narrows the type, so no assertion is made about the string.
 */
function sourceFromSelection(value: string): SourceKind | null {
  for (const candidate of props.availableSourceKinds) {
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
  <div class="aci-inventory-filters" role="group" aria-label="Filters">
    <!-- Only where it can narrow something. One family is the ordinary
         session — nothing outside the selected repository is inspected until
         a reader confirms it — and there the control's two options would name
         the same population, which is a question with one answer put in front
         of every reader who has not asked it. -->
    <template v-if="availableSourceKinds.length > 1">
      <label class="aci-visually-hidden" for="aci-inventory-filters-source">Source</label>
      <select
        id="aci-inventory-filters-source"
        :value="toSelectValue(source)"
        @change="source = sourceFromSelection(($event.target as HTMLSelectElement).value)"
      >
        <option value="">All sources</option>
        <option v-for="candidate in availableSourceKinds" :key="candidate" :value="candidate">
          {{ SOURCE_KIND_TEXT[candidate] }}
        </option>
      </select>
    </template>
    <!-- Only where a tool can narrow something. The two lists that belong to no
         kind hold nothing a product recognized, so the control would offer a
         question none of their rows can answer. -->
    <template v-if="availableTools.length > 0">
      <label class="aci-visually-hidden" for="aci-inventory-filters-tool">Tool</label>
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
    </template>
    <!-- The button disappears the moment it does its job, so focus is moved
         before it goes: leaving it on a removed element drops the keyboard
         user to the document body, with no announced position
         (WCAG 2.4.3; contracts/accessibility-acceptance.md). The count line
         below is the outcome they asked for, so that is where focus lands. -->
    <button v-if="narrowed" type="button" @click="clearFilters">Clear filters</button>
    <!-- What the narrowing did, announced rather than drawn: the heading row
         beside these controls already states the kind's own count, and the rows
         are the visible answer. It stays in the document from the first render
         so a change is announced at all (WCAG 4.1.3). -->
    <p
      ref="matchSummary"
      class="aci-live-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabindex="-1"
    >
      Showing {{ matchCount }} of {{ totalCount }} {{ totalCount === 1 ? unit.one : unit.many }} in
      this list.
    </p>
  </div>
</template>

<style scoped>
/* Two selects and, while a narrowing is applied, the control that clears them,
   riding at the end of the list's heading row. `margin-inline-start: auto`
   pushes the group to the far end so the kind's name and count keep the start,
   which is where a reader looks first. */
.aci-inventory-filters {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-inline-start: auto;
}
</style>
