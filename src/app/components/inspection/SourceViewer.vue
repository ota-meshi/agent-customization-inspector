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
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { SourceViewerHandle } from '../../composables/monaco';
import { useSessionViewState } from '../../composables/session-view-state';

const props = defineProps<{
  /**
   * The text to show, exactly as committed. Usually a file's complete decoded
   * source; a caller showing part of one — a skill's instructions, with the
   * frontmatter block removed — passes that part and names it in
   * {@link contentLabel}, so nothing announces a slice as the whole file.
   */
  readonly sourceText: string;
  /** The Source-relative Path, used for the language choice and the label. */
  readonly sourceRelativePath: string;
  /**
   * What the viewer is showing of that file, leading its accessible name. The
   * default is the whole file; a caller passing part of one says which part,
   * so assistive technology never announces a slice as the complete source.
   */
  readonly contentLabel?: string;
  /**
   * The content-owner registry this viewer joins instead of the session's, for
   * a caller whose surface owns the drop. The comparison surfaces are the
   * callers: a pick or a URL edit replaces the open pair without a purge and
   * without a new generation, and the contract orders dispose before replace
   * (data-model.md § BrowserState), so a viewer that only joined the session's
   * registry would hold the previous pair's authored source until Vue's
   * unmount one flush later.
   *
   * Instead of the session's rather than in addition to it, because the two
   * run at different moments and only one of them can be right. Adopting a
   * newer generation calls `closeFileDetail()` before it closes the
   * comparisons, and that call runs the session's owners: a comparison viewer
   * joined there would be detached while the comparison's own reactive state
   * was still unchanged, so the compare route's synchronous focus guard would
   * find focus already on the document body with nothing left to rescue
   * (WCAG 2.4.3). The comparison's own registry covers every occasion the
   * session's does — a purge and a generation both reach it — and it drops its
   * reactive state before running its owners, which is the order the guard
   * needs.
   */
  readonly registerContentOwner?: (disposer: () => void) => () => void;
  /**
   * The language id the model is created with, set by a caller that knows the
   * text's syntax where the path does not say it. Two callers do: one showing
   * a canonical serialization rather than the file's own bytes — the MCP
   * detail shows a declaration as JSON whatever the carrier's extension would
   * resolve to — and one showing a file whose vendor fixes a syntax its
   * suffix does not, which is the permission policy detail naming Starlark's
   * grammar for a Codex `.rules` file. Omitted, the language is resolved from
   * the path, which is the file surfaces' rule
   * (`SourceViewerHandle.showSource`).
   *
   * Explicitly `| undefined`, because a caller decides per file whether it
   * knows the syntax: the policy detail names a grammar for a Codex policy
   * file and the rule detail passes nothing for a Claude rule, whose Markdown
   * suffix already claims one (`exactOptionalPropertyTypes`).
   */
  readonly contentLanguage?: string | undefined;
  /**
   * Sizes the viewer to its content instead of the fixed reading box, capped
   * by this component's stylesheet (`SourceViewerHandle.mount`
   * § fitContent). Set by surfaces showing a short derived document — an
   * MCP declaration, a frontmatter block — where a fixed height would be
   * mostly empty frame.
   */
  readonly fitContent?: boolean;
}>();

/** The element Monaco takes over; empty until the editor is mounted. */
const host = ref<HTMLDivElement | null>(null);
/** The mounted editor, or null before the first mount and after teardown. */
const viewer = shallowRef<SourceViewerHandle | null>(null);
/**
 * Set when loading or mounting the editor failed — a chunk that did not
 * arrive, most plausibly because the local host went away. The template
 * keeps the complete source readable as inert text and offers a retry
 * instead of leaving an empty host. There is deliberately no standing
 * toggle to this rendering: the fallback is the failure path, not a reader
 * preference.
 */
const mountError = shallowRef<boolean>(false);

/**
 * The failure copy, bound to the visible error and to the stable live region
 * that announces it: the failure replaces the viewer without moving keyboard
 * focus, so a reader who cannot see the swap needs it said (WCAG 4.1.3,
 * contracts/accessibility-acceptance.md § 4.1.3).
 */
const MOUNT_ERROR_MESSAGE = 'The source viewer could not be loaded.';

/** The failure rendering's element, so the purge can empty it synchronously. */
const fallbackElement = ref<HTMLPreElement | null>(null);

/**
 * Set by the purge. The failure rendering binds `sourceText` directly, so the
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

// The model this component mounts holds authored source, so it is an
// owner the view state must clear synchronously — on the central purge
// (FR-027) and before a greater generation is adopted (data-model.md
// § BrowserState): the reactive unmount that follows either is one render
// flush later, a window in which everything else is already gone.
// The registration is unconditional — the shell always provides the
// session (`useSessionViewState`) — because a mount that skipped it
// would hold authored content the central purge cannot clear.
const sessionViewState = useSessionViewState();
/** Drops this viewer's model and its fallback text; see the registrations below. */
const dropContent = (): void => {
  // Supersede any mount still in flight before disposing: a mount resolving
  // after the disposal would otherwise attach and write the dropped source
  // into a fresh model during the one flush before this component unmounts.
  requestedSource += 1;
  disposeViewer();
  // The editor is not the only place the text can be. The failure rendering
  // is a DOM text node bound to the props, so it survives until Vue patches
  // this component away — one flush later, when everything else is already
  // gone.
  purged.value = true;
  fallbackElement.value?.replaceChildren();
};
// The caller's registry when it named one, the session's otherwise — never
// both; see the prop's own doc for why joining both breaks the focus rescue.
const unregisterContentOwner =
  props.registerContentOwner === undefined
    ? sessionViewState.registerOpenContentOwner(dropContent)
    : props.registerContentOwner(dropContent);

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
  // A new source reclaims a purged instance: the purge condemned the
  // previous text, and Vue can hand this same component the next one
  // without an unmount, so a fallback render after a later mount failure
  // would otherwise stay blank for content the purge never touched.
  purged.value = false;
  const { sourceText, sourceRelativePath: path, contentLabel, contentLanguage } = props;
  if (viewer.value === null) {
    const element = host.value;
    if (element === null) {
      return;
    }
    const mounted = await SourceViewerHandle.mount(element, {
      fitContent: props.fitContent === true,
    }).catch(() => null);
    if (mounted === null) {
      // The editor chunk or its mount failed. The source is not lost — the
      // detail already holds it — so the honest state is a visible failure
      // with a retry above the complete text, not an empty host and an
      // unhandled rejection. Nothing held focus in the swapped-out region —
      // the host is an empty box until a mount succeeds — so no focus rescue
      // is needed here; a failed retry keeps its own button mounted and
      // focused.
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
  try {
    viewer.value.showSource(sourceText, path, contentLabel, contentLanguage);
  } catch {
    // The model swap failed mid-flight (`SourceViewerHandle.showSource`
    // § rollback): the handle has already disposed what it held, so the
    // honest state is the editor gone and the failure rendering showing the
    // current source as inert text — never the previous file's content
    // under this file's heading (FR-025).
    disposeViewer();
    if (!unmounted && requested === requestedSource) {
      mountError.value = true;
    }
    return;
  }
  // Cleared only once the mount actually succeeded: clearing it up front
  // would unmount the failure state's retry button while the retry is still
  // in flight, and a retry that fails again would strand keyboard focus on
  // the document body (WCAG 2.4.3).
  mountError.value = false;
}

/**
 * The failure-state retry. Separate from {@link showCurrentSource} because a
 * successful retry unmounts the button this click came from, and focus would
 * drop to the document body (WCAG 2.4.3); the editor the reader was trying to
 * reach continues the interaction. A retry that fails again leaves the button
 * mounted and focused, so nothing moves.
 *
 * The patch is awaited before the state is read, not after. Clearing the
 * failure only queues the update, so until the flush the editor's host is still
 * `display: none` and focusing inside a hidden subtree does nothing. Reading
 * the state first would decide from what was true before that flush and act on
 * what is true after it, which are two different moments.
 *
 * The move is also conditional on focus having been lost. A retry takes time,
 * and a reader who tabbed somewhere else during it is reading something else:
 * moving them into the editor then would take a position they chose. Focus on
 * the document body is the signal that the removed button was still holding it.
 */
async function retryMount(): Promise<void> {
  await showCurrentSource();
  await nextTick();
  if (!mountError.value && document.activeElement === document.body) {
    viewer.value?.focus();
  }
}

onMounted(() => {
  void showCurrentSource();
});

watch(
  () => [props.sourceText, props.sourceRelativePath] as const,
  () => {
    void showCurrentSource();
  },
);

onBeforeUnmount(() => {
  unmounted = true;
  unregisterContentOwner();
  disposeViewer();
});
</script>

<template>
  <div
    v-show="!mountError"
    ref="host"
    class="aci-source-viewer"
    :class="{ 'aci-source-viewer--fit': fitContent }"
  />
  <!-- Stable rather than inserted with the failure it reports, because a
       region that appears together with its message is not reliably read. -->
  <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
    {{ mountError ? MOUNT_ERROR_MESSAGE : '' }}
  </p>
  <p v-if="mountError" class="aci-error">
    {{ MOUNT_ERROR_MESSAGE }}
    <button type="button" @click="retryMount">Try again</button>
  </p>
  <!-- The editor-failure rendering: the same complete text as an inert text
       node — no markup, no links, no editor — so an environment that cannot
       load the editor still shows the whole file. The browser lays out and
       scrolls it, so it depends on none of the editor's own character
       measurements. `tabindex` because the box scrolls: WebKit does not make
       a scrollable overflow container keyboard focusable on its own, so
       without it a reader with no pointer could reach the element's text
       through a screen reader but never scroll the box (WCAG 2.1.1). -->
  <pre v-if="mountError" ref="fallbackElement" class="aci-source-viewer__fallback" tabindex="0">{{
    purged ? '' : sourceText
  }}</pre>
</template>

<style scoped>
/* Monaco lays out inside a sized box and collapses to nothing without a
   definite height, so the editor is given one. It is not told to fill a
   remainder: the page around it scrolls, so there is no remainder to fill and
   an editor asked for one would collapse. `automaticLayout` keeps it in step
   with the box on resize. */
.aci-source-viewer {
  block-size: 24rem;
  border: 1px solid var(--aci-border);
  border-radius: 4px;
  inline-size: 100%;
}

/* The fit-content variant: the mounted handle writes the content height to
   the element (`SourceViewerHandle.mount` § fitContent) and this cap keeps a
   long document from taking the page — past it, the editor scrolls inside
   its box exactly like the fixed variant. */
.aci-source-viewer--fit {
  block-size: auto;
  max-block-size: 24rem;
  min-block-size: 3rem;
}

/* The editor-failure fallback: the same authored text as an inert text node.
   `pre` keeps the authored line structure; long lines scroll inside the block
   rather than widening the page. */
.aci-source-viewer__fallback {
  border: 1px solid var(--aci-border);
  border-radius: 4px;
  flex: 1;
  margin: 0;
  min-block-size: 0;
  overflow: auto;
  padding: 0.5rem;
}
</style>
