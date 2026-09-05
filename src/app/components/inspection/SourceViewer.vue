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
import {
  SOURCE_VIEWER_LANGUAGE_GRAMMAR,
  SOURCE_VIEWER_LANGUAGE_TEXT,
  type SourceViewerLanguage,
} from './source-viewer-language';
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
   * What the panel around the editor is called — "Frontmatter", "Instructions",
   * the file's own path. The viewer draws its own bordered panel with that name
   * as a heading band inside it.
   *
   * Required, because every surface that shows source names what it is showing:
   * a panel with no name would be an unlabelled frame, and the reader
   * navigating by heading would arrive at nothing.
   *
   * The band is the viewer's rather than the caller's because the border it
   * sits inside is: a caller drawing a panel around this component would have
   * to reach in and cancel the editor box's own border, and `.aci-source-viewer`
   * has one owner (AGENTS.md § Stylesheet scope policy).
   */
  readonly panelLabel: string;
  /**
   * The heading level the band takes, for a panel nested under a heading of its
   * own. The default is `h3`, which is what a panel directly under a page's
   * `h2` is; a comparison that groups two panels under a block title needs its
   * captions a level below that one, or the outline would read them as its
   * siblings (WCAG 1.3.1).
   */
  readonly panelHeadingLevel?: 3 | 4;

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
   * The format the text is in, set by a caller that knows it where the path
   * does not say it. Two callers do: one showing a canonical serialization
   * rather than the file's own bytes — the MCP detail shows a declaration as
   * JSON whatever the carrier's extension would resolve to — and one showing a
   * file whose vendor fixes a format its suffix does not, which is the
   * permission policy detail naming Starlark for a Codex `.rules` file.
   * Omitted, the language is resolved from the path, which is the file
   * surfaces' rule (`SourceViewerHandle.showSource`).
   *
   * It is the format's own name, and the grammar that colours it is looked up
   * from it (`source-viewer-language.ts`): the band beside the label names
   * this, so a member holding a tokenizer's id would put that id on screen.
   *
   * Explicitly `| undefined`, because a caller decides per file whether it
   * knows the format: the policy detail names one for a Codex policy file and
   * the rule detail passes nothing for a Claude rule, whose Markdown suffix
   * already claims one (`exactOptionalPropertyTypes`).
   */
  readonly contentLanguage?: SourceViewerLanguage | undefined;
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

/**
 * The mounted `<pre>` — the pre-mount placeholder or the failure rendering,
 * never both, since the placeholder shows only while there is no failure — so
 * the purge can empty whichever holds authored text synchronously.
 */
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
  // The editor is not the only place the text can be. The placeholder and the
  // failure rendering are both DOM text nodes bound to the props, so either
  // survives until Vue patches this component away — one flush later, when
  // everything else is already gone.
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
    const mounted = await SourceViewerHandle.mount(element).catch(() => null);
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
    viewer.value.showSource(
      sourceText,
      path,
      contentLabel,
      contentLanguage === undefined ? undefined : SOURCE_VIEWER_LANGUAGE_GRAMMAR[contentLanguage],
    );
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
  <!-- The panel and the editor inside it. The heading stays an `h3` inside the
       band rather than becoming a styled `div`: it is what a reader navigating
       by heading arrives at, and moving it into the panel is a change of where
       it is drawn, not of what it is (WCAG 1.3.1).

       The panel stays whatever the editor did. A failure that took the panel
       away with it left the message and the complete text standing outside
       every band, so a page showing two viewers — a frontmatter and its
       instructions, a plugin's catalog and its manifest — reported two
       identical failures over two unlabelled blocks of text, with no way to
       tell which was which and the heading each belonged under gone
       (WCAG 1.3.1). -->
  <div class="aci-source-viewer-panel">
    <component :is="`h${panelHeadingLevel ?? 3}`" class="aci-source-viewer-panel__head">
      <!-- The label hugs its binding: a newline between it and the span below
           renders as a space, which a viewer naming no format would carry into
           its accessible name. -->
      <span>{{ panelLabel }}</span>
      <!-- The format the caller named, not the grammar colouring it: a
           `.rules` policy is Starlark and is tokenized by Python's grammar,
           and a band reading the grammar would call the file Python. A viewer
           left to the path's own claim names none, because the path is what
           the reader is already looking at. -->
      <span v-if="contentLanguage !== undefined" class="aci-source-viewer-panel__format"
        ><!-- The separator lives inside the format rather than between the two,
             so the band's accessible name reads "Metadata YAML" when there is a
             format and "Metadata" when there is none — a newline between the
             spans would leave the second case trailing a space. -->{{ ' '
        }}{{ SOURCE_VIEWER_LANGUAGE_TEXT[contentLanguage] }}</span
      >
    </component>
    <!-- The editor's box and the placeholder that gives it the file's own
         height, in one grid cell so the box is as tall as whichever is there
         rather than as tall as both. The host cannot be hidden while the
         placeholder stands in for it: Monaco measures its own text inside that
         element, and an element with no layout is one it cannot measure in. -->
    <div v-show="!mountError" class="aci-source-viewer-panel__stage">
      <div ref="host" class="aci-source-viewer" />
      <!-- The text the editor is about to show, laid out by the browser rather
           than predicted from the editor's own metrics — same monospace font,
           and `wordWrap: 'off'` makes a visual line a model line, so no line
           height of Monaco's is copied here. The box therefore starts at the
           file's height instead of at one line, and a control below it does
           not move out from under a reader already pressing it. It is gone in
           the flush that mounts the editor, which writes the exact height
           (`monaco.ts` § fit). `aria-hidden` and unfocusable, because the
           editor publishes this same text: a reader met it twice otherwise. -->
      <pre
        v-if="viewer === null && !mountError && !purged"
        ref="fallbackElement"
        class="aci-source-viewer__fallback aci-source-viewer__fallback--placeholder"
        aria-hidden="true"
        >{{ sourceText }}</pre>
    </div>
    <!-- Stable rather than inserted with the failure it reports, because a
         region that appears together with its message is not reliably read. -->
    <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
      {{ mountError ? MOUNT_ERROR_MESSAGE : '' }}
    </p>
    <p v-if="mountError" class="aci-error aci-source-viewer-panel__failure">
      {{ MOUNT_ERROR_MESSAGE }}
      <button type="button" @click="retryMount">Try again</button>
    </p>
    <!-- The editor-failure rendering: the same complete text as an inert text
         node — no markup, no links, no editor — so an environment that cannot
         load the editor still shows the whole file, under the band that says
         which of the page's viewers it is. The browser lays out and scrolls it,
         so it depends on none of the editor's own character measurements.
         `tabindex` because the box scrolls: WebKit does not make a scrollable
         overflow container keyboard focusable on its own, so without it a
         reader with no pointer could reach the element's text through a screen
         reader but never scroll the box (WCAG 2.1.1). -->
    <pre v-if="mountError" ref="fallbackElement" class="aci-source-viewer__fallback" tabindex="0">{{
      purged ? '' : sourceText
    }}</pre>
  </div>
</template>

<style scoped>
/* Monaco lays out inside a sized box and collapses to nothing without a
   definite height, so the mounted handle writes the editor's own content
   height to the element (`SourceViewerHandle.mount`) and `automaticLayout`
   re-lays the editor out to the box it produced. The cap keeps a long document
   from taking the page — past it the editor scrolls inside its box — and the
   floor keeps a one-line file from drawing a frame with no room to read in.

   A fixed reading box instead of this left every short file under an empty
   frame: a two-line skill drew 24rem of nothing, which is most of the height
   the page has to give (FR-007). It is not told to fill a remainder either:
   the page around it scrolls, so there is no remainder to fill and an editor
   asked for one would collapse. */
/* No border and no corners of its own: the panel around it draws both, and
   every caller labels its panel — two borders a pixel apart read as a box
   drawn twice. */
.aci-source-viewer {
  block-size: auto;
  font-size: var(--aci-source-font-size);
  inline-size: 100%;
  line-height: var(--aci-source-line-height);
  max-block-size: var(--aci-source-viewer-max-block-size);
  /* One line's worth, not three. The floor is the empty host's: before the
     editor mounts the placeholder beside it is what carries the file's own
     height, and after it Monaco writes the document's height — a two-line
     frontmatter in a three-line box read as a frame the content did not
     fill. */
  min-block-size: 1.5rem;
}

/* The editor and its placeholder occupy the same cell. */
.aci-source-viewer-panel__stage {
  display: grid;
}

.aci-source-viewer-panel__stage > * {
  grid-area: 1 / 1;
}

/* The panel: the name of what is in the editor, and the editor, in one box.
   The name inside the border rather than above it is what makes the box read
   as "this is the frontmatter" instead of as an unlabelled frame under a
   title. */
.aci-source-viewer-panel {
  /* The cap the editor takes and the placeholder predicts, written once so the
     two cannot settle at different heights. It is measured against the
     viewport rather than fixed: at 24rem a 734-byte settings file scrolled
     inside a 384px window with 620px of empty page under it, which is a second
     scroll container inside the one the shell keeps (`App.vue` § .aci-app).
     `max()` keeps the 24rem floor for a short viewport, where a
     viewport-derived cap would be smaller than the box is worth drawing. */
  --aci-source-viewer-max-block-size: max(24rem, calc(100vh - 14rem));
  background: var(--aci-surface-raised);
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  /* The gap the design puts between stacked panels, carried by the panel
     rather than by each page that stacks them: a page that forgot it drew two
     editors sharing one edge, which reads as one box with a rule through it. */
  margin-block-start: 0.625rem;
  overflow: hidden;
}

.aci-source-viewer-panel__head {
  align-items: center;
  background: var(--aci-surface-sunken);
  border-block-end: 1px solid var(--aci-hairline);
  color: var(--aci-muted);
  display: flex;
  font-size: 0.6875rem;
  font-weight: 600;
  gap: 0.5rem;
  letter-spacing: 0;
  margin: 0;
  padding: 0.25rem 0.625rem;
}

/* What the text is, at the end of the band: a qualifier on the name rather
   than one of the things a reader scans for. */
.aci-source-viewer-panel__format {
  font-family: ui-monospace, monospace;
  font-weight: 400;
  margin-inline-start: auto;
}

/* The failure and its retry, inside the panel where the editor would have
   been: the band above it says which viewer failed, so the message does not
   have to. */
.aci-source-viewer-panel__failure {
  margin: 0;
  padding: 0.5rem 0.625rem;
}

/* The editor-failure fallback: the same authored text as an inert text node.
   `pre` keeps the authored line structure; long lines scroll inside the block
   rather than widening the page. It draws no border of its own: it sits inside
   the panel's, exactly where the editor's box did. */
.aci-source-viewer__fallback {
  border-block-start: 1px solid var(--aci-hairline);
  flex: 1;
  margin: 0;
  max-block-size: 32rem;
  min-block-size: 0;
  overflow: auto;
  padding: 0.5rem 0.625rem;
}

/* The placeholder stands where the editor will be, so it draws no rule above
   it — the panel's head already ends in one — and it takes the editor's cap
   rather than the failure rendering's, or the box would settle at a height the
   editor never takes. It does not scroll: nothing can reach it to scroll it,
   and the editor that replaces it is what scrolls. */
.aci-source-viewer__fallback--placeholder {
  border-block-start: none;
  /* The editor's own type: the placeholder stands in for the box the editor
     will take, and a box is as tall as its lines times its leading. The family
     is deliberately not shared — `wordWrap: 'off'` makes a visual line a model
     line in both, so the two agree on height whatever they measure a character
     at. What is left is Monaco's horizontal scrollbar, which it reserves under
     a document with a line too long for the box and the `<pre>` does not: 12px
     on one panel of the hook detail's five, at every text size (measured
     2026-09-04), against the whole document's height before this. It is not
     chased, because reserving it would be Monaco's own constant copied here. */
  font-size: var(--aci-source-font-size);
  line-height: var(--aci-source-line-height);
  max-block-size: var(--aci-source-viewer-max-block-size);
  overflow: hidden;
  /* The editor's box has no padding of its own, so neither does the box
     standing in for it: the padding the failure rendering carries would be
     height the editor never takes, and the content below would shift by it on
     every mount. */
  padding: 0;
}
</style>
