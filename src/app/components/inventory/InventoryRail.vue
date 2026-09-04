<script setup lang="ts">
// The inventory rail (T1152, replacing the kind strip of T071).
//
// Two groups, and they are different kinds of thing. The Source families at the
// top are links to routes, each carrying that family's own status, because a
// Source's root, status, generation, and rescan are facts about the Source
// rather than an inventory of files (FR-030): the inventory therefore states
// none of them and the reader still learns from here that a scan came back
// partial. Below them is everything that selects the panel beside the rail —
// the kinds this generation recognizes, then the two lists that are lists of
// files without being a kind's inventory.
//
// Only kinds the committed generation actually recognizes get an entry.
// Showing the whole closed catalog would advertise kinds this release cannot
// recognize yet and turn the rail into a second, silently drifting copy of the
// shipped rule catalog. The two non-kind entries are always present, because
// their membership rule is absence and a reader has to be able to ask.
//
// The panel selectors are a real `tablist` rather than a row of buttons,
// because assistive technology has to announce "tab 2 of 13, selected" for the
// strip to be usable at all (QR-004, contracts/accessibility-acceptance.md).
// That obliges the roving-tabindex and arrow-key behavior the WAI-ARIA tabs
// pattern specifies: one stop in the page tab order, arrows to move between
// tabs, Home/End to the ends. Which arrow pair steps follows the axis the
// strip is on: the column declares `aria-orientation="vertical"` and the
// narrow layout's one scrolling line declares `horizontal`, and the pattern
// gives the other pair no meaning either way — so the handler is told the same
// axis the tablist announces. The two non-kind entries are inside the same
// tablist, because they select the same panel and a keyboard user stepping the
// rail must not fall out of it two entries early.
//
// The Source links are outside that tablist for the same reason: they change
// the page rather than the panel, so they are ordinary links in their own
// navigation landmark and reachable with Tab like any other link.
//
// No entry carries an icon. A mark beside `Rule` or `Hook` adds nothing a
// reader gets before the word does, and it moves every label off the shared
// left edge the rail is scanned down.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { NuxtLink } from '#components';
import LeavesIcon from '~icons/lucide/arrow-right';
import {
  SOURCE_STATUS_STANDALONE_TEXT,
  type CustomizationKind,
  type SourceStatus,
} from '../../../shared/entities';
import type { SourceDto } from '../../../shared/api-types';
import { nextTabForKey } from '../tab-navigation';
import { inventoryPanelId, inventoryTabId } from './panel-ids';
import {
  INVENTORY_SELECTION_TEXT,
  NON_KIND_SELECTION_ORDER,
  type InventorySelection,
} from './rail-selection';

const props = defineProps<{
  /** The kinds the current inventory recognizes, in the closed kind order. */
  kinds: readonly CustomizationKind[];
  /**
   * The entry in view. Total, because a tablist has one selected tab and the
   * page's own selection is what decides which (`pages/index.vue`
   * § activeSelection): a generation that recognized no kind selects the first
   * entry that belongs to none, so this component defaults nothing of its own.
   */
  activeSelection: InventorySelection;
  /** How many rows each entry would show, with every other filter applied. */
  counts: ReadonlyMap<InventorySelection, number>;
  /** Every Source the current generation published, in snapshot order. */
  sources: readonly SourceDto[];
  /**
   * Whether an accepted personal-setup read is still out. A batch publishes no
   * member Source until it commits, so this is the only thing that tells a
   * running read from one that never started (`view-state.ts`
   * § runningGlobalBatch, and this client's own confirmation while it is out).
   */
  globalReadInProgress: boolean;
}>();

/**
 * Whether the kind strip is drawn as one horizontal line rather than as a
 * column, which is what the narrow layout does to it (see the media query
 * below). The tablist declares the axis a reader's arrow keys should expect,
 * and the handler serves both, so the attribute follows the layout rather than
 * naming one of them permanently.
 */
const stripIsHorizontal = ref(false);

/** The query the layout switches on, or null where the platform has none. */
const narrowLayout =
  typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia('(width < 48rem)') : null;

/** Keeps {@link stripIsHorizontal} on that query's current answer. */
function followLayout(): void {
  stripIsHorizontal.value = narrowLayout?.matches === true;
}

onMounted(() => {
  followLayout();
  narrowLayout?.addEventListener('change', followLayout);
});

onBeforeUnmount(() => {
  narrowLayout?.removeEventListener('change', followLayout);
});

const emit = defineEmits<{
  /** The user selected a rail entry. */
  select: [selection: InventorySelection];
}>();

/**
 * Every panel selector in rail order: the recognized kinds, then the two lists
 * that belong to no kind. One array rather than two, because it is what the
 * tablist renders and what the arrow keys step — a keyboard pattern written
 * over one half of a strip would stop at the separator.
 */
const selections = computed<readonly InventorySelection[]>(() => [
  ...props.kinds,
  ...NON_KIND_SELECTION_ORDER,
]);

/** The one Repository Source; null until bootstrap adopts a snapshot. */
const repositorySource = computed(
  () => props.sources.find((source) => source.kind === 'repository') ?? null,
);

/** The consented personal-setup Sources, empty until an enable batch commits. */
const globalSources = computed(() => props.sources.filter((source) => source.kind === 'global'));

/**
 * How the personal-setup entry reports one member status, and where that
 * status stands when the members disagree.
 *
 * A table keyed by the closed union rather than a chain of comparisons,
 * because the entry stands for four Sources and has to answer for every state
 * one of them can be in: reporting only `partial` and calling everything else
 * "Inspected" said a home had been read when its scan had failed, was still
 * running, or was being taken away (AGENTS.md § User-visible copy policy).
 *
 * `rank` is what a mixed set resolves to — the lowest one wins — and it puts
 * what a reader has to act on above what will settle on its own. `counted`
 * marks the states the entry counts members in, which are the same states its
 * pill draws as needing attention: one fact, read twice.
 */
const GLOBAL_STATUS_ENTRY: Readonly<
  Record<SourceStatus, { readonly rank: number; readonly counted: boolean; readonly text: string }>
> = {
  /** A member whose latest attempt failed; the reader has to retry it. */
  failed: { rank: 0, counted: true, text: 'failed' },
  /**
   * A member whose commit kept file-confined diagnostics; there is something
   * to read. Named by what was kept rather than by the contract's own word:
   * `partial` is the status value, and the Repository entry beside this one
   * already says `some files kept a diagnostic` for the same state, so the two
   * Source families read alike (validation.md § SC-001 and SC-006 first-use
   * sessions).
   */
  partial: { rank: 1, counted: true, text: 'with diagnostics' },
  /** A scan in flight: the counts beside the kinds are still provisional. */
  scanning: { rank: 2, counted: false, text: 'Scanning' },
  /** The disable barrier is draining this member's results away. */
  disabling: { rank: 3, counted: false, text: 'Disabling' },
  /**
   * Bootstrapped with no scan admitted, so nothing has been read yet. Counted
   * rather than stated for the whole entry: `Not inspected` is a claim about
   * every member, and this status outranks `ready`, so one unscanned home
   * beside three read ones would have denied all four. Every other uncounted
   * label is an existence claim — something is running — which one member is
   * enough to make true.
   */
  idle: { rank: 4, counted: true, text: 'not inspected' },
  /** Read, with nothing kept: the ordinary outcome. */
  ready: { rank: 5, counted: false, text: 'Inspected' },
};

/**
 * The member status the entry answers for: the one standing highest in
 * {@link GLOBAL_STATUS_ENTRY}, or null before any member is consented.
 */
const globalStatus = computed<SourceStatus | null>(() => {
  let worst: SourceStatus | null = null;
  for (const source of globalSources.value) {
    if (
      worst === null ||
      GLOBAL_STATUS_ENTRY[source.status].rank < GLOBAL_STATUS_ENTRY[worst].rank
    ) {
      worst = source.status;
    }
  }
  return worst;
});

/**
 * What the personal-setup entry says beside its link: the state its members
 * are in, and one shared statement where none was consented.
 *
 * A count of the members in that state rather than a list of them: which
 * member it is, is that surface's own answer, and the rail's job is to say
 * that there is something to go and read (FR-030).
 */
const globalStatusText = computed(() => {
  if (props.globalReadInProgress) {
    // A read is out and has committed nothing yet, so no member Source exists
    // to report: without this the entry would say `Not inspected` of homes
    // being read at that moment. `Scanning` because that is what this entry
    // says while one member's own rescan runs — one event, one word.
    return GLOBAL_STATUS_ENTRY.scanning.text;
  }
  const status = globalStatus.value;
  if (status === null) {
    return 'Not inspected';
  }
  const entry = GLOBAL_STATUS_ENTRY[status];
  if (!entry.counted) {
    return entry.text;
  }
  // The counted states name what they count. `1 with diagnostics` says one of
  // what; the members are homes, which is what every one of them is called
  // (`GLOBAL_MEMBER_TEXT`).
  const counted = globalSources.value.filter((source) => source.status === status).length;
  return `${counted} ${counted === 1 ? 'home' : 'homes'} ${entry.text}`;
});

/**
 * What the Repository entry says, as one string for the live region below: the
 * status word the entry shows, from the same value the entry draws — so what
 * is announced and what is seen cannot disagree, and `Scanning` and a failure
 * flow through the same path as `Inspected` (WCAG 4.1.3). Empty until a
 * Repository exists, so the region is mounted with nothing in it rather than
 * added with its text.
 *
 * The standalone status word, with no count of the files that kept a
 * diagnostic. A count here sat beside the `Source diagnostics` entry, and five
 * of twenty first-use sessions read the two as one thing counted two ways;
 * with the count gone, fifteen of the next twenty still stopped at the word
 * `Partial` — six reading it as a failed scan — because a word that does not
 * say what it means sends a reader looking for its meaning. So this entry
 * draws the status in words that carry their own meaning
 * (`SOURCE_STATUS_STANDALONE_TEXT`), and the count stays on the Repository
 * page, where it arrives with its answer: each diagnostic is stated where that
 * file is listed (`ScanProgress.vue`).
 *
 * Not a notice that the rescan was pressed: the status moves through
 * `scanning` to its result, so the press is heard as that movement — and a
 * scan that finishes before the first word is heard reads as its result, which
 * is what a sighted reader sees too.
 */
const repositoryAnnouncement = computed(() => {
  if (repositorySource.value === null) {
    return '';
  }
  const { word, note } = SOURCE_STATUS_STANDALONE_TEXT[repositorySource.value.status];
  // Speech does not wrap, so the note the pill puts on its own line is said
  // in the same breath as the word.
  return `Repository: ${word}${note === null ? '' : ` · ${note}`}.`;
});

/**
 * True while the personal-setup entry's status is one a reader should act on,
 * which is the same set the entry counts members in
 * ({@link GLOBAL_STATUS_ENTRY} § counted): the pill and the words it holds
 * cannot then disagree about whether there is anything to do.
 */
const globalNeedsAttention = computed(
  () => globalStatus.value !== null && GLOBAL_STATUS_ENTRY[globalStatus.value].counted,
);

/**
 * The one entry in the page's tab order, which is the selected one: a roving
 * tabindex with no `0` takes the whole strip out of the tab order, so a
 * keyboard reader could reach neither list (WCAG 2.1.1). It needs no default
 * of its own — the page's selection is total, and deriving the same fallback
 * here as well would be one fact in two places.
 */
const tabStop = computed<InventorySelection>(() => props.activeSelection);

// Arrow keys move selection, matching the WAI-ARIA tabs pattern. Selection
// follows focus here because switching entries only re-renders committed rows:
// it issues no request and cannot lose the user's work, so the extra Enter the
// manual-activation variant requires would be friction with nothing behind it.
function onKeydown(event: KeyboardEvent, index: number): void {
  // The axis the strip is actually laid out on, which is the one its tablist
  // declares: only the declared pair steps a tablist, so a handler fixed to one
  // axis while the strip announced the other left Left and Right inert on the
  // narrow layout and moved the selection on keys the strip said do nothing
  // (WCAG 4.1.2; `tab-navigation.ts` § nextTabForKey).
  const next = nextTabForKey(
    event.key,
    selections.value,
    index,
    stripIsHorizontal.value ? 'horizontal' : 'vertical',
  );
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior: swallowing
    // it here would break Tab out of the rail.
    return;
  }
  event.preventDefault();
  emit('select', next);
  const element = document.getElementById(inventoryTabId(next));
  if (element !== null) {
    element.focus();
  }
}
</script>

<template>
  <div class="aci-inventory-rail">
    <!-- A region of the Repository entry's own, apart from the personal
         setup's on the page, because one region for both would re-announce
         every personal member on each repository rescan; the rail itself keeps
         the two entries apart. Mounted from the first render with nothing in
         it (`index.vue` § the same rule). -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ repositoryAnnouncement }}
    </p>
    <nav class="aci-inventory-rail__sources" aria-label="Sources">
      <p class="aci-inventory-rail__group">Sources</p>
      <NuxtLink v-if="repositorySource" class="aci-inventory-rail__route" to="/repository">
        <span class="aci-inventory-rail__route-name"
          >Repository<LeavesIcon class="aci-inventory-rail__route-mark" aria-hidden="true"
        /></span>
        <span
          :class="[
            'aci-inventory-rail__status',
            { 'aci-inventory-rail__status--warn': repositorySource.status === 'partial' },
          ]"
          ><span class="aci-inventory-rail__status-dot" aria-hidden="true" />{{
            SOURCE_STATUS_STANDALONE_TEXT[repositorySource.status].word
          }}</span
        >
        <!-- The status's note, where the status has one, on the line under the
             pill: a pill holds one word, and the words that make `partial`
             mean what it means would fold to three lines inside it. In the
             link, so the move's accessible name carries the note too. -->
        <span
          v-if="SOURCE_STATUS_STANDALONE_TEXT[repositorySource.status].note !== null"
          class="aci-inventory-rail__status-note"
          >{{ SOURCE_STATUS_STANDALONE_TEXT[repositorySource.status].note }}</span
        >
      </NuxtLink>
      <NuxtLink class="aci-inventory-rail__route" to="/global-consent">
        <span class="aci-inventory-rail__route-name"
          >Personal setup<LeavesIcon class="aci-inventory-rail__route-mark" aria-hidden="true"
        /></span>
        <!-- A Source that was never inspected has no state to state, so it
             carries a plain note rather than a status pill: a pill says "this
             is how the scan ended", and nothing ended. -->
        <span v-if="globalSources.length === 0" class="aci-inventory-rail__status-note">{{
          globalStatusText
        }}</span>
        <span
          v-else
          :class="[
            'aci-inventory-rail__status',
            { 'aci-inventory-rail__status--warn': globalNeedsAttention },
          ]"
          ><span class="aci-inventory-rail__status-dot" aria-hidden="true" />{{
            globalStatusText
          }}</span
        >
      </NuxtLink>
    </nav>

    <!-- Always rendered, because the two entries below the kinds are always
         there: their membership rule is absence, so a generation that
         recognized nothing is exactly when a reader needs to ask where their
         files went. Gating the whole strip on the kinds would have taken the
         answer away in the one case that needs it. -->
    <div class="aci-inventory-rail__tabs">
      <p id="aci-inventory-rail-kinds" class="aci-inventory-rail__group">Customization files</p>
      <!-- The group is what is empty, and the group is the rail's, so the rail
           says so. Said in the panel it would sit under the heading of
           whichever entry is selected — a statement about the kinds, under
           `Files in no kind` — and would vanish when the reader moved to the
           other entry, though nothing about the scan had changed. -->
      <p v-if="kinds.length === 0" class="aci-inventory-rail__group-note">None recognized.</p>
      <!-- The tablist is the strip of tabs and nothing else: the heading above
           names it through `aria-labelledby` rather than sitting inside it,
           where it was both a non-tab child of a `tablist` and — once the strip
           became one scrolling line at narrow widths — the first thing that
           line scrolled. -->
      <div
        class="aci-inventory-rail__strip"
        role="tablist"
        :aria-orientation="stripIsHorizontal ? 'horizontal' : 'vertical'"
        aria-labelledby="aci-inventory-rail-kinds"
      >
        <button
          v-for="(candidate, index) in selections"
          :id="inventoryTabId(candidate)"
          :key="candidate"
          :class="[
            'aci-inventory-rail__tab',
            { 'aci-inventory-rail__tab--apart': candidate === NON_KIND_SELECTION_ORDER[0] },
          ]"
          type="button"
          role="tab"
          :aria-controls="candidate === activeSelection ? inventoryPanelId(candidate) : undefined"
          :aria-selected="candidate === activeSelection"
          :tabindex="candidate === tabStop ? 0 : -1"
          @click="emit('select', candidate)"
          @keydown="onKeydown($event, index)"
        >
          {{ INVENTORY_SELECTION_TEXT[candidate] }}
          <span class="aci-inventory-rail__count">{{ counts.get(candidate) ?? 0 }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aci-inventory-rail {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* The label over each group. Small and quiet, because it names a group rather
   than being one of the things a reader is choosing between. */
.aci-inventory-rail__group {
  color: var(--aci-muted);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin: 0 0 0.375rem;
  padding-inline: 0.6rem;
  text-transform: uppercase;
}

.aci-inventory-rail__sources {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* A Source entry leaves the page, so it is a link and looks like one: the name
   on the first line and the status under it, rather than the single line the
   panel selectors run on. The two shapes are what keep a route from reading as
   another tab. */
.aci-inventory-rail__route {
  border-inline-start: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  padding: 0.25rem 0.75rem 0.25rem 0.625rem;
}

/* No underline, where every other link in the product carries one (main.css
   § a). That rule identifies a link against the text around it (WCAG 1.4.1),
   and there is no text around these: every entry in this rail is activatable,
   so an underline on two of them says "link" where what actually separates
   them from the tabs below is that activating them leaves the page — which is
   what the arrow at the end of the line says. Hover brightens the label, the
   same feedback the tabs give. */
.aci-inventory-rail__route {
  text-decoration: none;
}

.aci-inventory-rail__route:hover {
  border-inline-start-color: var(--aci-line);
  color: var(--aci-text);
}

/* The name and, at the end of the line, the mark that says this entry leaves
   the page. The mark rather than an underline: every entry in this rail is
   activatable, so underlining two of them says "link" where what distinguishes
   them is where activating them goes — the tabs below stay on this page and
   these two do not. */
.aci-inventory-rail__route-name {
  align-items: center;
  display: flex;
  gap: 0.375rem;
  inline-size: 100%;
}

.aci-inventory-rail__route-mark {
  block-size: 0.8125rem;
  inline-size: 0.8125rem;
  margin-inline-start: auto;
  opacity: 0.55;
}

/* How a Source's scan ended, said in a few words beside its name. The border
   is what identifies it, so it survives forced colours where the text colour
   alone would have to (WCAG 1.4.11), and the dot is what makes a status read as
   a state rather than as a second label. */
.aci-inventory-rail__status {
  align-items: center;
  align-self: flex-start;
  border: 1px solid var(--aci-line);
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.6875rem;
  gap: 0.3em;
  line-height: 1.5;
  padding: 0 0.5625rem;
  white-space: nowrap;
}

.aci-inventory-rail__status--warn {
  border-color: var(--aci-warn);
  color: var(--aci-warn);
}

.aci-inventory-rail__status-dot {
  background: currentcolor;
  block-size: 0.375rem;
  border-radius: 999px;
  flex: none;
  inline-size: 0.375rem;
}

/* The group label's own note, at its size and colour but not its letterform:
   it is a sentence rather than a label, so it takes neither the tracking nor
   the uppercase. */
.aci-inventory-rail__group-note {
  color: var(--aci-muted);
  font-size: 0.6875rem;
  margin: -0.125rem 0 0.5rem;
  padding-inline: 0.6rem;
}

/* Words alone, at the status's size: a Source with no state, or the note a
   status carries under its pill. */
.aci-inventory-rail__status-note {
  align-self: flex-start;
  color: var(--aci-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

/* Separated from the Sources above it by a rule, which is what the two
   groups' headings alone did not do: a heading names a group, and the line is
   what ends the one before it. */
.aci-inventory-rail__strip {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

/* The line that ends the Sources group, inset from the rail's edges rather than
   drawn across it: it separates two groups inside one panel, where a full-bleed
   rule would read as the panel itself ending. */
.aci-inventory-rail__tabs::before {
  background: var(--aci-hairline);
  block-size: 1px;
  content: '';
  display: block;
  margin: 0.375rem 0.75rem 0.625rem;
}

/* The selected entry is a fill, a weight, and a leading edge. The edge is what
   survives a forced-colors rendering, where the fill is discarded (WCAG
   1.4.11): a selection identified by its background alone would vanish there. */
.aci-inventory-rail__tab {
  background: none;
  border: 1px solid transparent;
  border-inline-start-width: 2px;
  border-radius: 0;
  color: var(--aci-muted);
  cursor: pointer;
  /* The label leads and the count closes the line, so the counts form a column
     of their own that a reader can compare down. */
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  font: inherit;
  padding: 0.25rem 0.75rem 0.25rem 0.625rem;
  text-align: start;
}

.aci-inventory-rail__tab:hover {
  background: none;
  color: var(--aci-text);
}

.aci-inventory-rail__tab[aria-selected='true'] {
  background: var(--aci-accent-soft);
  border-inline-start-color: var(--aci-accent);
  color: var(--aci-text);
  font-weight: 600;
}

/* The first entry that is not a customization kind. A rule above it says the
   two below select lists of a different sort, without a heading that would
   name a group of two. */
.aci-inventory-rail__tab--apart {
  border-block-start: 1px solid var(--aci-hairline);
  margin-block-start: 0.4rem;
  padding-block-start: 0.5rem;
}

.aci-inventory-rail__tab:focus-visible {
  outline: 2px solid var(--aci-accent);
  outline-offset: -2px;
}

/* The counts are a column a reader compares down, so they are set in the
   monospace face at its own size with tabular figures: proportional digits put
   `11` and `20` at different widths, which is the comparison the column is
   for. */
.aci-inventory-rail__count {
  color: var(--aci-muted);
  font-family: ui-monospace, monospace;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

/* The selected entry's count takes the accent the leading edge already uses,
   so the selection reads as one mark rather than as a band with a stray
   muted number in it. */
.aci-inventory-rail__tab[aria-selected='true'] .aci-inventory-rail__count {
  color: var(--aci-accent);
}

/* Below the two-column threshold the rail sits above the rows, and fifteen
   stacked entries fill the screen before the list starts — the rows are then a
   screen away, and the skip link that would jump there is invisible until it
   takes focus. The entries become one scrolling line instead: they are a
   tablist, so a strip keeps every kind one press away with the selected one in
   view, where a disclosure would hide which kind is selected behind a control
   and add a state the wide layout does not have. The Sources pair stays
   stacked — two short entries, and neither is a tab.

   The selection marker moves with the axis: a leading edge in a column is a
   bottom edge in a row, drawn on the line the strip sits on. */
@media (width < 48rem) {
  .aci-inventory-rail {
    gap: 0.375rem;
  }

  .aci-inventory-rail__strip {
    border-block-end: 1px solid var(--aci-hairline);
    flex-direction: row;
    gap: 0;
    overflow-x: auto;
    padding-block-end: 0.125rem;
  }

  /* The rule that ended the Sources group belongs across the rail, not between
     two entries of one line. */
  .aci-inventory-rail__tabs::before {
    display: none;
  }

  .aci-inventory-rail__group {
    padding-inline: 0.75rem;
  }

  .aci-inventory-rail__tab {
    border-block-end: 2px solid transparent;
    border-inline-start-width: 1px;
    flex: none;
    gap: 0.375rem;
    justify-content: flex-start;
  }

  .aci-inventory-rail__tab[aria-selected='true'] {
    background: none;
    border-block-end-color: var(--aci-accent);
    border-inline-start-color: transparent;
  }

  .aci-inventory-rail__tab--apart {
    border-block-start: 0;
    margin-block-start: 0;
    margin-inline-start: 0.5rem;
    padding-block-start: 0.25rem;
  }
}
</style>
