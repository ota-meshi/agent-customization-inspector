<script setup lang="ts">
// The skill detail route (T102): what one skill is, and the files it is made of.
//
// The skill is the subject, not the file. A reader arriving here asked about a
// customization, so the page opens with what was recognized — the declared
// name, the product that recognizes it, every key its frontmatter declares,
// and the instructions that frontmatter block was removed from — and the
// directory's files come after, as the detail of that. A page that opened on
// a file made the reader assemble the skill from its parts.
//
// The skill and its files are two tabs, not one column. Stacked, the directory
// sat below everything the skill declares and instructs, and the reader had to
// scroll past the whole of one subject to reach the other. Within the skill's
// own tab the order is the one a reader asks in: the declared name, then the
// rest of what the frontmatter declares, then the instructions that block was
// removed from.
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
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from 'vue';
import { useRoute } from 'vue-router';
import { NuxtLink } from '#components';
import RecognitionSummary from '../../components/inspection/RecognitionSummary.vue';
import SkillFileTree from '../../components/inspection/SkillFileTree.vue';
import SourceViewer from '../../components/inspection/SourceViewer.vue';
import FrontmatterBlock from '../../components/inspection/FrontmatterBlock.vue';
import { nextTabForKey } from '../../components/tab-navigation';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import {
  FILE_ENCODING_TEXT,
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
/** This route's own failed request, which this page reports and announces. */
const skillError = sessionViewState.skillErrorMessage;
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
  const pairs = (snapshot.value?.skills ?? []).flatMap((entry) =>
    entry.definitions.map((definition) => ({ entry, definition })),
  );
  // A file that is a skill's own entry point wins over every census that
  // happens to list it, and the two are not exclusive: a skill nested inside
  // another skill's directory is in that outer skill's census, so its
  // `SKILL.md` is both an entry point and a companion.
  const entryPoint = pairs.find(({ definition }) => definition.fileId === openFileId.value);
  if (entryPoint !== undefined) {
    return entryPoint;
  }
  // A companion can be listed by more than one census for the same reason —
  // everything under the inner skill is also under the outer one — so the
  // innermost skill containing the file wins. Answering with whichever census
  // the inventory happened to sort first would open the outer skill from the
  // inner skill's own tree, with no way back to the file the reader clicked.
  return (
    pairs
      .filter(({ definition }) => definition.companionFiles.includes(path))
      .reduce<(typeof pairs)[number] | null>(
        (deepest, candidate) =>
          deepest === null || directoryOf(candidate).length > directoryOf(deepest).length
            ? candidate
            : deepest,
        null,
      ) ?? null
  );
});

/**
 * The directory a definition's entry point sits in. Its length orders two
 * skills that both list a file: the longer path is the one nested inside the
 * other, and it is the skill the file actually belongs to.
 */
function directoryOf(pair: { readonly definition: { readonly fileId: string } }): string {
  const path =
    (snapshot.value?.files ?? []).find((file) => file.fileId === pair.definition.fileId)
      ?.sourceRelativePath ?? '';
  return path.slice(0, path.lastIndexOf('/') + 1);
}

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
 * What the page is titled: the declared name exactly as authored, or nothing.
 *
 * Nothing rather than the directory's own name. A skill that declares no name
 * has none, and a path segment put where a name goes reads as one the file
 * wrote (FR-007, T1066). The template titles the page by its kind instead, and
 * the path is on the line below either way.
 *
 * The renderability test below is only that: the displayed value is never
 * trimmed, because a shown declared value is the value the parser resolved
 * (FR-025). A whitespace-only or empty name stays readable as itself among the
 * declarations.
 */
const headingName = computed(() => {
  const declared = owner.value?.entry.declaredName;
  return declared !== undefined && declared !== null && !rendersNothingVisible(declared)
    ? declared
    : '';
});

/**
 * The skill's own presentation, taken from any one of its recognitions: they
 * all recognized the same `SKILL.md`, so they read the same declarations and
 * the same body, and the first is as good as the last. Null when extraction
 * failed for every recognition, which is when there is nothing parsed to show
 * and the summary above says so (FR-028).
 */
const skillPresentation = computed(() => {
  for (const recognition of skillDetail.value?.recognitions ?? []) {
    if (recognition.details.kind === 'skill' && recognition.parseStatus === 'parsed') {
      return recognition.details;
    }
  }
  return null;
});

/**
 * The keys the frontmatter declares, led by the two a reader needs first.
 *
 * `name` and `description` come first however the file ordered them: which
 * skill this is and what it is for are the two questions a detail surface
 * answers before any other, and a reader should not have to find them among
 * the keys a particular file happened to write earlier. Everything else keeps
 * the file's own order, because past those two the file's order is the only
 * one this product has any basis for.
 */
const LEADING_DECLARATIONS: readonly string[] = ['name', 'description'];

const orderedDeclarations = computed(() => {
  const rank = (key: string): number => {
    const index = LEADING_DECLARATIONS.indexOf(key);
    return index === -1 ? LEADING_DECLARATIONS.length : index;
  };
  // `toSorted` is stable, so the keys past the two leaders keep authored order.
  return (skillPresentation.value?.frontmatter ?? []).toSorted(
    (left, right) => rank(left.key) - rank(right.key),
  );
});

/**
 * The two halves of a skill detail, as the tab strip presents them: the skill
 * itself, and the files its directory ships.
 *
 * They are tabs rather than one column because they are two subjects, not one
 * long one. Stacked, the directory sat below everything the skill declares and
 * instructs, so reaching a file meant scrolling past content the reader had
 * already read; and the file being read sat below that again.
 */
const SKILL_DETAIL_TABS = ['skill', 'files'] as const;

/** Which half of the skill is in view; see {@link SKILL_DETAIL_TABS}. */
type SkillDetailTab = (typeof SKILL_DETAIL_TABS)[number];

/** The label each tab shows. */
const SKILL_DETAIL_TAB_TEXT: Readonly<Record<SkillDetailTab, string>> = {
  /** Label for the panel holding the skill's frontmatter and instructions. */
  skill: 'Skill',
  /** Label for the panel holding the skill's directory and the open file. */
  files: 'Files',
};

const activeTab = ref<SkillDetailTab>('skill');
/** The tab buttons, so a switch this page decides can carry focus with it. */
const tabButtons = ref<HTMLButtonElement[]>([]);

/**
 * Selects a tab on the reader's behalf, keeping focus reachable.
 *
 * Both panels stay in the document and the unselected one is hidden, so a
 * switch the reader did not click can hide the subtree their focus is in — a
 * history step to another of this skill's files while they were reading the
 * instructions. Focus would then be on a hidden element, and the next Tab would
 * restart from the top of the document. Moving it to the tab that now owns the
 * panel keeps the reader where the content they navigated to is.
 */
function selectTab(tab: SkillDetailTab): void {
  if (activeTab.value === tab) {
    return;
  }
  const hidden = pageRoot.value?.querySelector(`#${skillTabPanelId(activeTab.value)}`);
  const focusWasInside = hidden?.contains(document.activeElement) === true;
  activeTab.value = tab;
  if (focusWasInside) {
    void nextTick(() => tabButtons.value[SKILL_DETAIL_TABS.indexOf(tab)]?.focus());
  }
}

/** The `id` of the panel a tab controls (WCAG 4.1.2). */
function skillTabPanelId(tab: SkillDetailTab): string {
  return `aci-skill-panel-${tab}`;
}

/** The `id` of the tab that controls {@link skillTabPanelId}'s panel. */
function skillTabId(tab: SkillDetailTab): string {
  return `aci-skill-tab-${tab}`;
}

/**
 * Arrow keys move the selection, matching the WAI-ARIA tabs pattern. Selection
 * follows focus because switching panels issues no request and loses no work:
 * both halves are already in hand, so the extra Enter that manual activation
 * asks for would be friction with nothing behind it.
 */
function onTabKeydown(event: KeyboardEvent, index: number): void {
  const next = nextTabForKey(event.key, SKILL_DETAIL_TABS, index);
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior; swallowing
    // it here would break Tab out of the strip.
    return;
  }
  event.preventDefault();
  activeTab.value = next;
  document.getElementById(skillTabId(next))?.focus();
}

/**
 * Opening a skill starts on the skill itself, unless the URL named one of its
 * other files — a link a reader kept to `scripts/run.sh` is a request for that
 * file, and landing them on the declarations would answer a question they did
 * not ask.
 *
 * Keyed on the skill rather than on the open file: selecting a file inside the
 * files panel must not send the reader back to the other tab, and it changes
 * the open file on every click.
 */
watch(
  [
    () => owner.value?.definition.fileId,
    () => openFileId.value,
    () => skillPresentation.value !== null,
  ],
  ([entryFileId, openId, hasPresentation], previous) => {
    // A companion is shown in the files panel, so that is where the reader has
    // to be to see it — however they arrived. Keying only on the skill left a
    // history step to another of its files changing the URL and the tree's
    // marking while the panel holding that file stayed hidden. Selecting one
    // inside the panel is already there, so this moves nobody who clicked.
    //
    // A failed extraction is the same answer for a different reason: the skill
    // panel has nothing in it — no declarations and no instructions — while the
    // complete source is one tab away, and opening on an empty panel would read
    // as a file with nothing in it (FR-028).
    if (!hasPresentation || (entryFileId !== undefined && entryFileId !== openId)) {
      selectTab('files');
      return;
    }
    // The entry point is open. Lead with the skill when the skill itself
    // changed, and when its declarations have just arrived — the first render
    // has no presentation yet, so the branch above sends the page to the files
    // and this is what brings it back once there is a skill to show. Any other
    // change leaves the tab alone: choosing `SKILL.md` from the file list is a
    // file selection, and answering it by leaving the list would undo the
    // reader's own click.
    const skillChanged = previous === undefined || previous[0] !== entryFileId;
    const declarationsArrived = previous !== undefined && !previous[2] && hasPresentation;
    if (skillChanged || declarationsArrived) {
      selectTab('skill');
    }
  },
  { immediate: true },
);

/** The declarations as one block, so the recursive renderer draws them all. */
const declarationBlock = computed(
  () => ({ kind: 'mapping', entries: orderedDeclarations.value }) as const,
);

/**
 * The entry point's own Source-relative Path. The instructions viewer takes it
 * so the body is highlighted as what the file is — the language comes from the
 * path, and the body is that file with its frontmatter block removed.
 */
const entryPath = computed(() => treeFiles.value[0]?.sourceRelativePath ?? '');

/**
 * Whether the file left no instructions at all. Only an empty string counts: a
 * body of whitespace is what the file wrote after its frontmatter, and calling
 * it none would report a shortened value as the whole (FR-025). The viewer
 * shows it, and its own whitespace rendering is what makes it visible.
 */
const skillBodyIsEmpty = computed(() => (skillPresentation.value?.bodyText ?? '') === '');

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
 * What this route says when its own request failed, or null when none has: the
 * failing state's statement, then the failure's own message.
 *
 * One value, read by both the visible paragraph and the live region, so what a
 * reader hears is the sentence that is on the screen. Two expressions building
 * it separately could differ by one edit.
 */
const detailFailure = computed<string | null>(() => {
  const statement =
    detailState.value === 'companion-failed'
      ? 'This file could not be loaded.'
      : skillDetail.value === null && detailState.value === 'idle' && skillError.value !== null
        ? 'This skill could not be loaded.'
        : null;
  if (statement === null) {
    return null;
  }
  return skillError.value === null ? statement : `${statement} ${skillError.value}`;
});

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus, so a reader who cannot see the swap
 * needs them said (WCAG 4.1.3, contracts/accessibility-acceptance.md
 * § 4.1.3): the stale state, a file selection loading while focus stays in
 * the tree, a companion that failed to load, and an entry that failed to load.
 * Each phrase matches the visible copy. Ready content is read as focus moves
 * through it, so it is not repeated here.
 *
 * A detail request's failure is announced here because this route owns it: the
 * shell reports what happened to the session, and neither surface repeats the
 * other.
 */
const detailAnnouncement = computed(() => {
  if (detailState.value === 'stale' || owner.value === null) {
    return 'This link does not name a file in the current scan.';
  }
  if (detailFailure.value !== null) {
    return detailFailure.value;
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

/**
 * What the document title says this page is showing (WCAG 2.4.2,
 * contracts/accessibility-acceptance.md § 2.4.2). The shell assembles the
 * title and this page owns knowing its subject.
 *
 * A page that is showing a skill reports the heading's name — the same words a
 * sighted reader sees at the top. A page that is not reports the state it is
 * in instead, because the title has to be state-appropriate: a reader
 * returning to a tab titled after a skill would find a page saying the link no
 * longer resolves. Null falls back to the route's surface name, which is what
 * a skill declaring no name gets — there the page really is showing a skill.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return 'Loading a skill';
  }
  if (detailState.value === 'stale' || owner.value === null) {
    return 'Link not in this scan';
  }
  // Only a whole-skill failure retitles the tab. A companion that failed to
  // load leaves the skill on screen — its name is still what this page is
  // showing, and a title saying the skill could not be loaded would describe a
  // page that is showing one.
  if (detailFailure.value !== null && detailState.value !== 'companion-failed') {
    return 'Skill could not be loaded';
  }
  return headingName.value === '' ? null : headingName.value;
});
watchEffect(() => {
  sessionViewState.pageSubject.value = titleSubject.value;
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
// And again when the route moves to a different skill, which mounts no new
// page. After the flush, not before it: focus moves the reader to the heading
// so it is announced, and the patch that puts the new skill's name there has
// not run yet — focusing first announces the skill they just left.
watch(
  () => owner.value?.definition.fileId,
  () => void nextTick(focusHeading),
);

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
      <!-- The declared name is the skill's presentation identity — it is what
           the product's own listings show. A file that declares none, or declares one of
           nothing but whitespace, leaves the heading with nothing to render, so
           the page is titled by its kind rather than by a path segment standing
           where a name goes (FR-007, T1066); the authored value itself stays
           readable in the declared-values list below. The span hugs its binding
           because it renders authored whitespace. -->
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
         held. This route reports it, because this route made the request — the
         shell reports what happened to the session, so neither hides or repeats
         the other. The real message is shown rather than a phrase standing in
         for it, and the retry beside it is the way back without re-finding the
         link. -->
    <template v-else-if="skillDetail === null">
      <p class="aci-error">{{ detailFailure }}</p>
      <p>
        <button type="button" @click="retryOpen">Try again</button>
      </p>
    </template>

    <template v-else-if="skillDetail">
      <div class="aci-skill-detail__overview">
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
      </div>

      <!-- Two subjects, two tabs: the skill itself, and the files its
           directory ships. A real `tablist` rather than a pair of buttons,
           because assistive technology has to announce "tab 1 of 2, selected"
           for the strip to be usable at all (QR-004,
           contracts/accessibility-acceptance.md) — which obliges the roving
           tabindex and arrow keys the WAI-ARIA tabs pattern specifies. -->
      <div class="aci-kind-tabs" role="tablist" aria-label="Skill detail">
        <button
          v-for="(tab, index) in SKILL_DETAIL_TABS"
          :id="skillTabId(tab)"
          :key="tab"
          ref="tabButtons"
          class="aci-kind-tab"
          type="button"
          role="tab"
          :aria-controls="skillTabPanelId(tab)"
          :aria-selected="tab === activeTab"
          :tabindex="tab === activeTab ? 0 : -1"
          @click="activeTab = tab"
          @keydown="onTabKeydown($event, index)"
        >
          {{ SKILL_DETAIL_TAB_TEXT[tab] }}
          <span v-if="tab === 'files'" class="aci-kind-count">{{ treeFiles.length }}</span>
        </button>
      </div>

      <!-- Both panels stay in the document and the unselected one is hidden,
           so Monaco keeps its model and the reader's scroll position across a
           tab switch. Every tab therefore names its panel: both IDREFs resolve,
           and omitting one would drop a relationship assistive technology
           uses to move from a tab to what it controls. -->
      <div
        v-show="activeTab === 'skill'"
        :id="skillTabPanelId('skill')"
        role="tabpanel"
        :aria-labelledby="skillTabId('skill')"
        tabindex="0"
      >
        <!-- The skill itself: what it declares and what it tells the product to
           do. The `SKILL.md` carries both, and showing only its bytes would
           leave the reader to find the seam — so the two are shown apart,
           exactly as the parser separated them. The complete file is one tab
           away, which is where its authored spelling stays readable. -->
        <div v-if="skillPresentation" class="aci-skill-detail__declarations">
          <h3>Frontmatter</h3>
          <p v-if="orderedDeclarations.length === 0" class="aci-note">This skill declares none.</p>
          <FrontmatterBlock v-else :value="declarationBlock" />
        </div>

        <div v-if="skillPresentation" class="aci-skill-detail__instructions">
          <h3>Instructions</h3>
          <p v-if="skillBodyIsEmpty" class="aci-note">This skill has none.</p>
          <!-- The same read-only viewer the files tab uses, given the entry
               point's own path so the body is highlighted as the Markdown it
               is. Highlighting is tokenizing, not rendering: no heading
               becomes large, no link becomes clickable, and no image loads
               (FR-033). -->
          <SourceViewer
            v-else
            :source-text="skillPresentation.bodyText"
            :source-relative-path="entryPath"
            content-label="Instructions of"
          />
        </div>
      </div>

      <div
        v-show="activeTab === 'files'"
        :id="skillTabPanelId('files')"
        role="tabpanel"
        :aria-labelledby="skillTabId('files')"
        tabindex="0"
      >
        <!-- The tree is as long as the skill's directory happens to be, and it
           stands between the reader and the file they came to read. A screen
           reader can jump the `nav` landmark; a keyboard user has nothing
           unless the page offers it, so this link is that mechanism
           (WCAG 2.4.1). -->
        <p class="aci-skill-detail__skip-link">
          <a href="#aci-skill-detail-file-contents">Skip to file contents</a>
        </p>

        <div class="aci-skill-detail__layout">
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
          <div
            id="aci-skill-detail-file-contents"
            ref="paneElement"
            tabindex="-1"
            class="aci-skill-detail__main"
          >
            <!-- Only the pane failed: the recognition and the tree above still
               describe the skill, and the reader keeps them while retrying the
               one file that did not load. -->
            <template v-if="detailState === 'companion-failed'">
              <p class="aci-error">{{ detailFailure }}</p>
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
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The detail route's bypass mechanism (WCAG 2.4.1): out of the way until it is
   focused, then a normal visible link. Not `display: none`, which would take it
   out of the tab order and leave nothing to bypass with. */
.aci-skill-detail__skip-link {
  margin: 0;
}

.aci-skill-detail__skip-link a {
  block-size: 1px;
  clip-path: inset(50%);
  inline-size: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
}

.aci-skill-detail__skip-link a:focus-visible {
  block-size: auto;
  clip-path: none;
  inline-size: auto;
  overflow: visible;
  position: static;
}

/* The skill detail reads top to bottom: what the skill is, what it declares,
   what it instructs, then the files it ships. It scrolls as a page rather than
   fitting the viewport — fitting was tried, and the skill's own sections left
   the directory they introduce a few pixels or none at all. */
.aci-skill-detail {
  display: flex;
  flex-direction: column;
}

/* The heading block is chrome, and every line of it is a line the files do not
   get, so it is tighter here than the shell's default heading spacing. */
.aci-skill-detail > p:first-child {
  margin: 0;
}

/* Kept short on purpose: it is what a reader needs before choosing a file, and
   every line of it is a line the files do not get. */
.aci-skill-detail__overview {
  border-bottom: 1px solid var(--aci-border);
  padding-bottom: 0.5rem;
}

.aci-skill-detail__overview > * {
  margin-block: 0.15rem;
}

/* The two halves of the entry point, inside the tab that holds the skill
   itself. */
.aci-skill-detail__declarations,
.aci-skill-detail__instructions {
  padding-block-start: 0.75rem;
}

.aci-skill-detail__declarations > h3,
.aci-skill-detail__instructions > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* The skill's directory beside its open file. It collapses to one column on a
   narrow viewport, where the tree reads as a list above the content rather than
   as a squeezed sidebar. A detail screen for a kind with no directory has no
   use for this shape, so the class is scoped to the one that does.

   It takes its natural height rather than the viewport's remainder. The route
   above it is the skill itself — name, description, declarations, instructions
   — and fitting all of that plus the directory into one non-scrolling column
   left the tree a few pixels or pushed it off the screen entirely. The page
   scrolls instead, and each region keeps a height it is usable at
   (WCAG 1.4.4, 1.4.10). */
.aci-skill-detail__layout {
  display: grid;
  gap: 0.75rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  padding-block-start: 0.75rem;
}

@media (min-width: 52rem) {
  .aci-skill-detail__layout {
    grid-template-columns: minmax(9rem, 14rem) minmax(0, 1fr);
  }
}

.aci-skill-detail__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.aci-skill-detail__main > h3 {
  border: 0;
  font-size: 1rem;
  margin: 0;
  padding: 0;
}

/* Tighter than the shell's section-heading baseline, because the heading block
   is chrome and every line of it is a line the files do not get. The authored
   name it carries has no break opportunities of its own; without the wrap a
   long one forces the page to scroll sideways at narrow widths and 200% zoom
   (WCAG 1.4.10). */
.aci-skill-detail h2 {
  margin: 0.25rem 0 0.5rem;
  overflow-wrap: anywhere;
}
</style>
