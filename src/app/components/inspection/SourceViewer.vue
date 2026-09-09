<script setup lang="ts">
// The read-only authored-source surface (T099, T1207).
//
// The component draws one file — or one part of it — as the browser's own
// text: a `<pre>` holding, per line, the runs shiki tokenized and the colour
// variables each run carries (`syntax-highlighting.ts`). Nothing about the
// text is transformed on the way in — it is the exact `sourceText` the host
// committed, split into lines by the tokenizer and rendered as text nodes.
// There is no `v-html`, no Markdown rendering, no link, and no image load
// anywhere in this component (FR-027).
//
// Until the runs arrive — the highlighter and the file's grammar are fetched
// lazily — the same text stands in the same box as one text node, so the
// panel has the file's own height from its first paint and nothing below it
// moves when the colour lands. A tokenizing failure leaves that rendering in
// place: the file is already on screen, uncoloured, which is the honest
// rendering of colour that did not arrive, and needs no notice and no retry.
//
// The tokenizing is asynchronous, so a selection can change while it is
// still arriving. The generation counter below is what keeps that from
// showing the wrong file: only the newest request may write the runs.
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { ThemedToken } from 'shiki/core';
import { resolveSourceLanguage } from '../../composables/source-languages';
import { highlightSource } from '../../composables/syntax-highlighting';
import { useSessionViewState } from '../../composables/session-view-state';
import { inlinePresentationLabel } from '../../../shared/entities';
import {
  SOURCE_VIEWER_LANGUAGE_GRAMMAR,
  SOURCE_VIEWER_LANGUAGE_TEXT,
  type SourceViewerLanguage,
} from './source-viewer-language';

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
   * What the panel around the text is called — "Frontmatter", "Instructions",
   * the file's own path. The viewer draws its own bordered panel with that name
   * as a heading band inside it.
   *
   * Required, because every surface that shows source names what it is showing:
   * a panel with no name would be an unlabelled frame, and the reader
   * navigating by heading would arrive at nothing.
   *
   * The band is the viewer's rather than the caller's because the border it
   * sits inside is: a caller drawing a panel around this component would have
   * to reach in and cancel the text box's own border, and `.aci-source-viewer`
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
   * without a new generation, so a viewer that only joined the session's
   * registry would hold the previous pair's authored source until Vue's
   * unmount one flush later.
   *
   * Instead of the session's rather than in addition to it: the surface that
   * owns the pair is the one that knows when the pair is no longer the
   * reader's, and one viewer answering to two registries would be dropped by
   * whichever ran first, on an occasion the other had not decided.
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
   * surfaces' rule (`source-languages.ts` § resolveSourceLanguage).
   *
   * It is the format's own name, and the grammar that colours it is looked up
   * from it (`source-viewer-language.ts`): the band beside the label names
   * this, so a member holding a grammar's id would put that id on screen.
   *
   * Explicitly `| undefined`, because a caller decides per file whether it
   * knows the format: the policy detail names one for a Codex policy file and
   * the rule detail passes nothing for a Claude rule, whose Markdown suffix
   * already claims one (`exactOptionalPropertyTypes`).
   */
  readonly contentLanguage?: SourceViewerLanguage | undefined;
}>();

/**
 * The tokenized lines of the current source — one array of coloured runs per
 * line — or null while they have not arrived: before the highlighter answers,
 * after a tokenizing failure, and after the purge. While null, the template
 * shows the same text as one text node, so the file is on screen either way.
 */
const lines = shallowRef<ReadonlyArray<ReadonlyArray<ThemedToken>> | null>(null);

/**
 * Set by the purge. The text is in the DOM as text nodes bound to the props,
 * which stay what they were until the page moves on, so this is what keeps
 * the flush after the purge from rendering the props' text again (FR-027,
 * data-model.md § BrowserState).
 */
const purged = shallowRef(false);

/**
 * How many lines the file has: the tokenizer's count once it has answered,
 * and until then the same count taken from the text — one more than its
 * `\n`s, which is where the tokenizer splits too, a `\r\n` included — so the
 * digit column the placeholder reserves is the one the runs take
 * (`.aci-source-viewer--pending`).
 */
const lineCount = computed(() => lines.value?.length ?? props.sourceText.split('\n').length);

/**
 * Counts source changes. A tokenizing that resolves after a newer change sees
 * a different value and abandons its runs instead of showing an older file's
 * text under the newer file's heading.
 */
let requestedSource = 0;
/** True once teardown has run, so a late tokenizing writes nothing. */
let unmounted = false;

// The text this component renders is authored source, so it is an owner the
// view state drops with the detail — on the central purge (FR-027) and before
// a greater generation is adopted (data-model.md § BrowserState). The drop is
// a change of state and nothing else: the text nodes are Vue's, and the flush
// that follows — before the next paint — is what takes them out of the
// document, or replaces them with the next source's when one was adopted in
// the same tick. Reaching into the element ahead of that flush would leave
// Vue's own tree pointing at nodes no longer in the document, and the next
// source would be patched into them and never show. The registration is
// unconditional — the shell always provides the session
// (`useSessionViewState`) — because a mount that skipped it would hold
// authored content the central purge cannot clear.
const sessionViewState = useSessionViewState();
/** Drops this viewer's authored text; see the registrations below. */
const dropContent = (): void => {
  // Supersede any tokenizing still in flight: one resolving after this would
  // otherwise write the dropped source back as runs.
  requestedSource += 1;
  lines.value = null;
  purged.value = true;
};
// The caller's registry when it named one, the session's otherwise — never
// both; see the prop's own doc for why joining both breaks the drop.
const unregisterContentOwner =
  props.registerContentOwner === undefined
    ? sessionViewState.registerOpenContentOwner(dropContent)
    : props.registerContentOwner(dropContent);

/**
 * Tokenizes the current source and shows its runs.
 *
 * Called from `onMounted` rather than from an immediate watcher so the first
 * tokenizing starts once the placeholder is on screen, which is what gives
 * the panel its height from the first paint.
 */
async function showCurrentSource(): Promise<void> {
  requestedSource += 1;
  const requested = requestedSource;
  // A new source reclaims a purged instance: the purge condemned the
  // previous text, and Vue can hand this same component the next one
  // without an unmount.
  purged.value = false;
  lines.value = null;
  const { sourceText, sourceRelativePath, contentLanguage } = props;
  // `contentLanguage` overrides the path's claim when the caller knows the
  // text's syntax and the path does not say it (see the prop); what it names
  // is a format, and the grammar colouring that format is looked up from it.
  const language =
    contentLanguage === undefined
      ? resolveSourceLanguage(sourceRelativePath)
      : SOURCE_VIEWER_LANGUAGE_GRAMMAR[contentLanguage];
  let highlighted: ReadonlyArray<ReadonlyArray<ThemedToken>>;
  try {
    highlighted = await highlightSource(sourceText, language);
  } catch {
    // Reached when the highlighter or the grammar chunk did not arrive — most
    // plausibly a dropped local host — or when the engine cannot compile the
    // grammar (`highlightSource`). The text is already on screen as one text
    // node and stays so: colour is presentation over text that is shown
    // exactly as authored either way, and a notice or a retry would stand
    // where the file already is.
    return;
  }
  if (unmounted || requested !== requestedSource) {
    // A newer source, the purge, or teardown won while the tokenizer was
    // working; these runs are a file the reader has moved on from.
    return;
  }
  lines.value = highlighted;
}

onMounted(() => {
  void showCurrentSource();
});

watch(
  () => [props.sourceText, props.sourceRelativePath, props.contentLanguage] as const,
  () => {
    void showCurrentSource();
  },
);

onBeforeUnmount(() => {
  unmounted = true;
  unregisterContentOwner();
});
</script>

<template>
  <!-- The panel and the text inside it. The heading stays an `h3` inside the
       band rather than becoming a styled `div`: it is what a reader navigating
       by heading arrives at, and moving it into the panel is a change of where
       it is drawn, not of what it is (WCAG 1.3.1). -->
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
    <!-- The text, in the browser's own `<pre>`: the authored line structure is
         the element's, long lines scroll inside the box rather than widening
         the page, and the browser's own find, selection, and copy reach every
         character. `tabindex` because the box scrolls: WebKit does not make a
         scrollable overflow container keyboard focusable on its own, so
         without it a reader with no pointer could reach the text through a
         screen reader but never scroll the box (WCAG 2.1.1). Named after the
         file it shows and the part of it — an editor showing the instructions
         a frontmatter block was removed from is not showing the file's source
         (FR-025) — through `role="group"`, because ARIA prohibits a name on
         the generic role a `pre` has of its own. The path rides through the
         whitespace-safe spelling: an accessible name is a flat string whose
         consecutive spaces collapse, and two paths differing only in them
         must not name one box (data-model.md § SourceRelativePath).

         Every tag inside the `pre` opens and closes flush with its neighbour,
         because the element renders whitespace as written: a newline between
         two tags here would be a newline in the file. -->
    <pre
      class="aci-source-viewer"
      :class="{ 'aci-source-viewer--pending': lines === null }"
      :style="{ '--aci-source-viewer-digits': String(lineCount).length }"
      tabindex="0"
      role="group"
      :aria-label="`${contentLabel ?? 'Source of'} ${inlinePresentationLabel(sourceRelativePath)}, read-only`"
    ><template v-if="!purged"
        ><template v-if="lines === null">{{ sourceText }}</template
        ><template v-else
          ><span
            v-for="(line, index) in lines"
            :key="index"
            class="aci-source-viewer__line"
            ><span
              v-for="(run, position) in line"
              :key="position"
              class="aci-source-run"
              :style="run.htmlStyle"
              >{{ run.content }}</span
            >{{ '\n' }}</span
          ></template
        ></template
      ></pre>
  </div>
</template>

<style scoped>
/* The panel: the name of what is in the box, and the box, in one frame. The
   name inside the border rather than above it is what makes the frame read as
   "this is the frontmatter" instead of as an unlabelled box under a title. */
.aci-source-viewer-panel {
  /* The cap the box takes, measured against the viewport rather than fixed:
     at 24rem a 734-byte settings file scrolled inside a 384px window with
     620px of empty page under it, which is a second scroll container inside
     the one the shell keeps (`App.vue` § .aci-app). `max()` keeps the 24rem
     floor for a short viewport, where a viewport-derived cap would be smaller
     than the box is worth drawing. */
  --aci-source-viewer-max-block-size: max(24rem, calc(100vh - 14rem));
  background: var(--aci-surface-raised);
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  /* The gap the design puts between stacked panels, carried by the panel
     rather than by each page that stacks them: a page that forgot it drew two
     boxes sharing one edge, which reads as one box with a rule through it. */
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

/* The text box. It takes the shown text's own height under the panel's cap —
   past it the box scrolls — and the floor keeps a one-line file from drawing
   a frame with no room to read in. It draws no border and no corners of its
   own: the panel around it draws both, and every caller labels its panel, so
   two borders a pixel apart would read as a box drawn twice.

   The line-number column is sized from the digit count the template writes
   (`--aci-source-viewer-digits`), in `ch` so it follows the type, and never
   narrower than two digits, so a short file's column is not a sliver; the gap
   is the horizontal step the panel's band and padding already use. The two
   values below are what the column is made of, and both renderings of the
   text — the runs, which draw a number before each line, and the placeholder
   standing in for them, which reserves the column instead — take the column
   from these same two, so the text sits at one position before and after
   the colour lands. */
.aci-source-viewer {
  --aci-source-viewer-number-width: max(calc(var(--aci-source-viewer-digits) * 1ch), 2ch);
  --aci-source-viewer-number-gap: 0.625rem;
  counter-reset: aci-source-line;
  font-family: ui-monospace, monospace;
  font-size: var(--aci-source-font-size);
  line-height: var(--aci-source-line-height);
  margin: 0;
  max-block-size: var(--aci-source-viewer-max-block-size);
  min-block-size: 1.5rem;
  overflow: auto;
  padding: 0.5rem 0.625rem;
  /* Authored lines are not reflowed: a wrapped line would show a break the
     file does not contain, and this view's claim is that it shows the file
     exactly as written. */
  white-space: pre;
}

/* The placeholder reserves the column the numbers will take. */
.aci-source-viewer--pending {
  padding-inline-start: calc(
    0.625rem + var(--aci-source-viewer-number-width) + var(--aci-source-viewer-number-gap)
  );
}

/* Each line's number, drawn by the stylesheet rather than written into the
   text: generated content is not selected and not copied, so what a reader
   copies out of the box is the file and nothing else. Muted and right-aligned,
   with no rule beside it: the panel's border already identifies the box, and a
   second line inside it would read as a frame drawn twice. */
.aci-source-viewer__line::before {
  color: var(--aci-muted);
  content: counter(aci-source-line);
  counter-increment: aci-source-line;
  display: inline-block;
  inline-size: var(--aci-source-viewer-number-width);
  margin-inline-end: var(--aci-source-viewer-number-gap);
  text-align: end;
}
</style>
