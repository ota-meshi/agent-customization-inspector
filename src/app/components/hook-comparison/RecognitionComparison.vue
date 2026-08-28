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
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { canonicalHookEventJsonText } from '../declared-entries-json';
import { SourceDiffHandle } from '../../composables/monaco';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { escapeControlCharacters, inlinePresentationLabel } from '../../../shared/entities';
import type { HookCarrierDetailDto } from '../../../shared/api-types';

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
  readonly leftAttribution: string;
  /** The second carrier's recognitions; see {@link leftAttribution}. */
  readonly rightAttribution: string;
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
 * The whitespace-safe event spelling the sides' accessible names carry: an
 * accessible name is flattened, so an authored key differing only in
 * whitespace must not announce identically (FR-025). The empty key — strict
 * JSON accepts the empty string as an event name — is noted the way every
 * surface notes it rather than announcing as nothing.
 */
const eventAccessibleText = computed(() =>
  props.event === '' ? '(empty name)' : inlinePresentationLabel(props.event),
);

/** What of each carrier the diff shows, spliced into each side's accessible name. */
const contentLabel = computed(() => `declaration ${eventAccessibleText.value} of`);

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
        attribution: props.leftAttribution,
        text: serialize(props.leftDetail),
      },
      {
        caption: 'Second file',
        path: props.rightDetail.file.sourceRelativePath,
        factsText: props.rightFactsText,
        attribution: props.rightAttribution,
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
// generation is adopted (data-model.md § BrowserState). Optional, because
// this component's contract is its props — a harness that renders it without
// the shell simply has no owner registry to join.
const sessionViewState = inject(SESSION_VIEW_STATE, undefined);
const unregisterContentOwner = sessionViewState?.hookComparison.registerOpenContentOwner(() => {
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
  unregisterContentOwner?.();
  disposeViewer();
});
</script>

<template>
  <div class="aci-hook-recognition-comparison">
    <!-- Each side stated with its own identity — path, Source, kind, carrier
         form, and read outcome, plus the products whose recognitions the row
         lists for it — so neither declaration loses its carrier to the diff
         (US3 scenario 2). The order is the link's: first named, first shown. -->
    <div class="aci-hook-recognition-comparison__files">
      <section v-for="side in sides" :key="side.caption">
        <h3>{{ side.caption }}</h3>
        <p class="aci-hook-recognition-comparison__path aci-path aci-authored-text">
          {{ escapeControlCharacters(side.path) }}
        </p>
        <p class="aci-note">{{ side.factsText }}</p>
        <p v-if="side.attribution !== ''" class="aci-note">{{ side.attribution }}</p>
      </section>
    </div>

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

/* The two identities side by side above the diff, stacking on a narrow
   viewport (WCAG 1.4.10). */
.aci-hook-recognition-comparison__files {
  display: grid;
  gap: 0.25rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-hook-recognition-comparison__files {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-hook-recognition-comparison__files p {
  margin: 0.1rem 0;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-hook-recognition-comparison__path {
  overflow-wrap: anywhere;
}

/* Monaco lays out inside a sized box and collapses to nothing without a
   definite height; the same sizing contract as the sibling surfaces. */
.aci-hook-recognition-comparison__diff {
  border: 1px solid var(--aci-border);
  border-radius: 4px;
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
  border: 1px solid var(--aci-border);
  border-radius: 4px;
  margin: 0;
  max-block-size: 28rem;
  overflow: auto;
  padding: 0.5rem;
}
</style>
