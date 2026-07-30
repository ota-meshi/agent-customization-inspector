<script setup lang="ts">
// The read-only authored-source surface (T099).
//
// The component owns one Monaco instance's whole lifetime: it mounts on the
// first source, replaces the model when the file changes, and disposes editor
// and model together on unmount. Nothing about the text is transformed on the
// way in — it is the exact `sourceText` the host committed, handed to the
// editor as a string. There is no `v-html`, no Markdown rendering, no link,
// and no image load anywhere in this component.
//
// The mount is asynchronous because the editor is loaded lazily, so a
// selection can change while it is still arriving. The generation counter
// below is what keeps that from showing the wrong file: only the newest
// request may write to the editor.
import { inject, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { SourceViewerHandle } from '../../composables/monaco';
import { SESSION_VIEW_STATE } from '../../session/view-state';

const props = defineProps<{
  /** The file's complete decoded text, exactly as committed. */
  readonly sourceText: string;
  /** The Source-relative Path, used for the language choice and the label. */
  readonly sourceRelativePath: string;
}>();

/** The element Monaco takes over; empty until the editor is mounted. */
const host = ref<HTMLDivElement | null>(null);
/** The mounted editor, or null before the first mount and after teardown. */
const viewer = shallowRef<SourceViewerHandle | null>(null);
/**
 * Set when loading or mounting the editor failed — a chunk that did not
 * arrive, most plausibly because the local host went away. The template
 * offers a retry instead of leaving an empty host.
 */
const mountError = shallowRef<boolean>(false);

/**
 * The failure copy, bound to the visible error and to the stable live region
 * that announces it: the failure replaces the viewer without moving keyboard
 * focus, so a reader who cannot see the swap needs it said (WCAG 4.1.3,
 * contracts/accessibility-acceptance.md § 4.1.3).
 */
const MOUNT_ERROR_MESSAGE = 'The source viewer could not be loaded.';

/**
 * True while the reader has chosen the plain-text rendering over the editor.
 *
 * The editor measures characters itself and scrolls to the extent those
 * measurements produce, so a display the reader has adjusted — a user
 * stylesheet or a text-spacing override that widens glyphs (WCAG 1.4.12) —
 * can leave the end of a long line past the extent the editor will scroll to.
 * The complete text is already in this component's props, so the way out is to
 * render it as text the browser lays out and scrolls itself. Offered always
 * rather than only after a failure: whether the editor suits a reader's display
 * is the reader's judgement, not something this component can detect.
 */
const plainText = ref(false);

/** The plain-text rendering's element, so the purge can empty it synchronously. */
const fallbackElement = ref<HTMLPreElement | null>(null);

/**
 * Set by the purge. The plain-text rendering binds `sourceText` directly, so the
 * text is in the DOM without an editor to dispose: the purge clears the element
 * and this stops the next render from writing it back before the component
 * unmounts (FR-027, data-model.md § BrowserState).
 */
const purged = shallowRef(false);
/**
 * Counts source changes. A mount that resolves after a newer change sees a
 * different value and abandons its editor instead of showing an older file's
 * text under the newer file's heading.
 */
let requestedSource = 0;
/** True once teardown has run, so a late mount disposes instead of attaching. */
let unmounted = false;

// The model this component mounts holds complete authored source, so it is an
// owner the view state must clear synchronously — on the central purge
// (FR-027) and before a greater generation is adopted (data-model.md
// § BrowserState): the reactive unmount that follows either is one render
// flush later, a window in which everything else is already gone. Optional,
// because this component's contract is its props — a harness that renders it
// without the shell simply has no owner registry to join.
const sessionViewState = inject(SESSION_VIEW_STATE, undefined);
const unregisterContentOwner = sessionViewState?.registerOpenContentOwner(() => {
  // Supersede any mount still in flight before disposing: a mount resolving
  // after the disposal would otherwise attach and write the dropped source
  // into a fresh model during the one flush before this component unmounts.
  requestedSource += 1;
  disposeViewer();
  // The editor is not the only place the text is. The plain-text rendering is a
  // DOM text node bound to the props, so it survives until Vue patches this
  // component away — one flush later, when everything else is already gone.
  purged.value = true;
  fallbackElement.value?.replaceChildren();
});

/** Disposes the mounted editor and its model; safe to call twice. */
function disposeViewer(): void {
  viewer.value?.dispose();
  viewer.value = null;
}

/**
 * Mounts the editor if it is not mounted yet and shows the current source.
 *
 * Called from `onMounted` rather than from an immediate watcher, because an
 * immediate watcher runs during setup — before the template ref exists — and
 * would have nothing to mount into.
 */
async function showCurrentSource(): Promise<void> {
  requestedSource += 1;
  const requested = requestedSource;
  const { sourceText, sourceRelativePath: path } = props;
  if (viewer.value === null) {
    const element = host.value;
    if (element === null) {
      return;
    }
    const mounted = await SourceViewerHandle.mount(element).catch(() => null);
    if (mounted === null) {
      // The editor chunk or its mount failed. The source is not lost — the
      // detail already holds it — so the honest state is a visible failure
      // with a retry, not an empty host and an unhandled rejection.
      if (!unmounted && requested === requestedSource) {
        mountError.value = true;
      }
      return;
    }
    if (unmounted || requested !== requestedSource) {
      // A newer source (or teardown) won while the editor was loading. This
      // instance was never attached to anything, so disposing it is the whole
      // cleanup.
      mounted.dispose();
      return;
    }
    viewer.value = mounted;
  }
  viewer.value.showSource(sourceText, path);
  // Cleared only once the mount actually succeeded: clearing it up front
  // would unmount the failure state's retry button while the retry is still
  // in flight, and a retry that fails again would strand keyboard focus on
  // the document body (WCAG 2.4.3).
  mountError.value = false;
}

/**
 * Switches between the editor and the plain-text rendering.
 *
 * Leaving the editor disposes it, because a mounted editor holds the whole
 * authored text in a model (FR-027) and this one would be behind a rendering
 * the reader is not looking at. Returning mounts a fresh one, which is the same
 * path the first source takes.
 */
async function togglePlainText(): Promise<void> {
  plainText.value = !plainText.value;
  if (plainText.value) {
    // Supersede any mount in flight, exactly as the purge owner does: one
    // resolving afterwards would attach an editor nothing is showing.
    requestedSource += 1;
    disposeViewer();
    mountError.value = false;
    return;
  }
  await showCurrentSource();
}

/**
 * The failure-state retry. Separate from {@link showCurrentSource} because a
 * successful retry unmounts the button this click came from, and focus would
 * drop to the document body (WCAG 2.4.3); the editor the reader was trying to
 * reach continues the interaction. A retry that fails again leaves the button
 * mounted and focused, so nothing moves.
 */
async function retryMount(): Promise<void> {
  await showCurrentSource();
  if (!mountError.value) {
    viewer.value?.focus();
  }
}

onMounted(() => {
  void showCurrentSource();
});

watch(
  () => [props.sourceText, props.sourceRelativePath] as const,
  () => {
    // Nothing to mount while the plain-text rendering is showing: it binds the
    // props directly, so the new source is on screen already.
    if (!plainText.value) {
      void showCurrentSource();
    }
  },
);

onBeforeUnmount(() => {
  unmounted = true;
  unregisterContentOwner?.();
  disposeViewer();
});
</script>

<template>
  <!-- The reader's own choice of rendering, stated as what the click does. It
       is above the source so a keyboard user meets it before the surface it
       switches. -->
  <!-- Hidden while the editor could not be loaded at all: the plain-text
       rendering is already what is on screen then, so a button offering it would
       name something the click cannot do. The failure's own "Try again" is the
       way back to the editor. -->
  <p v-if="!mountError" class="aci-source-controls">
    <button type="button" @click="togglePlainText">
      {{ plainText ? 'Show in the source viewer' : 'Show as plain text' }}
    </button>
  </p>
  <div v-show="!mountError && !plainText" ref="host" class="aci-source-viewer" />
  <!-- Stable rather than inserted with the failure it reports, because a
       region that appears together with its message is not reliably read. -->
  <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
    {{ mountError ? MOUNT_ERROR_MESSAGE : '' }}
  </p>
  <p v-if="mountError && !plainText" class="aci-error">
    {{ MOUNT_ERROR_MESSAGE }}
    <button type="button" @click="retryMount">Try again</button>
  </p>
  <!-- The same complete text as an inert text node — no markup, no links, no
       editor — shown when the reader asked for it and when the editor could not
       be loaded at all. The browser lays out and scrolls it, so it depends on
       none of the editor's own character measurements. `tabindex` because the
       box scrolls: WebKit does not make a scrollable overflow container
       keyboard focusable on its own, so without it a reader with no pointer
       could reach the element's text through a screen reader but never scroll
       the box (WCAG 2.1.1). -->
  <pre
    v-if="mountError || plainText"
    ref="fallbackElement"
    class="aci-source-fallback"
    tabindex="0"
    >{{ purged ? '' : sourceText }}</pre>
</template>
