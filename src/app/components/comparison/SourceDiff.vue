<script setup lang="ts">
// The read-only authored-source comparison surface shared across comparison
// kinds (T197, T1209; research.md § 7, FR-011, FR-012, FR-027). Its inputs
// and its meaning are one across those kinds, which is what a shared
// presentation primitive is (spec.md § Clarifications Session 2026-08-14);
// what differs between them — the pair, and the registry the pair is dropped
// through — arrives as props.
//
// Two `pre`s stand side by side, one per compared text, each holding one
// block per row of the comparison (`source-diff-rows.ts`): the side's line on
// that row — its number, a `+` or `-` where the line is the difference, and
// the runs shiki coloured it into — or a blank where the row is the other
// side's line, so the two sides' rows stay opposite each other by
// construction, with nothing to synchronize. Each side scrolls sideways on
// its own for its long lines; the frame around both scrolls them down
// together. Nothing about either text is transformed on the way in — each
// side is the exact string the caller committed, split and diffed as it is.
// There is no `v-html`, no link, and no image load anywhere here, and no
// control edits, merges, or reverts either side (FR-012).
//
// The rows are on screen the moment the pair is, because the alignment needs
// only the lines. Colour arrives afterwards, when each side's grammar has
// been fetched and applied, and a side whose colour does not arrive stays as
// text, its changed words marked all the same.
//
// A side is either a file's own committed `sourceText` or a section the
// comparison built out of it — the declared metadata serialized to a canonical
// document, the instructions taken out of the format that held them — and
// `contentLabel` is what says which, so a serialized slice is never announced
// as the whole file (FR-025).
//
// A name a compared file mentions — an agent, a skill, another command, a hook
// script, an `mcp_servers` entry — is text on both sides like every other
// line: highlighting is tokenizing rather than rendering, so nothing is
// resolved, opened, imported, connected to, or run (FR-019, FR-033).
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { ThemedToken } from 'shiki/core';
import { resolveSourceLanguage } from '../../composables/source-languages';
import { highlightSource, SOURCE_THEME_FOREGROUND } from '../../composables/syntax-highlighting';
import { inlinePresentationLabel } from '../../../shared/entities';
import {
  SOURCE_VIEWER_LANGUAGE_GRAMMAR,
  type SourceViewerLanguage,
} from '../inspection/source-viewer-language';
import { LineComparison, type SourceDiffSide } from './source-diff-rows';

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
   * than a file: its empty text is diff arithmetic, and the side's name says
   * so instead of naming a file that does not exist (FR-025).
   */
  readonly originalAbsent?: boolean;
  /** Whether the second side is that absence; see {@link originalAbsent}. */
  readonly modifiedAbsent?: boolean;
  /**
   * What of each file the sides show, spliced into each side's accessible
   * name — `frontmatter of` on the serialized-frontmatter diff — so a
   * serialized slice is never announced as the whole file (FR-025). Omitted,
   * the sides are the files.
   */
  readonly contentLabel?: string;
  /**
   * The format both sides are coloured in, overriding what their paths claim:
   * a serialized document is the format this surface serialized it to rather
   * than the format of the file it came from (`source-languages.ts`
   * § resolveSourceLanguage).
   */
  readonly contentLanguage?: SourceViewerLanguage;
  /**
   * The content-owner registry this comparison joins — the comparison that
   * owns the open pair rather than the session, because a pick or a URL edit
   * replaces that pair without a purge and without a newer generation, and
   * the contract orders dispose before replace (data-model.md § BrowserState).
   * Each kind holds its own, so there is no registry this component could
   * reach for on its own.
   */
  readonly registerContentOwner: (dispose: () => void) => () => void;
}>();

/** The current pair, split and aligned — or null after the purge. */
const comparison = shallowRef<LineComparison | null>(null);

/**
 * The first side's coloured runs per line, or null until they arrive — or
 * when they do not, in which case the side stays as uncoloured text.
 */
const originalRuns = shallowRef<ReadonlyArray<ReadonlyArray<ThemedToken>> | null>(null);

/** The second side's runs; see {@link originalRuns}. */
const modifiedRuns = shallowRef<ReadonlyArray<ReadonlyArray<ThemedToken>> | null>(null);

/**
 * Counts pair changes. A tokenizing that resolves after a newer change sees a
 * different value and abandons its runs instead of colouring older files
 * under the newer pair's headings.
 */
let requestedPair = 0;
/** True once teardown has run, so a late tokenizing writes nothing. */
let unmounted = false;

// The rows this component renders hold the pair's authored source — both
// files', or the present side's beside an absent side's empty operand — so
// it is an owner the comparison state drops with the pair: on the central
// purge (FR-027) and before a greater generation is adopted (data-model.md
// § BrowserState). The drop is a change of state and nothing else: the rows
// are Vue's, and the flush that follows — before the next paint — is what
// takes them out of the document, or replaces them with the next pair's when
// one was adopted in the same tick, as the plugin comparison does with a file
// it already holds. Reaching into the elements ahead of that flush would
// leave Vue's own tree pointing at rows no longer in the document, and the
// next pair would be patched into them and never show. The registration is
// unconditional — the caller always passes its pair's registry — because a
// mount that skipped it would hold authored content the central purge cannot
// clear.
const unregisterContentOwner = props.registerContentOwner(() => {
  // Supersede any tokenizing still in flight: one resolving after this would
  // otherwise write the dropped pair back as runs.
  requestedPair += 1;
  comparison.value = null;
  originalRuns.value = null;
  modifiedRuns.value = null;
});

/**
 * The grammar a side is coloured by: the named format's, when the caller
 * knows the texts' syntax and the paths do not say it, or the one the side's
 * own path claims.
 */
function languageOf(sourceRelativePath: string): string {
  return props.contentLanguage === undefined
    ? resolveSourceLanguage(sourceRelativePath)
    : SOURCE_VIEWER_LANGUAGE_GRAMMAR[props.contentLanguage];
}

/**
 * Aligns the current pair and shows it, then colours each side as its
 * grammar arrives. Called from `onMounted` rather than from an immediate
 * watcher so the first pair renders once the elements exist.
 */
async function showCurrentPair(): Promise<void> {
  requestedPair += 1;
  const requested = requestedPair;
  const { originalText, originalPath, modifiedText, modifiedPath } = props;
  comparison.value = new LineComparison(originalText, modifiedText);
  originalRuns.value = null;
  modifiedRuns.value = null;
  // Each side on its own: one side's grammar can fail to arrive — the chunk
  // did not come, most plausibly because the local host went away, or the
  // engine could not compile it (`highlightSource`) — and that side then
  // stays as the text already on screen, its differences marked, while the
  // other keeps its colour.
  const [original, modified] = await Promise.all([
    highlightSource(originalText, languageOf(originalPath)).catch(() => null),
    highlightSource(modifiedText, languageOf(modifiedPath)).catch(() => null),
  ]);
  if (unmounted || requested !== requestedPair) {
    // A newer pair, the purge, or teardown won while the tokenizer was
    // working; these runs colour a pair the reader has moved on from.
    return;
  }
  originalRuns.value = original;
  modifiedRuns.value = modified;
}

/**
 * Each side's accessible name: which side it is, what of the file it shows,
 * and the file — or the stated absence, for a side that names a file its copy
 * does not ship, which must not be announced as a file that does not exist
 * (FR-025). The path rides through the whitespace-safe spelling: an
 * accessible name is a flat string whose consecutive spaces collapse, and
 * two paths differing only in them must not name one box (data-model.md
 * § SourceRelativePath).
 */
function sideName(side: SourceDiffSide): string {
  const position = side === 'original' ? 'First' : 'Second';
  const path = inlinePresentationLabel(
    side === 'original' ? props.originalPath : props.modifiedPath,
  );
  const absent =
    side === 'original' ? props.originalAbsent === true : props.modifiedAbsent === true;
  return absent
    ? `${position} side: no file at ${path}`
    : `${position} compared ${props.contentLabel ?? 'file'} ${path}, read-only`;
}

/** What each side shows, row by row, under the name it is announced by. */
const sides = computed(() =>
  (['original', 'modified'] as const).map((side) => ({
    side,
    name: sideName(side),
    lines:
      comparison.value?.sideLines(
        side,
        side === 'original' ? originalRuns.value : modifiedRuns.value,
      ) ?? [],
  })),
);

/**
 * The digits the line-number column is sized for: the longer side's count,
 * so both sides' numbers sit in one column width and the text starts at one
 * position across the pair.
 */
const digits = computed(
  () =>
    String(
      Math.max(
        comparison.value?.originalLines.length ?? 1,
        comparison.value?.modifiedLines.length ?? 1,
      ),
    ).length,
);

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
});
</script>

<template>
  <!-- The frame: it scrolls the pair down together, and sideways when the
       page is narrower than the pair needs, so a narrow viewport scrolls the
       diff rather than the page (WCAG 1.4.10). `tabindex` because it scrolls:
       WebKit does not make a scrollable overflow container keyboard focusable
       on its own (WCAG 2.1.1), and a stop in the tab order is named, through
       `role="group"`, because ARIA prohibits a name on the generic role a
       `div` has of its own.

       Every tag inside a `pre` opens and closes flush with its neighbour,
       because the element renders whitespace as written: a newline between
       two tags there would be a newline in the file. -->
  <div
    class="aci-source-diff__scroller"
    tabindex="0"
    role="group"
    :aria-label="`Comparison of ${inlinePresentationLabel(originalPath)} and ${inlinePresentationLabel(modifiedPath)}`"
  >
    <div
      class="aci-source-diff"
      :style="{
        '--aci-source-diff-digits': digits,
        '--aci-source-diff-word-light': SOURCE_THEME_FOREGROUND.light,
        '--aci-source-diff-word-dark': SOURCE_THEME_FOREGROUND.dark,
      }"
    >
      <pre
        v-for="side in sides"
        :key="side.side"
        class="aci-source-diff__side"
        tabindex="0"
        role="group"
        :aria-label="side.name"
      ><span
          v-for="(line, row) in side.lines"
          :key="row"
          :class="`aci-source-diff__line aci-source-diff__line--${line.kind}`"
          ><template v-if="line.number !== null"
            ><span
              v-for="(run, position) in line.runs"
              :key="position"
              class="aci-source-run aci-source-diff__run"
              :class="{ 'aci-source-diff__run--changed': run.changed }"
              :style="run.htmlStyle"
              >{{ run.content }}</span
            >{{ '\n' }}</template
          ></span
        ></pre>
    </div>
  </div>
</template>

<style scoped>
/* The frame around the pair. The border and corners are its rather than the
   pair's, so they stay put while the content scrolls inside them; the cap
   keeps a long comparison from taking the page — past it the frame scrolls.
   Vertical scrolling is the frame's for both sides at once, because the two
   sides' rows are aligned by construction and one scroll position is what
   keeps them so. */
.aci-source-diff__scroller {
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  max-block-size: 28rem;
  overflow: auto;
}

/* The two sides, opposite each other at every width. A comparison shown as
   one column is no longer a comparison — the two files stop standing opposite
   each other — so below the width two readable columns need, the frame
   scrolls this box sideways rather than collapsing it: a side-by-side diff is
   content that requires a two-dimensional layout for its meaning, which is
   what WCAG 1.4.10 excepts, and keeping the scroll inside the frame is what
   keeps the page itself reflowing. The gap between the sides is what
   separates them: the frame already identifies the box, and a rule between
   the sides would read as a frame drawn twice.

   The line-number column is sized from the digit count the template writes
   (`--aci-source-diff-digits`), in `ch` so it follows the type, never narrower
   than two digits, and two characters wider for the `+` or `-` a changed line
   carries; the gap is the horizontal step the panels around it already use. */
.aci-source-diff {
  --aci-source-diff-number-width: max(calc(var(--aci-source-diff-digits) * 1ch), 2ch);
  --aci-source-diff-number-gap: 0.625rem;
  display: grid;
  gap: 0.625rem;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-inline-size: 60rem;
}

/* One side: the browser's own `pre`, laid out in the product's source type,
   scrolling sideways on its own for its long lines — authored lines are not
   reflowed, because a wrapped line would show a break the file does not
   contain. `tabindex` because it scrolls (WCAG 2.1.1). */
.aci-source-diff__side {
  counter-reset: aci-source-diff-line;
  font-family: ui-monospace, monospace;
  font-size: var(--aci-source-font-size);
  line-height: var(--aci-source-line-height);
  margin: 0;
  overflow-x: auto;
  padding: 0.5rem 0.625rem;
  white-space: pre;
}

/* One row of a side. A block, so a difference paints the whole row; as wide
   as its content and never narrower than the side, so the paint reaches the
   end of a long line the side has scrolled to; and never shorter than a line,
   so a blank row — the other side's line — holds its place. */
.aci-source-diff__line {
  display: block;
  inline-size: max-content;
  min-block-size: var(--aci-source-line-height);
  min-inline-size: 100%;
}

.aci-source-diff__line--added {
  background: var(--aci-diff-added);
}

.aci-source-diff__line--removed {
  background: var(--aci-diff-removed);
}

/* Each line's number and, on a line that is the difference, its mark — drawn
   by the stylesheet rather than written into the text: generated content is
   not selected and not copied, so what a reader copies out of a side is that
   side's text and nothing else. The mark is what carries the difference where
   colour cannot — under forced colours, and to a reader who does not tell the
   two row colours apart (WCAG 1.4.1). Two trailing spaces on an unchanged
   line keep every number in one column. Muted and right-aligned, with no rule
   beside it: the frame already identifies the box. */
.aci-source-diff__line::before {
  color: var(--aci-muted);
  content: counter(aci-source-diff-line) '  ';
  counter-increment: aci-source-diff-line;
  display: inline-block;
  inline-size: calc(var(--aci-source-diff-number-width) + 2ch);
  margin-inline-end: var(--aci-source-diff-number-gap);
  text-align: end;
}

.aci-source-diff__line--added::before {
  content: counter(aci-source-diff-line) ' +';
}

.aci-source-diff__line--removed::before {
  content: counter(aci-source-diff-line) ' -';
}

/* A blank row is nobody's line: no number, and no step in the count. */
.aci-source-diff__line--absent::before {
  content: '';
  counter-increment: none;
}

/* The words of a changed line the other side lacks, on a band of the row's
   colour taken one step stronger — the form every comparison a reader already
   knows marks its words in, so it needs no explaining — and drawn in the
   theme's default text colour rather than each token's own. Two colour
   languages cannot share one character: the band says "this changed" and the
   token colour says "this is a keyword", and a band that carries every token
   colour has one contrast ratio to keep per colour, which is what would keep
   the dark band under its row (`main.css` § --aci-diff-added). One colour on
   the band leaves one ratio, so the band can be as strong as its job needs.
   The reader sees the band, so one colour inside it reads as part of the
   marking, the way selected text does; the theme's own default rather than
   `--aci-text`, so a band's text is the colour of the uncoloured runs beside
   it rather than a second white. Weight and slant stay the token's: a bold
   heading word stays bold. The pair is the themes' own
   (`SOURCE_THEME_FOREGROUND`), written onto the pair's box by the template
   and chosen between by the same `light-dark()` that chooses a run's colour;
   the scoping attribute alone outranks the run rule (`main.css`
   § .aci-source-run), which is what keeping a run's colour in the stylesheet
   rather than inline buys (`syntax-highlighting.ts` § highlightSource). */
.aci-source-diff__run--changed {
  color: light-dark(var(--aci-source-diff-word-light), var(--aci-source-diff-word-dark));
}

.aci-source-diff__line--added .aci-source-diff__run--changed {
  background: var(--aci-diff-added-strong);
}

.aci-source-diff__line--removed .aci-source-diff__run--changed {
  background: var(--aci-diff-removed-strong);
}
</style>
