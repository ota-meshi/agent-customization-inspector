<script setup lang="ts">
// The skill detail route (T102): what one skill is, and the files it is made of.
//
// The skill is the subject, not the file. A reader arriving here asked about a
// customization, so the page opens with what was recognized — the declared
// name, the product that recognizes it, the values its allowlist admits, and
// what is known about whether that product would use it — and the directory's
// files come after, as the detail of that. A page that opened on a file made
// the reader assemble the skill from its parts.
//
// That opening is a summary, and the rest of the recognition is behind a
// disclosure. Someone reading a skill's `scripts/run.sh` is not asking which
// rule admitted the `SKILL.md` or how well it is documented, and a page that
// showed all of it pushed the files off the screen — so every file selection
// cost a scroll back. The page is laid out to fit its viewport instead: the
// summary is fixed at the top, and the tree and the source share the remaining
// height and scroll inside themselves.
//
// That order is also why selecting a companion says nothing about recognition.
// A `scripts/run.sh` carries no recognition of its own — no rule admits it, and
// none should — so a page built around the open file had to report that nothing
// recognized it, which is true of the file and false of what the reader is
// looking at. Here the recognition on screen is always the skill's, and
// selecting a file changes only which source is shown.
//
// The URL names a file rather than a skill because a skill has no identity of
// its own to name: its entry point is a committed file and so is every
// companion, and the file selected is exactly what the reader needs the URL to
// remember. The skill is resolved from that file against the committed
// inventory, so a link to any file of a skill opens the skill with that file
// showing.
//
// This is the only surface in the product that shows file contents, and it
// shows them exactly as authored — credentials included, with nothing masked
// and no control that would uncover a masked value. It says none of that: the
// files are the reader's own, over a loopback-bound session, so a viewer that
// announced what a file might contain would be narrating the reader's
// repository back at them, and a confirmation step in front of it would guard
// nothing while making every file take two interactions to read (FR-027).
//
// Three things cause the open skill to be dropped, and all three are the same
// cleanup. Leaving the route disposes it. A client-data purge clears it. And a
// commit rekeys every file ID, so a rescan invalidates the ID in this URL — the
// inventory then holds no such file and the page says so, rather than showing
// content from a generation that no longer exists.
import { computed, inject, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import RecognitionDetails from '../../components/inspection/RecognitionDetails.vue';
import RecognitionSummary from '../../components/inspection/RecognitionSummary.vue';
import SkillFileTree from '../../components/inspection/SkillFileTree.vue';
import SourceViewer from '../../components/inspection/SourceViewer.vue';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import {
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  rendersNothingVisible,
} from '../../../shared/entities';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats rendering a detail page with no
  // session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const route = useRoute();
/**
 * The opaque file ID from the URL. A route parameter can be an array when a
 * path repeats it; this route's does not, so the array form is folded to its
 * first value rather than handled as a case.
 */
const openFileId = computed((): string => {
  const parameter: unknown = route.params['fileId'];
  if (typeof parameter === 'string') {
    return parameter;
  }
  // A repeated parameter arrives as an array. This route declares one segment,
  // so the array form is folded to its first value instead of being handled as
  // a case; anything else is not a file ID and leaves the page requesting
  // nothing.
  return Array.isArray(parameter) && typeof parameter[0] === 'string' ? parameter[0] : '';
});

const skillDetail = sessionViewState.skillDetail;
const openCompanion = sessionViewState.openCompanion;
const detailState = sessionViewState.skillDetailState;
const snapshot = sessionViewState.snapshot;

/**
 * The inventory row and definition the URL's file belongs to — whether that
 * file is the skill's entry point or one of its companions.
 *
 * Resolved from the committed snapshot rather than from a fetched detail,
 * because the entry point has to be known *before* anything is requested: it is
 * what carries the recognition this page is built around. A file the snapshot
 * does not hold belongs to no current generation, which is the same thing the
 * host would answer, so the page can say so without a doomed request.
 */
const owner = computed(() => {
  const path = (snapshot.value?.files ?? []).find(
    (file) => file.fileId === openFileId.value,
  )?.sourceRelativePath;
  if (path === undefined) {
    return null;
  }
  for (const entry of snapshot.value?.skills ?? []) {
    for (const definition of entry.definitions) {
      if (definition.fileId === openFileId.value || definition.companionFiles.includes(path)) {
        return { entry, definition };
      }
    }
  }
  return null;
});

/**
 * Every file of that skill, resolved to the committed identity that opens it:
 * the entry point first, then its census in the order the census published.
 *
 * A path with no committed file is dropped rather than shown as an entry that
 * cannot be opened. It is not a case the current generation can produce — the
 * scan reads and publishes what the census listed — but `Map.get` is typed for
 * absence and silently offering a dead link would be worse than showing one
 * fewer file.
 */
const treeFiles = computed(() => {
  const definition = owner.value?.definition;
  if (definition === undefined) {
    return [];
  }
  const files = snapshot.value?.files ?? [];
  const byPath = new Map(files.map((file) => [file.sourceRelativePath, file.fileId]));
  const entryPath = files.find((file) => file.fileId === definition.fileId)?.sourceRelativePath;
  return [...(entryPath === undefined ? [] : [entryPath]), ...definition.companionFiles].flatMap(
    (sourceRelativePath) => {
      const fileId = byPath.get(sourceRelativePath);
      return fileId === undefined ? [] : [{ fileId, sourceRelativePath }];
    },
  );
});

/** The directory the tree is rooted at, so a row shows a name rather than a path. */
const treeDirectory = computed(() => {
  const path = treeFiles.value[0]?.sourceRelativePath ?? '';
  return path.slice(0, path.lastIndexOf('/') + 1);
});

/**
 * What the page is titled: the declared name exactly as authored, or the skill
 * directory's own name when the file declares none a heading can render — no
 * name, an empty one, or one of only whitespace. The trim below is only that
 * renderability test; the displayed value is never trimmed, because a shown
 * declared value is the value the parser resolved (FR-025), and the inventory
 * row shows the same characters. A whitespace-only or empty name stays
 * readable as itself in the recognition's declared-values list. Empty when
 * neither name exists, which the template renders as the kind rather than as
 * a blank line.
 */
const headingName = computed(() => {
  const declared = owner.value?.entry.declaredName;
  if (declared !== undefined && declared !== null && !rendersNothingVisible(declared)) {
    return declared;
  }
  // The directory's own name, not its path: the path is on the line below, and
  // a heading that repeated it would say one thing twice. Path text escapes
  // its control characters for presentation (data-model.md
  // § SourceRelativePath); the declared branch above is an authored value and
  // stays exact.
  const directoryName = escapeControlCharacters(
    treeDirectory.value.replace(/\/$/u, '').split('/').at(-1) ?? '',
  );
  // A directory named only with characters that draw nothing fails the same
  // renderability test as such a declared name: the escape above leaves a space
  // a space and a zero-width space a zero-width space, and a heading of those
  // is a heading the reader cannot see. Empty hands the page to the kind below;
  // the real name is on the path line.
  return rendersNothingVisible(directoryName) ? '' : directoryName;
});

/**
 * The file whose source is on screen: the companion when one is open, else the
 * entry point — and only when it is the file the URL names. While a switch to
 * another file of the same skill is in flight, the held state still carries
 * the previous file; showing it under the new selection would put one file's
 * source beneath another file's tree marking, so the pane shows its loading
 * state instead.
 */
const openFile = computed(() => {
  const file = openCompanion.value?.file ?? skillDetail.value?.file ?? null;
  return file !== null && file.fileId === openFileId.value ? file : null;
});

/**
 * The open file's path as presentation text: control characters escaped
 * (data-model.md § SourceRelativePath). A computed rather than an inline call,
 * because the pre-wrap heading renders every character between its tags and a
 * wrapped template expression would put its own indentation there.
 */
const openFilePathText = computed(() =>
  openFile.value === null ? '' : escapeControlCharacters(openFile.value.sourceRelativePath),
);

/**
 * The diagnostics of the file on screen that no recognition summary above has
 * already stated. A `recognition-parse-failed` record belongs to both its
 * recognition and its file, so showing the file's list unfiltered would print
 * it twice — two rows a reader cannot tell apart.
 */
const openFileDiagnostics = computed(() => {
  const detail = openCompanion.value ?? skillDetail.value;
  const shownAbove = new Set(
    (skillDetail.value?.recognitions ?? []).flatMap((recognition) => recognition.diagnosticIds),
  );
  return (detail?.diagnostics ?? []).filter(
    (diagnostic) => !shownAbove.has(diagnostic.diagnosticId),
  );
});

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus, so a reader who cannot see the swap
 * needs them said (WCAG 4.1.3, contracts/accessibility-acceptance.md
 * § 4.1.3): the stale state, a file selection loading while focus stays in
 * the tree, and a companion that failed to load. Each phrase matches the
 * visible copy. An entry failure is announced by the shell's alert region
 * through the retained error message, and ready content is read as focus
 * moves through it, so neither is repeated here.
 */
const detailAnnouncement = computed(() => {
  if (detailState.value === 'stale' || owner.value === null) {
    return 'This link does not name a file in the current scan.';
  }
  if (detailState.value === 'companion-failed') {
    return 'This file could not be loaded.';
  }
  if (detailState.value === 'loading') {
    return 'Loading this skill…';
  }
  if (detailState.value === 'ready' && openFile.value === null) {
    return 'Loading this file…';
  }
  return '';
});

/** The page heading, focused on entry so a keyboard user starts at the top. */
const heading = ref<HTMLHeadingElement | null>(null);

/** The pane holding the open file's source; read by the focus guard below. */
const paneElement = ref<HTMLElement | null>(null);

/** The page's root, so the stale guard can tell whether it held focus. */
const pageRoot = ref<HTMLElement | null>(null);

/** Set as the route is left, so the focus guard yields to the next route. */
let leaving = false;

/**
 * Requests the skill and file the URL currently names. The route watcher below
 * calls it on every selection, and the failed-load branch calls it again as
 * the retry — same inputs, same path.
 */
const requestOpen = (): void => {
  const resolved = owner.value;
  if (openFileId.value === '' || resolved === null) {
    return;
  }
  void sessionViewState.openSkill(resolved.definition.fileId, openFileId.value);
};

// One effect owns "which skill and file should be open", so entering the route
// and moving between a skill's files take the same path. The owner is watched
// by its definition's file ID rather than by the computed's object identity:
// every snapshot adoption rebuilds the object, and an identity watch would
// re-request — and supersede — a detail already in flight for the same
// selection on every refresh.
watch(
  [openFileId, (): string | null => owner.value?.definition.fileId ?? null],
  ([id, definitionFileId]) => {
    if (id === '' || definitionFileId === null) {
      // The URL names nothing this generation holds — a link from an earlier
      // scan, or a file that is no longer committed. Dropping what is open is
      // the point: the page shows the recoverable state below, and holding the
      // last skill's source behind it would keep authored content the reader
      // has navigated away from.
      sessionViewState.closeSkill();
      return;
    }
    requestOpen();
  },
  { immediate: true },
);

// Focus moves to the heading when the *skill* changes, not when a file within
// it does. Following a link in an SPA moves no focus by itself, so arriving
// here from the inventory has to place it; but selecting a file leaves the
// reader in the tree they are using, and pulling focus out of it would also
// scroll the page to the top on every click.
function focusHeading(): void {
  heading.value?.focus();
}

// The document title names what this page shows (WCAG 2.4.2): the shell owns
// assembling the title, and this page owns knowing its subject, so it reports
// the heading's name — the same words a sighted reader sees at the top. Empty
// reports as null, which titles the route by its surface name instead.
watchEffect(() => {
  sessionViewState.pageSubject.value = headingName.value === '' ? null : headingName.value;
});

/**
 * The failed-load retry. Separate from {@link requestOpen} because the button
 * this click comes from vanishes with the failed branch the moment the state
 * returns to loading, and focus would drop to the document body
 * (WCAG 2.4.3); the heading is the landmark that survives the transition.
 */
const retryOpen = (): void => {
  focusHeading();
  requestOpen();
};

// Arriving from the inventory: the shell is already mounted, so nothing else
// places focus, and this page's own mount is the moment its heading exists.
onMounted(focusHeading);
// And again when the route moves to a different skill, which mounts no new page.
watch(() => owner.value?.definition.fileId, focusHeading);

// While a switch to another file is in flight, the pane is replaced by its
// loading state. If keyboard focus is inside it at that moment — reading the
// source in Monaco when a history navigation changes the selection — the
// unmount would drop focus to the document body, silently restarting keyboard
// and reader position from the top. The guard runs synchronously, before Vue
// patches the pane away, because afterwards the focused element is already
// gone. Leaving the route is excluded: the next route owns focus then.
watch(
  openFile,
  (file) => {
    if (file === null && !leaving && paneElement.value?.contains(document.activeElement) === true) {
      focusHeading();
    }
  },
  { flush: 'sync' },
);

// The stale transition replaces the whole body of the page — the tree the
// reader may be navigating included — not just the pane, so its guard watches
// the state itself and considers the whole page root (WCAG 2.4.3).
watch(
  [detailState, owner],
  ([state, resolved]) => {
    if (
      (state === 'stale' || resolved === null) &&
      !leaving &&
      pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== heading.value
    ) {
      focusHeading();
    }
  },
  { flush: 'sync' },
);

onBeforeUnmount(() => {
  leaving = true;
  // Leaving the route drops the authored source this page requested, and the
  // title subject with it — the next route reports its own or none.
  sessionViewState.pageSubject.value = null;
  sessionViewState.closeSkill();
});
</script>

<template>
  <div ref="pageRoot" class="aci-skill-detail">
    <p><NuxtLink to="/">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">
      <!-- The declared name is the skill's identity — it is what the product's
           own selectors use — and the directory names it when the file declares
           none it can show. A name of nothing but whitespace is one a heading
           cannot render, so it falls back with the absent case rather than
           leaving the page untitled; the authored value itself stays readable
           in the declared-values list below. The span hugs its binding because
           it renders authored whitespace. -->
      <span v-if="headingName" class="aci-authored-text">{{ headingName }}</span>
      <template v-else>Skill</template>
    </h2>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read;
         the shell's regions follow the same pattern. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ detailAnnouncement }}
    </p>

    <template v-if="detailState === 'loading'">
      <p class="aci-empty">Loading this skill…</p>
    </template>

    <template v-else-if="detailState === 'stale' || owner === null">
      <p class="aci-error">
        This link does not name a file in the current scan. Every file gets a new identity when a
        scan commits, so a link made before the last rescan no longer resolves.
      </p>
      <p><NuxtLink to="/">Return to the inventory and open it again.</NuxtLink></p>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held, and the error itself is reported by the shell. What this page
         owes the reader is the way to try again without re-finding the link. -->
    <template v-else-if="skillDetail === null">
      <p class="aci-error">This skill could not be loaded.</p>
      <p>
        <button type="button" @click="retryOpen">Try again</button>
      </p>
    </template>

    <template v-else-if="skillDetail">
      <div class="aci-skill-overview">
        <!-- Path text escapes control characters for presentation
             (data-model.md § SourceRelativePath); the stored value that roots
             the tree below is unchanged. -->
        <p class="aci-path aci-authored-text">{{ escapeControlCharacters(treeDirectory) }}</p>

        <!-- What was recognized, before any file contents: this is what the
             reader came for, and the files below are its detail. Every
             recognition here is the entry point's, so selecting a companion
             never changes it. -->
        <RecognitionSummary
          v-for="recognition in skillDetail.recognitions"
          :key="recognition.recognitionId"
          :recognition="recognition"
          :diagnostics="skillDetail.diagnostics"
        />

        <!-- Closed by default and remembered by nothing: a reader who wants it
             opens it, and a reader reading files never pays for it. -->
        <details
          v-for="recognition in skillDetail.recognitions"
          :key="`why-${recognition.recognitionId}`"
        >
          <!-- Named by the product it belongs to: one file can be recognized
               by several, and three identical summaries would say which is
               which only by their order. -->
          <summary>How {{ SUPPORTED_TOOL_TEXT[recognition.tool] }} recognized this</summary>
          <RecognitionDetails :recognition="recognition" />
        </details>
      </div>

      <!-- The tree is as long as the skill's directory happens to be, and it
           stands between the reader and the file they came to read. A screen
           reader can jump the `nav` landmark; a keyboard user has nothing
           unless the page offers it, so this link is that mechanism
           (WCAG 2.4.1). It is placed after the recognition summary and before
           the tree, which is exactly what it skips. -->
      <p class="aci-skip-link"><a href="#aci-file-contents">Skip to file contents</a></p>

      <div class="aci-skill-detail-layout">
        <SkillFileTree
          :files="treeFiles"
          :selected-file-id="openFileId"
          :directory="treeDirectory"
        />

        <!-- One element for all three states, so the skip target above survives
             the swap between them: a target that unmounted when loading became
             ready would drop the focus it had just received to the document body
             (WCAG 2.4.3). It is also what the focus guard watches, because the
             content inside it is what unmounts while it stays. -->
        <div id="aci-file-contents" ref="paneElement" tabindex="-1" class="aci-skill-detail-main">
          <!-- Only the pane failed: the recognition and the tree above still
               describe the skill, and the reader keeps them while retrying the
               one file that did not load. -->
          <template v-if="detailState === 'companion-failed'">
            <p class="aci-error">This file could not be loaded.</p>
            <p>
              <button type="button" @click="retryOpen">Try again</button>
            </p>
          </template>
          <!-- A switch to another file of this skill is still in flight: the
               tree and the URL already name the new file, so the pane shows
               nothing rather than the previous file's source under the new
               selection. -->
          <p v-else-if="openFile === null" class="aci-note">Loading this file…</p>
          <template v-else>
            <h3 class="aci-path aci-authored-text">{{ openFilePathText }}</h3>

            <!-- What the read produced, and nothing else. The file below is the
               file; a viewer that narrated what a file might contain, or where
               its own page keeps it, would be telling the reader about their
               own repository on their own machine. -->
            <p class="aci-note">
              {{ FILE_ENCODING_TEXT[openFile.encoding]
              }}<template v-if="openFile.encoding !== 'unknown'">
                · {{ openFile.sizeBytes }} bytes</template
              ><template
                v-if="
                  (openFile.encoding === 'utf-8' || openFile.encoding === 'utf-8-replaced') &&
                  openFile.hadLeadingBom
                "
              >
                · byte-order mark removed before decoding</template
              >
            </p>

            <ul v-if="openFileDiagnostics.length > 0" class="aci-list" role="list">
              <li
                v-for="diagnostic in openFileDiagnostics"
                :key="diagnostic.diagnosticId"
                :class="
                  DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error'
                    ? 'aci-error'
                    : 'aci-note'
                "
              >
                {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
              </li>
            </ul>

            <!-- Only the readable variants carry text. An unreadable file has no
               source to show and its diagnostic above says why; a binary one —
               a skill's own asset — has none either, and the encoding line
               above is the whole story. -->
            <SourceViewer
              v-if="openFile.encoding === 'utf-8' || openFile.encoding === 'utf-8-replaced'"
              :source-text="openFile.sourceText"
              :source-relative-path="openFile.sourceRelativePath"
            />
            <p v-else class="aci-note">This file has no source text to show.</p>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
