<script setup lang="ts">
// The read-only authored-source comparison surface for one plugin's files
// (T831; research.md § 7, FR-011, FR-027): the two copies of one file two
// carriers' plugin roots both ship, each the exact source the host committed.
//
// The component owns one Monaco diff instance's whole lifetime: it mounts on
// its pair of sources and disposes editor and models together on unmount or
// replacement. Nothing about either text is transformed on the way in — each
// side is the exact `sourceText` the host committed, handed to the editor as
// a string. There is no `v-html`, no link, and no image load anywhere here,
// and no control edits, merges, or reverts either side (FR-012).
//
// The mount is asynchronous because the editor is loaded lazily, so the pair
// can change while it is still arriving. The generation counter below is what
// keeps that from showing the wrong files: only the newest request may keep
// its editor.
//
// If the environment cannot construct the diff — the editor chunk did not
// arrive, or the browser refused the editor — the complete read-only
// side-by-side sources stay available as inert text with an actionable
// failure beside them, and neither file is treated as valid or invalid
// (research.md § 7). That rendering is the failure path only: there is
// deliberately no standing toggle to it.
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { SourceDiffHandle } from '../../composables/monaco';
import {
  SOURCE_VIEWER_LANGUAGE_GRAMMAR,
  type SourceViewerLanguage,
} from '../inspection/source-viewer-language';
import { escapeControlCharacters, inlinePresentationLabel } from '../../../shared/entities';

const props = defineProps<{
  /** The first side's complete decoded source, exactly as committed. */
  readonly originalText: string;
  /** The first side's Source-relative Path: language choice and label. */
  readonly originalPath: string;
  /** The second side's text; see {@link originalText}. */
  readonly modifiedText: string;
  /** The second side's Source-relative Path: language choice and label. */
  readonly modifiedPath: string;
  /**
   * Whether the first side is a one-sided comparison's stated absence rather
   * than a file: its empty text is diff arithmetic, and the surface labels the
   * difference rather than showing an empty document (FR-025).
   */
  readonly originalAbsent?: boolean;
  /** Whether the second side is that absence; see {@link originalAbsent}. */
  readonly modifiedAbsent?: boolean;
  /**
   * What of each file the sides show, spliced into each side's accessible
   * name (`SourceComparisonInput.contentLabel`) — `frontmatter of` on the
   * serialized-frontmatter diff — so a serialized slice is never announced
   * as the whole file (FR-025). Omitted, the sides are the files.
   */
  readonly contentLabel?: string;
  /**
   * The language both sides are tokenized in, overriding what their paths
   * claim: a serialized document is the format this surface serialized it to
   * rather than the format of the file it came from (`monaco.ts` § showSource).
   */
  readonly contentLanguage?: SourceViewerLanguage;
  /**
   * The content-owner registry this diff joins instead of the session's, for a
   * surface that owns the drop: a pick replaces the open pair without a purge,
   * and the contract orders dispose before replace (data-model.md
   * § BrowserState).
   */
  readonly registerContentOwner: (dispose: () => void) => () => void;
}>();

/** The element Monaco takes over; empty until the editor is mounted. */
const host = ref<HTMLDivElement | null>(null);
/** The mounted diff editor, or null before the first mount and after teardown. */
const viewer = shallowRef<SourceDiffHandle | null>(null);
/**
 * Set when loading or mounting the diff editor failed — the
 * environment-determined rendering failure research.md § 7 names. The
 * template keeps the complete side-by-side sources readable as inert text
 * and offers a retry. There is deliberately no standing toggle to this
 * rendering: the fallback is the failure path, not a reader preference.
 */
const mountError = shallowRef<boolean>(false);

/**
 * The failure copy, bound to the visible error and to the stable live region
 * that announces it (WCAG 4.1.3). The fallback stays on screen below it,
 * which is what the second sentence points the reader at — neutrally about
 * layout, because the fallback stacks on a narrow viewport, and about
 * count, because a one-sided comparison's fallback is one complete source
 * beside a stated absence.
 */
const MOUNT_ERROR_MESSAGE =
  'The comparison viewer could not be loaded. Each side is shown below in full.';

/** The fallback's two sides, so the purge can empty them synchronously. */
const fallbackElements = ref<HTMLPreElement[]>([]);

/**
 * Set by the purge. The failure rendering binds both sources directly, so
 * the text is in the DOM without an editor to dispose: the purge clears the
 * elements and this stops the next render from writing them back before the
 * component unmounts (FR-027, data-model.md § BrowserState).
 */
const purged = shallowRef(false);
/**
 * Counts pair changes. A mount that resolves after a newer change sees a
 * different value and abandons its editor instead of showing older files
 * under the newer pair's headings.
 */
let requestedPair = 0;
/** True once teardown has run, so a late mount disposes instead of attaching. */
let unmounted = false;

// The models this component mounts hold the pair's authored source — both
// files', or the present side's beside an absent side's empty operand — so
// it is an owner the comparison state must clear synchronously — on the
// central purge (FR-027) and before a greater generation is adopted
// (data-model.md § BrowserState).
// The registration is unconditional — the caller always passes its pair's
// registry — because a mount that skipped it would hold authored content
// the central purge cannot clear.
const unregisterContentOwner = props.registerContentOwner(() => {
  // Supersede any mount still in flight before disposing: a mount resolving
  // after the disposal would otherwise attach and write the dropped sources
  // into fresh models during the one flush before this component unmounts.
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
 * Mounts the diff editor for the current pair, replacing any mounted one.
 *
 * A handle is bound to the pair it was mounted with (SourceDiffHandle), so a
 * changed pair disposes the old editor and mounts a fresh one — which is
 * also the path the first pair takes, and the retry.
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
  const mounted = await SourceDiffHandle.mount(
    element,
    {
      originalText: props.originalText,
      originalPath: props.originalPath,
      modifiedText: props.modifiedText,
      modifiedPath: props.modifiedPath,
      originalAbsent: props.originalAbsent === true,
      modifiedAbsent: props.modifiedAbsent === true,
      // Spread conditionally: `exactOptionalPropertyTypes` keeps an absent
      // language distinct from an undefined one on the mount input.
      // The grammar the named format is coloured by, not the name itself: the
      // mount input takes a registered Monaco id
      // (`source-viewer-language.ts` § SOURCE_VIEWER_LANGUAGE_GRAMMAR).
      ...(props.contentLanguage === undefined
        ? {}
        : { contentLanguage: SOURCE_VIEWER_LANGUAGE_GRAMMAR[props.contentLanguage] }),
      ...(props.contentLabel === undefined ? {} : { contentLabel: props.contentLabel }),
    },
    { fitContent: true },
  ).catch(() => null);
  if (mounted === null) {
    // The editor chunk or its construction failed. Neither source is lost —
    // the fallback below binds both — so the honest state is a visible
    // failure with a retry above the complete side-by-side text. Nothing
    // held focus in the swapped-out region — the host is an empty box until
    // a mount succeeds — so no focus rescue is needed here; a failed retry
    // keeps its own button mounted and focused (WCAG 2.4.3).
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
 * The failure-state retry; the same focus contract as the single-file
 * viewer's retry (WCAG 2.4.3): a success continues into the editor, a
 * second failure leaves the button mounted and focused.
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
  () => [props.originalText, props.originalPath, props.modifiedText, props.modifiedPath] as const,
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
  <!-- The box keeps the width its side-by-side rendering needs and this
       wrapper scrolls it, so a narrow viewport scrolls the diff rather than
       the page (WCAG 1.4.10). -->
  <div v-show="!mountError" class="aci-plugin-source-diff__scroller" tabindex="0">
    <div ref="host" class="aci-plugin-source-diff" />
  </div>
  <!-- Stable rather than inserted with the failure it reports, because a
       region that appears together with its message is not reliably read. -->
  <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
    {{ mountError ? MOUNT_ERROR_MESSAGE : '' }}
  </p>
  <p v-if="mountError" class="aci-error">
    {{ MOUNT_ERROR_MESSAGE }}
    <button type="button" @click="retryMount">Try again</button>
  </p>
  <!-- The complete side-by-side fallback: both sources as inert text nodes —
       no markup, no links, no editor — shown when the editor could not be
       loaded at all (research.md § 7). Each side is headed by its own path so
       neither file loses its identity to the layout. `tabindex` because each
       box scrolls (WCAG 2.1.1); see the single-file viewer. -->
  <div v-if="mountError" class="aci-plugin-source-diff__fallback">
    <section
      v-for="side in [
        {
          path: originalPath,
          text: originalText,
          caption: 'First file',
          absent: originalAbsent === true,
        },
        {
          path: modifiedPath,
          text: modifiedText,
          caption: 'Second file',
          absent: modifiedAbsent === true,
        },
      ]"
      :key="side.caption"
      class="aci-plugin-source-diff__fallback-side"
    >
      <!-- The visible caption keeps the authored spelling under `pre-wrap`;
           the accessible name is the whitespace-safe spelling, because the
           name computation collapses whitespace and two paths differing
           only in it must not name one region (FR-025). A path that
           happens to spell the absence note stays as authored — matching
           this product's own copy against authored text would turn display
           wording into load-bearing syntax — so in the flat name that
           corner reads like the note; the muted styling tells them apart
           visibly, and the diff labels carry each side's exact identity. -->
      <h4
        class="aci-plugin-source-diff__fallback-caption"
        :aria-label="`${side.caption} ${contentLabel === undefined || side.absent ? '' : `${contentLabel} `}${inlinePresentationLabel(side.path)}${
          side.absent ? ' (no file in this plugin)' : ''
        }`"
      >
        {{ side.caption }}
        <span class="aci-path aci-authored-text">{{ escapeControlCharacters(side.path) }}</span>
        <!-- An absent side is the stated absence, not an empty file: without
             the note, this caption would name a file the copy does not ship
             over a blank box that reads as authored-empty (FR-025). -->
        <span v-if="side.absent" class="aci-muted">(no file in this plugin)</span>
      </h4>
      <pre
        v-if="!side.absent"
        ref="fallbackElements"
        class="aci-plugin-source-diff__fallback-source"
        tabindex="0"
        >{{ purged ? '' : side.text }}</pre>
      <p v-else class="aci-note">
        This side has no file; the other side's complete content is the difference.
      </p>
    </section>
  </div>
</template>

<style scoped>
/* Monaco lays out inside a sized box and collapses to nothing without a
   definite height; the same sizing contract as the single-file viewer. */
.aci-plugin-source-diff {
  /* The type every read-only source surface is laid out in, which `monaco.ts`
     reads off this element rather than keeping a copy (§ typeMetricsOf). */
  font-size: var(--aci-source-font-size);
  line-height: var(--aci-source-line-height);
  block-size: auto;
  max-block-size: 28rem;
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
  /* The width the side-by-side rendering needs. Monaco's diff editor drops to
     one inline column below its own 900px breakpoint
     (`renderSideBySideInlineBreakpoint`, which `monaco.ts` leaves at the
     default), and a comparison shown as one column is no longer a comparison:
     the two files stop standing opposite each other. Measured on the pinned
     revisions: a 960px page gives a 920px editor and keeps two columns, while
     940px gives 900 and collapses. Below that the wrapper scrolls this box
     sideways rather than the page — a side-by-side diff is content that
     requires a two-dimensional layout for its meaning, which is what WCAG
     1.4.10 excepts, and keeping the scroll inside the box is what keeps the
     page itself reflowing. */
  min-inline-size: 60rem;
}

/* The scroller that holds the box above at its own width without widening the
   page (WCAG 1.4.10). `tabindex` because WebKit does not make a scrollable
   overflow container keyboard focusable on its own, so a reader with no
   pointer could reach the diff's text and never scroll it (WCAG 2.1.1). */
.aci-plugin-source-diff__scroller {
  overflow-x: auto;
}

/* The two complete sources side by side, stacking on a narrow viewport where
   two columns would crush both (WCAG 1.4.10). */
.aci-plugin-source-diff__fallback {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-plugin-source-diff__fallback {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-plugin-source-diff__fallback-caption {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* `pre` keeps the authored line structure; long lines scroll inside the block
   rather than widening the page. */
.aci-plugin-source-diff__fallback-source {
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  margin: 0;
  max-block-size: 28rem;
  overflow: auto;
  padding: 0.5rem;
}
</style>
