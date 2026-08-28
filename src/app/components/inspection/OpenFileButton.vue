<script setup lang="ts">
// The control a detail page offers beside a file's path: open this file in an
// application on the reader's own machine (FR-022).
//
// The product holds no path the browser could open. The absolute path is the
// host's — the client is given the Source's root only as a one-way display
// escaping that is never decoded for I/O (data-model.md § SourceBoundary) — so
// this control asks the host to perform the launch and sends the file's
// Source-relative Path, which is the identity every other request already uses
// (FR-030).
//
// It is a split button: the icon opens with the application the reader last
// chose, and the chevron beside it opens the list of the others. A reader who
// always uses one editor therefore never opens the list, and the icon says
// which application a plain click would reach, so the button is not a guess.
// The choice is remembered across visits (`open-target-preference.ts`).
//
// Which applications appear is the host's answer, not this component's: the
// snapshot publishes the ones it can actually launch, so an editor this
// machine does not have is absent from the list rather than offered and left
// to do nothing. With one application published there is nothing to choose
// between, and the control is the single icon button with no chevron and no
// list at all.
//
// The list is a disclosure of ordinary buttons rather than an ARIA menu. Both
// are conforming; the disclosure is what this control actually is — a short
// set of buttons revealed by a toggle — and it stays operable with Tab and
// Enter alone, where a `menu` role would owe readers arrow-key roving focus
// this product would then have to keep correct.
//
// That disclosure is a popover, so the platform owns what a hand-written
// dropdown otherwise re-implements: `popovertarget` opens and closes it, a
// press outside dismisses it, Escape closes it and returns focus to the
// toggle, and it draws in the top layer where no ancestor's stacking or
// clipping reaches it. Anchor positioning then hangs it from the control,
// flips it to the side that has room, and settles on the position that
// overflows least where neither side does, which is what keeps it inside the
// viewport at the reflow width (WCAG 1.4.10) — measuring the room left beside
// a box is the one thing hand-written positioning cannot do.
import { computed, inject, ref, useId, useTemplateRef, watch } from 'vue';
import type { Component } from 'vue';
import ChevronDownIcon from '~icons/lucide/chevron-down';
import ContainingFolderIcon from '~icons/lucide/folder-open';
import DefaultApplicationIcon from '~icons/lucide/external-link';
import SublimeTextIcon from '~icons/simple-icons/sublimetext';
import TerminalEditorIcon from '~icons/lucide/terminal';
import VisualStudioCodeIcon from '~icons/simple-icons/visualstudiocode';
import { FILE_OPEN_TARGET_TEXT } from '../../../shared/api-text';
import type { FileOpenTarget, SourceSelector } from '../../../shared/api-types';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import {
  rememberOpenTarget,
  rememberedOpenTarget,
  selectedOpenTarget,
} from './open-target-preference';

const props = defineProps<{
  /** The committed file this control opens, by its Source-relative Path. */
  sourceRelativePath: string;
  /**
   * Which Source holds it — the other half of the file's identity (FR-030).
   * The page's own addressed Source: what opens must be the file the page is
   * showing, and a consented home and the selected repository can hold one
   * path under two different roots.
   */
  source: SourceSelector;
}>();

const sessionViewState = inject(SESSION_VIEW_STATE);

/**
 * The icon each application is shown by, so the button's own face says where a
 * click would go. `Readonly<Record<FileOpenTarget, Component>>` for the reason
 * the caption table has the same shape: a target nobody has drawn an icon for
 * must not compile (AGENTS.md User-visible copy policy).
 */
const TARGET_ICON: Readonly<Record<FileOpenTarget, Component>> = {
  /** The editor's own brand mark, so the button names the application rather than a category. */
  'visual-studio-code': VisualStudioCodeIcon,
  /** The other editor's brand mark, for the same reason. */
  'sublime-text': SublimeTextIcon,
  /** A prompt: the reader's own editor, in the window this opens for it. */
  'terminal-editor': TerminalEditorIcon,
  /** The reader's own handler for the file type: the generic "opens elsewhere" mark. */
  'default-application': DefaultApplicationIcon,
  /** The one target that opens a directory rather than the file. */
  'containing-folder': ContainingFolderIcon,
};

/** Ties the toggle to the popover it controls even while that popover is closed. */
const listId = useId();

/**
 * True while the list of applications is showing. The popover is what opens
 * and closes — through the toggle, a press outside, or Escape — so this is
 * kept in step with it by its own `toggle` event rather than assigned where a
 * press is handled: the two dismissals this component never hears about would
 * otherwise leave the toggle claiming to be expanded.
 */
const listOpen = ref(false);

/**
 * True while a launch this control asked for has not answered yet. Most
 * launches answer in milliseconds, and one does not: opening a terminal
 * editor goes through the operating system's automation host, which on a
 * machine that has not yet granted this product permission to control the
 * terminal waits on a consent dialog the reader has to answer. Without this
 * the button would look inert for as long as that takes.
 */
const requesting = ref(false);

/**
 * What went wrong with the last open request, or null when nothing has. Held
 * here rather than in the session view state because it belongs to this
 * control and this file: a shared error would put one file's failure beside
 * another file's button.
 */
const failure = ref<string | null>(null);

/** The toggle, so a choice returns focus to what opened the list. */
const toggle = useTemplateRef<HTMLButtonElement>('toggle');

/** The popover, so this component can close it as well as the platform. */
const list = useTemplateRef<HTMLElement>('list');

/** The whole control, so focus leaving it can be told from focus moving inside it. */
const container = useTemplateRef<HTMLElement>('container');

/** The applications this host published for this machine, in its own order. */
const targets = computed<readonly FileOpenTarget[]>(
  () => sessionViewState?.snapshot.value?.fileOpenTargets ?? [],
);

/**
 * The application a plain click opens with; null while no snapshot is
 * adopted, and the control renders nothing then. The rule itself lives beside
 * the preference it reads ({@link selectedOpenTarget}).
 */
const selected = computed<FileOpenTarget | null>(() =>
  selectedOpenTarget(targets.value, rememberedOpenTarget.value),
);

/** Asks the host to open the file, and keeps what it answered. */
async function openWith(target: FileOpenTarget): Promise<void> {
  // One launch at a time. A second press while one is waiting on the consent
  // dialog would ask for the same window twice.
  if (requesting.value) {
    return;
  }
  failure.value = null;
  // The control is only rendered under an adopted snapshot, which the shell
  // renders only with the view state provided.
  if (sessionViewState === undefined) {
    return;
  }
  // The file this request is for. One instance of this control serves a
  // sequence of files — a skill's page keeps it while the reader walks the
  // tree — so a settlement is reported only while the page still shows the
  // file it was asked about; otherwise the previous file's failure would
  // appear beside the new one's path.
  const requestedPath = props.sourceRelativePath;
  const requestedSource = props.source;
  requesting.value = true;
  const outcome = await sessionViewState.openFile(requestedPath, requestedSource, target);
  if (requestedPath !== props.sourceRelativePath || requestedSource !== props.source) {
    requesting.value = false;
    return;
  }
  requesting.value = false;
  switch (outcome.kind) {
    case 'opened':
      return;
    case 'rejected':
      // `stale-resource`: the committed generation behind this page no longer
      // holds the file — it was removed, or renamed, since the scan this page
      // was rendered from.
      failure.value = 'This file is no longer in the current scan. Rescan, then try again.';
      return;
    case 'failed':
      // The real error the host reported, and what the reader can do about it
      // (QR-004): the host names what failed, and this names the moves that
      // are theirs — another application from the list, or the same one after
      // the machine can start it.
      failure.value = `${outcome.error.message} Try another application from the list, or check that this one is installed and allowed to start, then try again.`;
      return;
  }
}

/** Remembers the reader's choice, closes the list, and opens the file that way. */
function chooseAndOpen(target: FileOpenTarget): void {
  // The same one-at-a-time rule the primary button follows, checked before the
  // choice is remembered: a press that cannot open anything must not change
  // what the next one will open with either.
  if (requesting.value) {
    return;
  }
  rememberOpenTarget(target);
  // Focus moves before the popover is hidden: the button the reader pressed is
  // inside it, and the platform returns focus to the toggle for its own
  // dismissals only — WebKit drops it to the document body when a page hides a
  // popover itself (WCAG 2.4.3). The toggle is the control the list belongs
  // to, which is where Escape and a press outside put it too.
  toggle.value?.focus();
  list.value?.hidePopover();
  void openWith(target);
}

// The failure belongs to the file it was reported for: one instance of this
// control serves a sequence of files, so a new file starts with no failure
// beside it rather than the previous file's.
watch(
  () => props.sourceRelativePath,
  () => {
    failure.value = null;
  },
);

/** Follows the popover's own open state, which is what {@link listOpen} states. */
function followListState(event: ToggleEvent): void {
  listOpen.value = event.newState === 'open';
}

/**
 * Closes the list when focus leaves the control entirely, such as on Tab —
 * the one dismissal the platform does not perform, since a popover stays open
 * while focus moves past it. The popover draws in the top layer but remains
 * this element's descendant, so focus moving into it is focus staying inside.
 */
function closeOnFocusLeaving(event: FocusEvent): void {
  const next = event.relatedTarget;
  if (next instanceof Node && container.value?.contains(next) === true) {
    return;
  }
  list.value?.hidePopover();
}
</script>

<template>
  <span
    v-if="selected !== null"
    ref="container"
    class="aci-open-file-button"
    @focusout="closeOnFocusLeaving"
  >
    <span class="aci-open-file-button__controls">
      <!-- The icon is the whole button, so the accessible name is the caption
           the list would show for the same application, and `title` gives
           pointer readers the same words (WCAG 2.5.3). -->
      <button
        type="button"
        class="aci-open-file-button__action"
        :title="FILE_OPEN_TARGET_TEXT[selected]"
        :aria-label="FILE_OPEN_TARGET_TEXT[selected]"
        :aria-disabled="requesting || undefined"
        @click="openWith(selected)"
      >
        <component
          :is="TARGET_ICON[selected]"
          class="aci-open-file-button__icon"
          aria-hidden="true"
        />
      </button>
      <!-- Nothing to choose between when the host published one application,
           and no toggle for a list that would hold one item. `popovertarget`
           is the whole open-and-close: the press, the press outside, and
           Escape are the platform's, and `aria-expanded` follows what it did
           rather than what was pressed. -->
      <button
        v-if="targets.length > 1"
        ref="toggle"
        type="button"
        class="aci-open-file-button__toggle"
        :popovertarget="listId"
        :aria-expanded="listOpen"
        :aria-controls="listId"
        title="Choose how to open this file"
        aria-label="Choose how to open this file"
      >
        <ChevronDownIcon class="aci-open-file-button__icon" aria-hidden="true" />
      </button>
    </span>
    <!-- Kept in the document while closed, rather than inserted when it opens,
         so the toggle's `aria-controls` always names an element that exists.
         A closed popover is `display: none`, which keeps its buttons out of
         the tab order meanwhile. -->
    <ul
      :id="listId"
      ref="list"
      popover
      class="aci-open-file-button__list"
      @toggle="followListState"
    >
      <li v-for="target of targets" :key="target">
        <button
          type="button"
          class="aci-open-file-button__choice"
          :aria-current="target === selected ? true : undefined"
          :aria-disabled="requesting || undefined"
          @click="chooseAndOpen(target)"
        >
          <component
            :is="TARGET_ICON[target]"
            class="aci-open-file-button__icon"
            aria-hidden="true"
          />
          {{ FILE_OPEN_TARGET_TEXT[target] }}
        </button>
      </li>
    </ul>
    <!-- Beside the control that failed, and announced without moving focus
         (WCAG 4.1.3). Stable rather than inserted with the message it carries:
         a region that appears together with its text is not reliably read,
         which is why every other surface here mounts its live region empty. -->
    <span class="aci-open-file-button__failure" role="status">{{ failure ?? '' }}</span>
  </span>
</template>

<style scoped>
/* Beside the path it opens, and never louder than it: the path is what the
   reader came for, this is one thing they can do with it. `anchor-scope`
   confines the anchor below to this instance: an anchor name is otherwise
   document-wide and resolves to the last element carrying it, so on a page
   rendering two of these controls every list would hang from the second. */
.aci-open-file-button {
  anchor-scope: --aci-open-file;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-inline-start: 0.6rem;
  vertical-align: middle;
}

/* The two halves read as one control, so they share a border and only the
   seam between them divides them — and the list hangs from the pair rather
   than from the chevron that opens it. */
.aci-open-file-button__controls {
  anchor-name: --aci-open-file;
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--aci-border);
  border-radius: 0.25rem;
}

.aci-open-file-button__action,
.aci-open-file-button__toggle {
  background: none;
  border: 0;
  color: var(--aci-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.35rem;
}

.aci-open-file-button__action:hover,
.aci-open-file-button__toggle:hover {
  color: var(--aci-text);
}

.aci-open-file-button__toggle {
  border-inline-start: 1px solid var(--aci-border);
  padding-inline: 0.15rem;
}

.aci-open-file-button__icon {
  /* The icons inherit the text size and colour around them, so the control
     keeps its proportion to the heading it sits beside and its marks dim and
     brighten with the rest of it. That is why the editor's mark is the
     single-colour brand glyph rather than the full-colour logo: a fixed-colour
     logo would stay bright while everything around it is muted. */
  height: 1em;
  width: 1em;
}

/* Hung under the control and starting where it starts, so the entries begin
   on the edge the reader's eye is already on. The end edge is what a control
   fixed to the end of its container would anchor to; this one is not — it
   flows after a path, so where it lands on its line is a fact about that
   path's length. The fallbacks answer what the anchor cannot: a control near
   the end of a narrow viewport, where the list flips to end where the control
   ends, and one with no room below it, where it flips above. The list is then
   inside the viewport at any width and at 200% zoom with no two-dimensional
   page scrolling (WCAG 1.4.10, contracts/accessibility-acceptance.md
   AUTO-1.4.10). Choosing between them needs the room left beside the control,
   which is the measurement no hand-written position has. */
.aci-open-file-button__list {
  position: absolute;
  position-anchor: --aci-open-file;
  position-area: block-end span-inline-end;
  position-try-fallbacks:
    flip-inline,
    flip-block,
    flip-block flip-inline;
  background: var(--aci-surface-raised);
  border: 1px solid var(--aci-border);
  border-radius: 0.25rem;
  color: var(--aci-text);
  font-size: 0.85rem;
  font-weight: 400;
  list-style: none;
  /* A popover's own margin is `auto`, which would centre it in the viewport;
     this replaces it with the gap between the control and the list. */
  margin: 0.25rem 0 0;
  padding: 0.2rem;
  max-width: min(20rem, 90vw);
}

.aci-open-file-button__choice {
  background: none;
  border: 0;
  border-radius: 0.2rem;
  color: var(--aci-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  text-align: start;
  /* An entry wraps rather than widening the list past the viewport: a folder
     name is authored text and can be any length. The icon stays on the first
     line with the text beside it. */
  overflow-wrap: anywhere;
  width: 100%;
}

.aci-open-file-button__choice:hover {
  background: var(--aci-surface-sunken);
}

/* The application a plain click would use, marked so the list also answers
   "what does the button do now". */
.aci-open-file-button__choice[aria-current='true'] {
  color: var(--aci-accent);
}

.aci-open-file-button__failure {
  color: var(--aci-muted);
  font-size: 0.8rem;
  font-weight: 400;
}
</style>
