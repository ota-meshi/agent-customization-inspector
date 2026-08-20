<script setup lang="ts">
// The skill detail route (T102): what one skill is, and the files it is made of.
//
// The skill is the subject, not the file. A reader arriving here asked about a
// customization, so the page opens with what was recognized — the row's
// resolved name, the product whose definition the route addresses, every key
// its frontmatter declares, and the instructions that frontmatter block was
// removed from — and the directory's files come after, as the detail of that. A page that opened on
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
// The URL names a definition — `/skills/<tool>/<source-relative path>` —
// because that is the unit a link from the inventory addresses: the path is
// the file's identity (FR-030), and the tool says which recognition of it the
// page is about, so no preference has to pick one when a file sits on two
// rows. The pair is stable across rescans and server launches — the host
// resolves a detail request against whatever generation is current — so a
// bookmarked link's path keeps naming the same file wherever a launch selects
// the same root, the origin half being devframe's port selection
// (data-model.md § Skill presentation), and a path the current scan does not
// hold is reported rather than guessed at. Companions open under the same
// tool segment.
//
// This surface — like the skill comparison at `/skills/compare` — shows file
// contents exactly as authored — credentials included, with nothing masked
// and no control that would uncover a masked value. It says none of that: the
// files are the reader's own, over a loopback-bound session, so a viewer that
// announced what a file might contain would be narrating the reader's
// repository back at them, and a confirmation step in front of it would guard
// nothing while making every file take two interactions to read (FR-027).
//
// Three things cause the open skill to be dropped, and all three are the same
// cleanup. Leaving the route disposes it. A client-data purge clears it. And a
// commit purges the previous generation's client data — but not the URL: the
// path names the same file in the new generation, and the page refetches it,
// so the link survives the rescan, and only a path the new generation does
// not hold is reported as dead.
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
import SkillFileTree from '../../../components/inspection/SkillFileTree.vue';
import SourceViewer from '../../../components/inspection/SourceViewer.vue';
import DeclarationBlock from '../../../components/inspection/DeclarationBlock.vue';
import { nextTabForKey } from '../../../components/tab-navigation';
import { skillComparisonRouteFor } from '../../../composables/skill-comparison';
import { usePageOwnership } from '../../../composables/page-ownership';
import { SESSION_VIEW_STATE } from '../../../session/view-state';
import type { SkillDefinitionDto, SkillInventoryEntryDto } from '../../../../shared/api-types';
import { DIAGNOSTIC_REGISTRY } from '../../../../shared/diagnostics';
import {
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  isReadableFile,
  rendersNothingVisible,
} from '../../../../shared/entities';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats rendering a detail page with no
  // session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const route = useRoute();
/**
 * The tool segment from the URL: which recognition of the file the page is
 * about (`/skills/<tool>/<source-relative path>`). Matched against the
 * committed inventory — a spelling the generation's definitions do not use
 * resolves to no owner, which the template reports as a dead link. A router
 * hands a repeated parameter over as an array; this route's does not repeat,
 * so the array form folds to its first value rather than being a case.
 */
const openTool = computed((): string => {
  const parameter = route.params['tool'];
  return typeof parameter === 'string' ? parameter : (parameter?.[0] ?? '');
});

/**
 * The Source-relative path from the URL's catch-all segments — the stable
 * half of the definition identity a reader bookmarks. The router hands the
 * segments over individually and decoded, so joining them with `/` restores
 * the published spelling exactly.
 */
const openPath = computed((): string => {
  const parameter = route.params['path'];
  return typeof parameter === 'string' ? parameter : (parameter?.join('/') ?? '');
});

/**
 * The committed files' paths, as one membership index: the path is the
 * file's identity (FR-030), so `has` is the whole resolution — for the URL's
 * own path in {@link owner}, whose miss the template reports as a dead link,
 * and for each census entry in {@link treeFiles}.
 */
const committedPaths = computed(
  () => new Set((snapshot.value?.files ?? []).map((file) => file.sourceRelativePath)),
);

/**
 * The committed readable files — the comparison-eligible subset (FR-025)
 * behind {@link comparePairRoute}: only a file with readable source text can
 * be a comparison input.
 */
const comparablePaths = computed(
  () =>
    new Set(
      (snapshot.value?.files ?? []).filter(isReadableFile).map((file) => file.sourceRelativePath),
    ),
);

/**
 * The comparison this page links to — the owning name's first two readable
 * entry-point files — or null when the name has fewer than two, where there
 * is nothing to pair. A comparison is a pair within one skill name — the
 * URL itself names two of the name's copies (FR-011) — and this page
 * already knows the name: the same link the inventory row offers,
 * so a reader deep in a skill's files never has to go back to the list to
 * start comparing. The compare route's own file switchers take over from
 * there, census companions included.
 */
const comparePairRoute = computed(() => {
  const entry = owner.value?.entry;
  if (entry === undefined) {
    return null;
  }
  const paths: string[] = [];
  for (const definition of entry.definitions) {
    const path = definition.sourceRelativePath;
    if (comparablePaths.value.has(path) && !paths.includes(path)) {
      paths.push(path);
    }
  }
  const [first, second] = paths;
  return first !== undefined && second !== undefined
    ? skillComparisonRouteFor(first, second)
    : null;
});

const entryDetail = sessionViewState.entryDetail;
const openCompanion = sessionViewState.openCompanion;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
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
  const path = openPath.value;
  if (!committedPaths.value.has(path)) {
    return null;
  }
  // One walk over the inventory, keeping only this route's tool's
  // definitions: the URL addresses a definition —
  // `/skills/<tool>/<source-relative path>` — so which recognition of a file
  // the page is about is the link's own identity rather than a preference
  // this page applies.
  //
  // A file that is a skill's own entry point wins over every census that
  // happens to list it, and the two are not exclusive: a skill nested inside
  // another skill's directory is in that outer skill's census, so its
  // `SKILL.md` is both an entry point and a companion. Among censuses, the
  // innermost skill containing the file wins — everything under the inner
  // skill is also under the outer one, and answering with whichever census
  // the inventory happened to sort first would open the outer skill from the
  // inner skill's own tree, with no way back to the file the reader clicked.
  let deepest: { entry: SkillInventoryEntryDto; definition: SkillDefinitionDto } | null = null;
  for (const entry of snapshot.value?.skills ?? []) {
    for (const definition of entry.definitions) {
      if (definition.tool !== openTool.value) {
        continue;
      }
      if (definition.sourceRelativePath === path) {
        return { entry, definition };
      }
      if (
        definition.companionFiles.includes(path) &&
        (deepest === null ||
          directoryOf(definition.sourceRelativePath).length >
            directoryOf(deepest.definition.sourceRelativePath).length)
      ) {
        deepest = { entry, definition };
      }
    }
  }
  return deepest;
});

/**
 * The directory a path sits in, trailing slash kept. Its length orders two
 * skills that both list a file: the longer path is the one nested inside the
 * other, and it is the skill the file actually belongs to.
 */
function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

/**
 * The Source-relative Path of every file of that skill: the entry point
 * first, then its census in the order the census published.
 *
 * A path with no committed file is dropped rather than shown as an entry that
 * cannot be opened. It is not a case the current generation can produce — the
 * scan reads and publishes what the census listed — but silently offering a
 * dead link would be worse than showing one fewer file.
 */
const treeFiles = computed(() => {
  const definition = owner.value?.definition;
  if (definition === undefined) {
    return [];
  }
  return [definition.sourceRelativePath, ...definition.companionFiles].filter((path) =>
    committedPaths.value.has(path),
  );
});

/** The directory the tree is rooted at, so a row shows a name rather than a path. */
const treeDirectory = computed(() => directoryOf(treeFiles.value[0] ?? ''));

/**
 * What the page is titled: the owning row's name — this product's provisional
 * identity, the same one the inventory lists, so the page and the list agree
 * (FR-007, data-model.md § Skill presentation). The addressed definition's
 * documented invocation name sits beside it. Nothing only when the name has
 * no character that draws;
 * the template titles the page by its kind then, and the path is on the line
 * below either way.
 *
 * Rendered with the same control-character escaping as a path, because a
 * nested prefix and a fallback name are path segments (data-model.md
 * § Inventory unit). The renderability test below is only that: the value is
 * never trimmed, and a whitespace-only name stays readable as itself among
 * the declarations (FR-025).
 */
/** The owning row's own name, raw — one lookup the three presentations below share. */
const rowName = computed(() => owner.value?.entry.name ?? '');

const inventoryName = computed(() => escapeControlCharacters(rowName.value));

/**
 * Whether the row's name draws nothing as authored — whitespace, or
 * default-ignorable code points. The heading then renders the escaped
 * spelling with the same note the inventory row shows, so the page and the
 * list stay the same row name (FR-007); for a name of plain whitespace the
 * escaped spelling still draws nothing, which is exactly what the note is
 * for.
 */
const inventoryNameInvisible = computed(
  () => rowName.value !== '' && rendersNothingVisible(rowName.value),
);

/**
 * The skill's documented invocation name, from the definition this route
 * addresses: the URL's tool segment decided which recognition the page is
 * about, so the value is that definition's published one (data-model.md
 * § Skill presentation). Empty when the definition publishes none — a failed
 * extraction leaves an authored-name tool's invocation unknown (FR-028) —
 * and the line below renders only when there is one. Escaped like every
 * name.
 */
const invocationName = computed(() =>
  escapeControlCharacters(owner.value?.definition.invocationName ?? ''),
);

/**
 * Whether the published invocation name draws nothing as authored —
 * whitespace, or default-ignorable code points — so the line can say so
 * instead of showing an apparently empty value, the same note the inventory
 * row gives the row name (FR-025).
 */
const invocationNameInvisible = computed(() => {
  const published = owner.value?.definition.invocationName ?? '';
  return published !== '' && rendersNothingVisible(published);
});

/**
 * The skill's own presentation — the one scan-time parse, published once on
 * the skill variant of the detail (SkillFileDetailDto). Null when extraction
 * failed all-or-nothing, which is when there is nothing parsed to show and
 * the failure's diagnostic says so (FR-028).
 */
const skillPresentation = computed(() => {
  const detail = entryDetail.value;
  return detail !== null && detail.kind === 'skill' ? detail.presentation : null;
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
 * The page's root, for the stale guard and {@link selectTab}. Declared before
 * the tab-selection watch below: that watch is immediate, so it calls
 * `selectTab` synchronously during setup, and a `const` declared after it
 * would still be in its temporal dead zone there.
 */
const pageRoot = ref<HTMLElement | null>(null);

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
 * Keyed on the open file as well as the skill, because a history step to
 * another of the skill's files changes the URL and the tree's marking and the
 * panel holding that file has to come with them. What a file change must not
 * do is pull the reader out of the list they are using, so the branches below
 * decide per case instead of resetting the strip on every change.
 *
 * Decided once per (skill, open file), not once per arrival. A commit drops
 * the open detail and the route re-requests the same path under the new
 * generation (FR-030), so a rescan while the reader is reading takes the
 * detail away and brings the same one back. Deciding again on that round trip
 * would send a reader who had opened the files list back to the declarations
 * — twice, since the empty moment in between reads as a skill with nothing in
 * it. What the current selection belongs to is remembered below — the skill,
 * the open file, and whether the declarations are in hand, because their
 * arrival is its own decision — so anything else decides on its own arrival,
 * and leaving the route drops the memory with the component.
 */
const tabDecidedFor = ref<string | null>(null);
watch(
  [
    () => owner.value?.definition.sourceRelativePath,
    () => openPath.value,
    () => skillPresentation.value !== null,
  ],
  ([entryPathValue, openPathValue, hasPresentation], previous) => {
    if (entryPathValue === undefined) {
      // Nothing is in hand: the first render before the detail arrives, and
      // the gap a rescan opens. There is no tab to decide between yet, and the
      // strip keeps whatever the reader last chose until there is.
      return;
    }
    const decidingFor = `${entryPathValue}\u0000${openPathValue}\u0000${hasPresentation}`;
    if (tabDecidedFor.value === decidingFor) {
      return;
    }
    tabDecidedFor.value = decidingFor;
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
    if (!hasPresentation || entryPathValue !== openPathValue) {
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
    const skillChanged = previous === undefined || previous[0] !== entryPathValue;
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
const entryPath = computed(() => treeFiles.value[0] ?? '');

/**
 * Whether the file left no instructions at all. Only an empty string counts: a
 * body of whitespace is what the file wrote after its frontmatter, and calling
 * it none would report a shortened value as the whole (FR-025). The viewer
 * shows it, and its own whitespace rendering is what makes it visible.
 */
const skillBodyIsEmpty = computed(() => (skillPresentation.value?.bodyText ?? '') === '');

const openFile = computed(() => {
  const file = openCompanion.value?.file ?? entryDetail.value?.file ?? null;
  return file !== null && file.sourceRelativePath === openPath.value ? file : null;
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
 * The diagnostics of the file on screen. The detail response states each
 * record once — a failed extraction is one (file, kind) record (FR-028) — so
 * the list renders as published.
 */
const openFileDiagnostics = computed(() => {
  const detail = openCompanion.value ?? entryDetail.value;
  return detail?.diagnostics ?? [];
});

/**
 * The entry point's diagnostics when its extraction failed — what the Skill
 * tab shows in place of the presentation it has none of, so the reason stays
 * visible while a companion owns the files pane (FR-028). Empty whenever a
 * presentation exists: the parsed panel needs no failure story.
 */
const entryDiagnostics = computed(() => {
  const detail = entryDetail.value;
  return detail !== null && detail.kind === 'skill' && detail.presentation === null
    ? detail.diagnostics
    : [];
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
  // The idle branch needs no error to speak: an idle page holding nothing is
  // this route's recoverable failure state however it was reached — a failed
  // entry request carries its message in `detailError`, while a
  // newer-generation refresh that could not adopt leaves the message to the
  // shell (`SessionViewState.openFileDetail`) and this statement stands alone.
  const statement =
    detailState.value === 'companion-failed'
      ? 'This file could not be loaded.'
      : entryDetail.value === null && detailState.value === 'idle'
        ? 'This skill could not be loaded.'
        : null;
  if (statement === null) {
    return null;
  }
  return detailError.value === null ? statement : `${statement} ${detailError.value}`;
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
    return 'Nothing in the current scan sits at this link\u2019s path for this tool.';
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

/** Set as the route is left, so the focus guard yields to the next route. */
let leaving = false;

/**
 * Requests the skill and file the URL currently names. The route watcher below
 * calls it on every selection, and the failed-load branch calls it again as
 * the retry — same inputs, same path.
 */
const pageOwnership = usePageOwnership();

const requestOpen = (): void => {
  const resolved = owner.value;
  if (resolved === null) {
    return;
  }
  void pageOwnership.openFileDetail(resolved.definition.sourceRelativePath, openPath.value);
};

// One effect owns "which skill and file should be open", so entering the route
// and moving between a skill's files take the same path. The owner is watched
// by its definition's path rather than by the computed's object identity:
// every snapshot adoption rebuilds the object, and an identity watch would
// re-request — and supersede — a detail already in flight for the same
// selection on every refresh.
watch(
  [
    openPath,
    (): string | null => owner.value?.definition.sourceRelativePath ?? null,
    // The committed generations are part of what "which detail should be
    // open" means: adopting a newer one closes the open detail
    // (`SessionViewState.#refreshOnce`) while both paths above can stay
    // identical — the path is the file's identity across commits — so their
    // change is what re-requests the same path under the new snapshot
    // instead of leaving the page on the closed state. A refresh that adopts
    // the same generations changes neither key and re-requests nothing.
    (): number => snapshot.value?.repositoryGeneration ?? 0,
    (): number | null => snapshot.value?.globalGeneration ?? null,
  ],
  ([path, definitionPath]) => {
    if (path === '' || definitionPath === null) {
      // The URL names nothing this generation holds — a link from an earlier
      // scan, or a file that is no longer committed. Dropping what is open is
      // the point: the page shows the recoverable state below, and holding the
      // last skill's source behind it would keep authored content the reader
      // has navigated away from.
      pageOwnership.close();
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
  // The raw name, not this page's escaped spelling: the shell escapes its
  // subject exactly once at the rendering boundary (`App.vue`), so passing an
  // escaped value would double-escape — a name containing a newline would
  // head the page as `\u000A` but title the tab `\u005Cu000A`. Null when the
  // escaped spelling still draws nothing — a plain-whitespace name — because
  // a tab titled by it would read as having no subject at all.
  const name = owner.value?.entry.name;
  if (name === undefined || rendersNothingVisible(escapeControlCharacters(name))) {
    return null;
  }
  return name;
});
watchEffect(() => {
  // Reported as this page instance's own, so an outgoing page's unmount
  // cannot erase what this page just titled the tab with
  // (`SessionViewState.reportPageSubject`).
  pageOwnership.reportSubject(titleSubject.value);
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
  () => owner.value?.definition.sourceRelativePath,
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

// A generation replacement drops the whole detail while the selection stays:
// `SessionViewState.#refreshOnce` closes the open skill when it adopts a newer
// commit, and the route re-requests the same path afterwards. The unmount that
// follows takes the tree, the tab buttons, and the Skill tab with it — parts
// the pane guard above does not cover — and neither of the other guards fires,
// because the state is not `stale` and the skill's path has not changed. The
// skill-change condition keeps this guard out of a navigation to a different
// skill, whose own watcher focuses the heading after the flush so the new
// name is what gets announced (WCAG 2.4.3).
watch(
  entryDetail,
  (detail, previous) => {
    if (
      detail === null &&
      previous !== null &&
      !leaving &&
      previous.file.sourceRelativePath === owner.value?.definition.sourceRelativePath &&
      pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== heading.value
    ) {
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
  // The title subject and the open detail are both `usePageOwnership`'s to
  // drop, after unmount, where the focus guards above are naturally inert
  // and a replacement page's own report or open stands.
});
</script>

<template>
  <div ref="pageRoot" class="aci-skill-detail">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the skill
         list rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=skill">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">
      <!-- The row's own name heads the page — this product's provisional
           identity, the same one the inventory lists, in the same spelling:
           escaped like a path, and a name that draws nothing as authored
           gets the same note the inventory row shows rather than being
           replaced by the page's kind (FR-007). The span hugs its binding
           because it renders authored whitespace. -->
      <template v-if="inventoryName !== '' && inventoryNameInvisible"
        ><span class="aci-authored-text aci-authored-atomic">{{ inventoryName }}</span>
        <span class="aci-muted">(name with no visible characters)</span></template
      >
      <span v-else-if="inventoryName !== ''" class="aci-authored-text">{{ inventoryName }}</span>
      <template v-else>Skill</template>
    </h2>

    <!-- The documented invocation name, beside the provisional name in the
         heading: the two kinds of name a reader needs — what the vendors'
         own documentation invokes, and what this inventory lists — shown
         together so both can be checked (FR-007, data-model.md § Skill
         presentation). Absent when the definition publishes none: a failed
         extraction leaves an authored-name tool's invocation unknown, and
         its diagnostic tells the failure (FR-028). A name that draws nothing
         gets the same note the row shows, so the line never reads as an
         empty value (FR-025). -->
    <p v-if="invocationName !== ''" class="aci-note aci-skill-detail__invocation-name">
      Invocation name:
      <span class="aci-authored-text" :class="{ 'aci-authored-atomic': invocationNameInvisible }">{{
        invocationName
      }}</span>
      <span v-if="invocationNameInvisible" class="aci-muted"
        >(name with no visible characters)</span
      >
    </p>

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
        Nothing in the current scan sits at this link's path for this tool. The inventory may have
        changed since the link was made; a rescan that brings the path back will make it resolve
        again.
      </p>
      <p><NuxtLink to="/?kind=skill">Return to the inventory and open it again.</NuxtLink></p>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request — the
         shell reports what happened to the session, so neither hides or repeats
         the other. The real message is shown rather than a phrase standing in
         for it, and the retry beside it is the way back without re-finding the
         link. -->
    <template v-else-if="entryDetail === null">
      <p class="aci-error">{{ detailFailure }}</p>
      <p>
        <button type="button" @click="retryOpen">Try again</button>
      </p>
    </template>

    <template v-else-if="entryDetail">
      <div class="aci-skill-detail__overview">
        <!-- Path text escapes control characters for presentation
             (data-model.md § SourceRelativePath); the stored value that roots
             the tree below is unchanged. -->
        <p class="aci-path aci-authored-text">{{ escapeControlCharacters(treeDirectory) }}</p>

        <!-- Which definition this page is: the route's tool, rendered
             through its closed-union caption (FR-007). The recognizing-tools
             matrix of the file is the inventory's to show; this page is one
             definition of it, and selecting a companion never changes it. -->
        <p v-if="owner !== null" class="aci-skill-detail__definition">
          {{ SUPPORTED_TOOL_TEXT[owner.definition.tool] }} ·
          {{ CUSTOMIZATION_KIND_TEXT.skill }}
        </p>

        <!-- The comparison entry for this name (FR-011): present exactly when
             the name resolves two or more readable files. The comparison
             surface's own file switchers take over from there, this skill's
             census files included. -->
        <p v-if="comparePairRoute !== null" class="aci-skill-detail__compare">
          <NuxtLink :to="comparePairRoute">Compare this skill's files</NuxtLink>
        </p>
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
        <!-- A failed extraction leaves this panel with nothing parsed to
             show; its Diagnostic is what says so, and it renders here so the
             reason stays on screen even while a companion's source — with
             that companion's own diagnostics — is open in the files tab
             (FR-028). -->
        <ul v-if="entryDiagnostics.length > 0" class="aci-list" role="list">
          <li
            v-for="diagnostic in entryDiagnostics"
            :key="diagnostic.diagnosticId"
            :class="
              DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'
            "
          >
            {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
          </li>
        </ul>

        <div v-if="skillPresentation" class="aci-skill-detail__declarations">
          <h3>Frontmatter</h3>
          <p v-if="orderedDeclarations.length === 0" class="aci-note">This skill declares none.</p>
          <DeclarationBlock v-else :value="declarationBlock" />
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
            :selected-path="openPath"
            :tool="openTool"
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
                ><template v-if="isReadableFile(openFile) && openFile.hadLeadingBom">
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
                v-if="isReadableFile(openFile)"
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

/* The definition's own caption line, weighted like a heading within the
   overview: it says which tool's definition the page is. */
.aci-skill-detail__definition {
  font-weight: 600;
  margin: 0;
}

/* Kept short on purpose: it is what a reader needs before choosing a file, and
   every line of it is a line the files do not get. One wrapping row rather
   than three stacked lines for the same reason: the path, the definition
   caption, and the comparison entry are each a few words, and a line apiece
   put three lines of chrome between the heading and the tabs. The gap — not a
   separator glyph — is what keeps the three apart, so nothing new is read
   between them. */
.aci-skill-detail__overview {
  align-items: baseline;
  border-bottom: 1px solid var(--aci-border);
  column-gap: 1.25rem;
  display: flex;
  flex-wrap: wrap;
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
