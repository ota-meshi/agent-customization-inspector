<script setup lang="ts">
// The MCP declaration comparison surface (T400; research.md § 7, FR-011,
// FR-027): one declared server name's two declarations, each serialized to
// canonical JSON (mcp-declaration-json.ts), diffed read-only in Monaco. The
// texts are serializations, not the carriers' bytes — no carrier shows its
// source anywhere (FR-007) — so both models are created as `json` whatever
// the carriers' own syntaxes are (`SourceComparisonInput.contentLanguage`).
//
// The component owns one Monaco diff instance's whole lifetime: it mounts on
// its pair of serializations and disposes editor and models together on
// unmount or replacement. Nothing is masked, shortened, or substituted on
// the way in (FR-025, FR-026); there is no `v-html`, no link, and no control
// that edits, merges, or reverts either side (FR-012).
//
// The mount is asynchronous because the editor is loaded lazily, so the pair
// can change while it is still arriving; the generation counter below keeps
// a late mount from showing the wrong declarations. If the environment
// cannot construct the diff, the complete serializations stay available as
// inert text with an actionable failure beside them (research.md § 7); that
// rendering is the failure path only, with no standing toggle to it.
import { inject, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { SourceDiffHandle } from '../../composables/monaco';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { escapeControlCharacters, inlinePresentationLabel } from '../../../shared/entities';

const props = defineProps<{
  /** The first side's complete serialized declaration (mcp-declaration-json.ts). */
  readonly originalText: string;
  /** The first side's carrier Source-relative Path: the side's label (FR-030). */
  readonly originalPath: string;
  /** The second side's serialized declaration; see {@link originalText}. */
  readonly modifiedText: string;
  /** The second side's carrier path; see {@link originalPath}. */
  readonly modifiedPath: string;
  /**
   * What of each carrier the sides show, spliced into each side's
   * accessible name (`SourceComparisonInput.contentLabel`) —
   * `declaration <name> of`, from the page that knows the compared name —
   * so a serialized declaration is never announced as the whole carrier
   * (FR-025).
   */
  readonly contentLabel: string;
}>();

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
// credentials included (FR-025) — so it is an owner the comparison state
// must clear synchronously: on the central purge (FR-027) and before a
// greater generation is adopted (data-model.md § BrowserState). Optional,
// because this component's contract is its props — a harness that renders it
// without the shell simply has no owner registry to join.
const sessionViewState = inject(SESSION_VIEW_STATE, undefined);
const unregisterContentOwner = sessionViewState?.mcpComparison.registerOpenContentOwner(() => {
  // Supersede any mount still in flight before disposing: a mount resolving
  // after the disposal would otherwise attach and write the dropped
  // declarations into fresh models during the one flush before this
  // component unmounts.
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
 * A handle is bound to the pair it was mounted with (SourceDiffHandle), so a
 * changed pair disposes the old editor and mounts a fresh one — which is
 * also the path the first pair takes, and the retry.
 */
async function showCurrentPair(): Promise<void> {
  requestedPair += 1;
  const requested = requestedPair;
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
      // Both sides are this surface's canonical JSON serialization, so the
      // models take the `json` colouring a `.json` file's model gets — the
      // JSON service's own tokenizer, registered tokens-only
      // (monaco-languages.ts) — whatever the carriers' own extensions would
      // resolve to.
      contentLanguage: 'json',
      contentLabel: props.contentLabel,
    },
    {
      // Always content-fit: both sides are one declaration's document, which
      // is usually short, and a fixed reading box would be mostly empty frame
      // (`SourceDiffHandle.mount` § fitContent).
      fitContent: true,
    },
  ).catch(() => null);
  if (mounted === null) {
    // The editor chunk or its construction failed. Neither serialization is
    // lost — the fallback below binds both — so the honest state is a
    // visible failure with a retry above the complete side-by-side text
    // (WCAG 2.4.3: nothing held focus in the empty host, so no rescue).
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
 * The failure-state retry; the same focus contract as the file-comparison
 * surfaces' retry (WCAG 2.4.3): a success continues into the editor, a
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
  unregisterContentOwner?.();
  disposeViewer();
});
</script>

<template>
  <div v-show="!mountError" ref="host" class="aci-declaration-diff" />
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
  <div v-if="mountError" class="aci-declaration-diff__fallback">
    <section
      v-for="side in [
        { path: originalPath, text: originalText, caption: 'First file' },
        { path: modifiedPath, text: modifiedText, caption: 'Second file' },
      ]"
      :key="side.caption"
      class="aci-declaration-diff__fallback-side"
    >
      <!-- The visible caption keeps the authored spelling under `pre-wrap`;
           the accessible name is the whitespace-safe spelling, because the
           name computation collapses whitespace and two paths differing only
           in it must not name one region (FR-025). -->
      <h4
        class="aci-declaration-diff__fallback-caption"
        :aria-label="`${side.caption} ${contentLabel} ${inlinePresentationLabel(side.path)}`"
      >
        {{ side.caption }}
        <span class="aci-path aci-authored-text">{{ escapeControlCharacters(side.path) }}</span>
      </h4>
      <pre ref="fallbackElements" class="aci-declaration-diff__fallback-source" tabindex="0">{{
        purged ? '' : side.text
      }}</pre>
    </section>
  </div>
</template>

<style scoped>
/* Monaco lays out inside a sized box and collapses to nothing without a
   definite height; the same sizing contract as the file-comparison
   surfaces. */
.aci-declaration-diff {
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

/* The two complete serializations side by side, stacking on a narrow
   viewport where two columns would crush both (WCAG 1.4.10). */
.aci-declaration-diff__fallback {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-declaration-diff__fallback {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-declaration-diff__fallback-caption {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* `pre` keeps the serialized line structure; long lines scroll inside the
   block rather than widening the page. */
.aci-declaration-diff__fallback-source {
  border: 1px solid var(--aci-border);
  border-radius: 4px;
  margin: 0;
  max-block-size: 28rem;
  overflow: auto;
  padding: 0.5rem;
}
</style>
