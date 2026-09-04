<script setup lang="ts">
// The hook recognition comparison surface (T911; research.md § 7, FR-011,
// FR-012, FR-027): one declared lifecycle event as two carriers wrote it.
// Each side states the carrier it is — its path, its file facts, and the
// products whose recognitions the row lists for it — and each side's
// declaration is serialized to one canonical JSON document
// (declared-entries-json.ts) diffed read-only in Monaco.
//
// The serialized documents are this surface's own rendering, not the
// carriers' bytes: a hook carrier shows its source nowhere (FR-007), and one
// event can be declared in TOML by a Codex layer and in JSON by a settings
// document, so a shared canonical form is what makes the two sides align at
// all. Both models are therefore created as `json` whatever the carriers'
// syntaxes are (`SourceComparisonInput.contentLanguage`).
//
// The component owns one Monaco diff instance's whole lifetime: it mounts on
// its pair of serializations and disposes editor and models together on
// unmount or replacement. Nothing is masked, shortened, or substituted on the
// way in (FR-025, FR-026); there is no `v-html`, no link, and no control that
// runs, edits, merges, or reverts either side (FR-012, FR-020). No side
// carries a runtime fact — which source a client would prefer, whether a hook
// is trusted — because no row holds one (FR-009).
//
// The mount is asynchronous because the editor is loaded lazily, so the pair
// can change while it is still arriving; the generation counter below keeps a
// late mount from showing the wrong declarations. If the environment cannot
// construct the diff, the complete serializations stay available as inert
// text with an actionable failure beside them (research.md § 7); that
// rendering is the failure path only, with no standing toggle to it.
import { AuthoredName } from '../authored-name';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { canonicalHookEventJsonText } from '../declared-entries-json';
import RecognitionTable from '../comparison/RecognitionTable.vue';
import { SourceDiffHandle } from '../../composables/monaco';
import { useSessionViewState } from '../../composables/session-view-state';
import { escapeControlCharacters, inlinePresentationLabel } from '../../../shared/entities';
import type { HookCarrierDetailDto, HookDeclarationDto } from '../../../shared/api-types';

const props = defineProps<{
  /**
   * The declared event whose row owns the comparison, in the carriers' own
   * spelling (FR-007). Both sides serialize this one event, so it is also
   * what each side's accessible name names.
   */
  readonly event: string;
  /** The first compared carrier's adopted detail (FR-030). */
  readonly leftDetail: HookCarrierDetailDto;
  /** The second compared carrier's adopted detail. */
  readonly rightDetail: HookCarrierDetailDto;
  /**
   * The products whose recognitions the row lists for the first carrier, each
   * with the surfaces its admission rests on — the inventory row's own
   * statements, repeated per side so neither declaration loses which product
   * reads it. Naming a surface never claims it ran the hook (FR-009).
   */
  readonly leftRecognitions: readonly HookDeclarationDto[];
  /** The second carrier's recognitions; see {@link leftRecognitions}. */
  readonly rightRecognitions: readonly HookDeclarationDto[];
  /**
   * The first carrier's facts line — its Source family, its carrier form, and
   * its read outcome — composed by the page, which holds the session's
   * Sources: the two sides can be two Sources, so the family is each side's
   * own fact (FR-002, FR-030).
   */
  readonly leftFactsText: string;
  /** The second carrier's facts line; see {@link leftFactsText}. */
  readonly rightFactsText: string;
}>();

/**
 * What of each carrier the diff shows, spliced into each side's accessible
 * name through the whitespace-safe spelling: an accessible name is flattened,
 * so an authored key differing only in whitespace must not announce
 * identically, and a key with nothing to draw is noted rather than announcing
 * as nothing (FR-025; {@link AuthoredName}).
 */
const contentLabel = computed(
  () => `declaration ${new AuthoredName(props.event).singleLineText} of`,
);

/**
 * One side's serialized declaration, or the empty object when this carrier's
 * reading declares the event nowhere. A ready pair always holds the event on
 * both sides — the compare route only opens carriers the event's row lists —
 * so the empty document is the torn frame between a snapshot replacement and
 * the re-request it triggers, rendered rather than thrown.
 */
function serialize(detail: HookCarrierDetailDto): string {
  const declared = (detail.events ?? []).find((candidate) => candidate.event === props.event);
  return declared === undefined ? '{}' : canonicalHookEventJsonText(declared);
}

/** The two sides as the template renders them, in the link's own order. */
const sides = computed(
  () =>
    [
      {
        caption: 'First file',
        path: props.leftDetail.file.sourceRelativePath,
        factsText: props.leftFactsText,
        recognitions: props.leftRecognitions,
        text: serialize(props.leftDetail),
      },
      {
        caption: 'Second file',
        path: props.rightDetail.file.sourceRelativePath,
        factsText: props.rightFactsText,
        recognitions: props.rightRecognitions,
        text: serialize(props.rightDetail),
      },
    ] as const,
);

/** The element Monaco takes over; empty until the editor is mounted. */
const host = ref<HTMLDivElement | null>(null);
/** The mounted diff editor, or null before the first mount and after teardown. */
const viewer = shallowRef<SourceDiffHandle | null>(null);
/**
 * Set when loading or mounting the diff editor failed — the
 * environment-determined rendering failure research.md § 7 names. The
 * template keeps the complete side-by-side serializations readable as inert
 * text and offers a retry.
 */
const mountError = shallowRef<boolean>(false);

/**
 * The failure copy, bound to the visible error and to the stable live region
 * that announces it (WCAG 4.1.3); the fallback stacks below it.
 */
const MOUNT_ERROR_MESSAGE =
  'The comparison viewer could not be loaded. Each side is shown below in full.';

/** The fallback's two sides, so the purge can empty them synchronously. */
const fallbackElements = ref<HTMLPreElement[]>([]);

/**
 * Set by the purge. The failure rendering binds both serializations directly,
 * so the text is in the DOM without an editor to dispose: the purge clears
 * the elements and this stops the next render from writing them back before
 * the component unmounts (FR-027, data-model.md § BrowserState).
 */
const purged = shallowRef(false);
/**
 * Counts pair changes. A mount that resolves after a newer change sees a
 * different value and abandons its editor instead of showing older
 * declarations under the newer pair's headings.
 */
let requestedPair = 0;
/** True once teardown has run, so a late mount disposes instead of attaching. */
let unmounted = false;

// The models this component mounts hold the pair's declared values in full —
// credentials included (FR-025) — so it is an owner the comparison state must
// clear synchronously: on the central purge (FR-027) and before a greater
// generation is adopted (data-model.md § BrowserState).
// The registration is unconditional — the shell always provides the
// session (`useSessionViewState`) — because a mount that skipped it
// would hold authored content the central purge cannot clear.
const sessionViewState = useSessionViewState();
const unregisterContentOwner = sessionViewState.hookComparison.registerOpenContentOwner(() => {
  // Supersede any mount still in flight before disposing: a mount resolving
  // after the disposal would otherwise attach and write the dropped
  // declarations into fresh models during the one flush before this component
  // unmounts.
  requestedPair += 1;
  disposeViewer();
  purged.value = true;
  for (const element of fallbackElements.value) {
    element.replaceChildren();
  }
});

/** Disposes the mounted diff editor and both models; safe to call twice. */
function disposeViewer(): void {
  viewer.value?.dispose();
  viewer.value = null;
}

/**
 * Mounts the diff editor for the current pair, replacing any mounted one. A
 * handle is bound to the pair it was mounted with (SourceDiffHandle), so a
 * changed pair disposes the old editor and mounts a fresh one — which is also
 * the path the first pair takes, and the retry.
 */
async function showCurrentPair(): Promise<void> {
  requestedPair += 1;
  const requested = requestedPair;
  // A new pair reclaims a purged instance: the purge condemned the previous
  // pair's text, and Vue can hand this same component the next pair without
  // an unmount, so a fallback render after a later mount failure would
  // otherwise stay blank for content the purge never touched.
  purged.value = false;
  const element = host.value;
  if (element === null) {
    return;
  }
  disposeViewer();
  const [left, right] = sides.value;
  const mounted = await SourceDiffHandle.mount(
    element,
    {
      originalText: left.text,
      originalPath: left.path,
      modifiedText: right.text,
      modifiedPath: right.path,
      // Both sides are this surface's canonical JSON serialization, so the
      // models take the `json` colouring a `.json` file's model gets
      // (monaco-languages.ts) whatever the carriers' own extensions would
      // resolve to — a Codex layer declares hooks in TOML.
      contentLanguage: 'json',
      contentLabel: contentLabel.value,
    },
    {
      // Always content-fit: both sides are one event's document, which is
      // usually short, and a fixed reading box would be mostly empty frame
      // (`SourceDiffHandle.mount` § fitContent).
      fitContent: true,
    },
  ).catch(() => null);
  if (mounted === null) {
    // The editor chunk or its construction failed. Neither serialization is
    // lost — the fallback below binds both — so the honest state is a visible
    // failure with a retry above the complete side-by-side text (WCAG 2.4.3:
    // nothing held focus in the empty host, so no rescue).
    if (!unmounted && requested === requestedPair) {
      mountError.value = true;
    }
    return;
  }
  if (unmounted || requested !== requestedPair) {
    // A newer pair (or teardown) won while the editor was loading. This
    // instance was never shown, so disposing it is the whole cleanup.
    mounted.dispose();
    return;
  }
  viewer.value = mounted;
  // Cleared only once the mount actually succeeded, so a retry that fails
  // again keeps its button mounted and focused (WCAG 2.4.3).
  mountError.value = false;
}

/**
 * The failure-state retry; the same focus contract as the sibling comparison
 * surfaces' retry (WCAG 2.4.3): a success continues into the editor, a second
 * failure leaves the button mounted and focused.
 */
async function retryMount(): Promise<void> {
  await showCurrentPair();
  await nextTick();
  if (!mountError.value && document.activeElement === document.body) {
    viewer.value?.focus();
  }
}

onMounted(() => {
  void showCurrentPair();
});

watch(
  () => sides.value.map((side) => `${side.path} ${side.text}`).join(''),
  () => {
    void showCurrentPair();
  },
);

onBeforeUnmount(() => {
  unmounted = true;
  unregisterContentOwner();
  disposeViewer();
});
</script>

<template>
  <div class="aci-hook-recognition-comparison">
    <!-- Each side stated with its own identity — path, Source, kind, carrier
         form, and read outcome — so neither declaration loses its carrier to
         the diff (US3 scenario 2). Which products read it is the recognition
         table's, below. The order is the link's: first named, first shown. -->
    <div class="aci-compare-sides">
      <section v-for="side in sides" :key="side.caption" class="aci-compare-side">
        <span class="aci-compare-side__caption">{{ side.caption }}</span>
        <p class="aci-hook-recognition-comparison__path aci-path aci-authored-text">
          {{ escapeControlCharacters(side.path) }}
        </p>
        <p class="aci-note">{{ side.factsText }}</p>
      </section>
    </div>

    <!-- Which product reads which side. On the table rather than on the cards
         above, because only a cell can say that a product reads neither
         carrier (`RecognitionTable.vue`). -->
    <RecognitionTable :sides="sides" />

    <!-- Titled like the recognition block above it, so the page reads as the
         same three tiers every kind's comparison does: what is being compared,
         who reads it, and the difference itself. -->
    <h3 class="aci-compare-block-title">Declaration</h3>
    <!-- What the diff holds, said before it: both sides are this surface's
         canonical serialization of the declaration, not the carriers' own
         spellings — one event can be declared in a TOML layer and in a JSON
         settings document, and neither file's source is shown (FR-007). The
         canonical key order is stated too, because a reader comparing against
         their own file would otherwise read the order as authored. -->
    <p class="aci-note">
      Each side is this event's declaration serialized as JSON with nested keys in one canonical
      order; the files' own syntax and key order are not shown.
    </p>

    <div v-show="!mountError" ref="host" class="aci-hook-recognition-comparison__diff" />
    <!-- Stable rather than inserted with the failure it reports, because a
         region that appears together with its message is not reliably read. -->
    <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
      {{ mountError ? MOUNT_ERROR_MESSAGE : '' }}
    </p>
    <p v-if="mountError" class="aci-error">
      {{ MOUNT_ERROR_MESSAGE }}
      <button type="button" @click="retryMount">Try again</button>
    </p>
    <!-- The complete side-by-side fallback: both serializations as inert text
         nodes — no markup, no links, no editor — shown when the editor could
         not be loaded at all (research.md § 7). Each side is headed by its
         carrier's path so neither declaration loses its identity to the
         layout. `tabindex` because each box scrolls (WCAG 2.1.1). -->
    <div v-if="mountError" class="aci-hook-recognition-comparison__fallback">
      <section
        v-for="side in sides"
        :key="side.caption"
        class="aci-hook-recognition-comparison__fallback-side"
      >
        <!-- The visible caption keeps the authored spelling under `pre-wrap`;
             the accessible name is the whitespace-safe spelling, because the
             name computation collapses whitespace and two paths differing only
             in it must not name one region (FR-025). -->
        <h4
          class="aci-hook-recognition-comparison__fallback-caption"
          :aria-label="`${side.caption} ${contentLabel} ${inlinePresentationLabel(side.path)}`"
        >
          {{ side.caption }}
          <span class="aci-path aci-authored-text">{{ escapeControlCharacters(side.path) }}</span>
        </h4>
        <pre
          ref="fallbackElements"
          class="aci-hook-recognition-comparison__fallback-source"
          tabindex="0"
          >{{ purged ? '' : side.text }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.aci-hook-recognition-comparison {
  display: flex;
  flex-direction: column;
}

.aci-hook-recognition-comparison h3 {
  font-size: 1rem;
  margin: 0.5rem 0 0.1rem;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-hook-recognition-comparison__path {
  overflow-wrap: anywhere;
}

/* Monaco lays out inside a sized box and collapses to nothing without a
   definite height; the same sizing contract as the sibling surfaces. */
.aci-hook-recognition-comparison__diff {
  /* The type every read-only source surface is laid out in, which `monaco.ts`
     reads off this element rather than keeping a copy (§ typeMetricsOf). */
  font-size: var(--aci-source-font-size);
  line-height: var(--aci-source-line-height);
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  /* The corners are the box's, so what it holds is clipped to them: Monaco
     paints an opaque square panel, and without this it filled all four rounded
     corners — a frame that looked broken rather than rounded. It does not
     reach the editor's own scrolling, which happens inside
     `.monaco-scrollable-element`. `box-sizing` because the width is `100%` and
     the border is a pixel: on the content box the two made the element two
     pixels wider than the box holding it, so every diff sat two pixels
     short of its own right border. */
  box-sizing: border-box;
  overflow: hidden;
  inline-size: 100%;
  /* Content-fit: the mounted handle writes the taller document's height to
     the element (`SourceDiffHandle.mount` § fitContent) and this cap keeps a
     long declaration from taking the page — past it, the diff scrolls inside
     its box. */
  max-block-size: 28rem;
  min-block-size: 3rem;
}

/* The two complete serializations side by side, stacking on a narrow viewport
   where two columns would crush both (WCAG 1.4.10). */
.aci-hook-recognition-comparison__fallback {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-hook-recognition-comparison__fallback {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-hook-recognition-comparison__fallback-caption {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* `pre` keeps the serialized line structure; long lines scroll inside the
   block rather than widening the page. */
.aci-hook-recognition-comparison__fallback-source {
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  margin: 0;
  max-block-size: 28rem;
  overflow: auto;
  padding: 0.5rem;
}
</style>
