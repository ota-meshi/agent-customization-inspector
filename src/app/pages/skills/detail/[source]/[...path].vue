<script setup lang="ts">
// The skill detail route (T102): what one skill is, and the files it is made of.
//
// The skill is the subject, not the file. A reader arriving here asked about a
// customization, so the page opens with what was recognized — the skill's own
// directory, the name each recognizing product invokes it by, every key
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
// The URL names the skill — `/skills/<the SKILL.md's source-relative path>` —
// and the file the reader has open inside it is a `file` query beside it. The
// subject is what the address names, so stepping through a skill's scripts and
// references never changes what the page is about; the query changes which
// source is shown. No tool segment, because two products reading one
// `SKILL.md` read the same bytes, the same frontmatter, and the same companion
// directory: a per-tool address would give one document two URLs differing
// only in a name. What differs is the name each product invokes it by, and the
// page states them together (FR-007). Both coordinates are paths the scan
// published, stable across rescans and server launches — the host resolves a
// detail request against whatever generation is current — so a bookmarked link
// keeps naming the same skill and file wherever a launch selects the same
// root, the origin half being devframe's port selection (data-model.md
// § Skill presentation), and a path the current scan does not hold is
// reported rather than guessed at.
//
// This surface — like the skill comparison at `/skills/compare/<family>` — shows file
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';
import { NuxtLink } from '#components';
import DirectoryFileTree from '../../../../components/inspection/DirectoryFileTree.vue';
import OpenFileButton from '../../../../components/inspection/OpenFileButton.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import { frontmatterYamlText } from '../../../../components/inspection/frontmatter-yaml';
import { LEADING_SKILL_FRONTMATTER_KEYS } from '../../../../components/inspection/declaration-order';
import {
  familyGenerationOf,
  familyComparisonPairsOf,
  sideFamilyOf,
  asSourceSelector,
  decodeDetailRoutePath,
  type ComparisonSide,
  type SourceSelector,
  detailRoute,
  selectedFileOf,
  selectedFileQuery,
} from '../../../../components/detail-route';
import { VENDOR_SURFACE_TEXT } from '../../../../../shared/registries/behavior-text';
import { nextTabForKey } from '../../../../components/tab-navigation';
import { skillComparisonRouteFor } from '../../../../composables/skill-comparison';
import { usePageOwnership } from '../../../../composables/page-ownership';
import { useOpenSourceFacts } from '../../../../composables/source-facts';
import { useSessionSources } from '../../../../composables/session-sources';
import { useSessionViewState } from '../../../../composables/session-view-state';
import type {
  SkillDefinitionDto,
  SkillInventoryEntryDto,
  SourceKind,
} from '../../../../../shared/api-types';
import { DIAGNOSTIC_REGISTRY } from '../../../../../shared/diagnostics';
import {
  fileIdentityKey,
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_ORDER,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  isReadableFile,
  rendersNothingVisible,
  type SupportedTool,
} from '../../../../../shared/entities';
import { SOURCE_SELECTOR_TEXT } from '../../../../../shared/api-text';

const sessionViewState = useSessionViewState();

const route = useRoute();
/**
 * The skill's own `SKILL.md`, from the URL's catch-all segments — the subject
 * a reader bookmarks. The router hands the segments over individually and
 * decoded, so joining them with `/` restores the published spelling exactly.
 */
const openAddress = computed(() => ({
  // The router splits the address: `[source]` is its own parameter and the
  // catch-all below it holds the path alone, so nothing here takes a segment
  // off a joined string (`detail-route.ts` § SourceSelector).
  source: asSourceSelector(route.params['source']),
  sourceRelativePath: decodeDetailRoutePath(
    ((parameter) => (typeof parameter === 'string' ? [parameter] : (parameter ?? [])))(
      route.params['path'],
    ),
  ),
}));
/**
 * The Source-relative Path this page is about, or the empty string for an
 * address whose leading segment names no Source this product issues. No file
 * has an empty path, so such an address resolves nothing and the page reports
 * what it already reports for a path the current scan does not hold.
 */
const entryPath = computed((): string =>
  openAddress.value.source === null ? '' : openAddress.value.sourceRelativePath,
);

/**
 * The Source this page's address names, the other half of the identity
 * {@link entryPath} carries (FR-030). It is what the detail request resolves
 * against and what the open control hands the host, so both answer for the
 * file the address names rather than for whichever Source lists the path
 * first.
 *
 * An address whose leading segment names no Source takes the repository token.
 * Nothing renders under such an address — {@link entryPath} is empty, so no
 * detail resolves — so the token is never what a request is made with; it
 * exists so this is a `SourceSelector` rather than a null every caller would
 * branch on.
 */
const openSource = computed((): SourceSelector => openAddress.value.source ?? 'repository');

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The Source ID the address's own token names in the current snapshot, or
 * null while the snapshot lists no such Source — a link kept across a Global
 * disable. Every resolution on this page is scoped by it, because the row and
 * files this page may show are the named Source's own: a same-path skill in
 * another Source is a different skill (FR-030).
 */
const openSourceId = computed((): string | null => sessionSources.sourceIdFor(openSource.value));

// The open skill's Source facts (FR-007 "show its source"): the family name
// where more than one family is inspected, and the consented directory where
// the family holds more than one Source (`source-facts.ts`). One line for the
// page rather than one per invocation, because which place the directory came
// from is the skill's fact, not a product's.
const { sourceFamilyText, sourceRootText } = useOpenSourceFacts(
  () => snapshot.value?.sources ?? [],
  () => openSourceId.value,
);

/**
 * The file of this skill the reader has open: the `file` query's path, or the
 * entry point when the query names none — which is what a link from the
 * inventory carries, and what the page opens on.
 *
 * A query rather than the address itself, because the subject is the skill:
 * selecting `scripts/run.sh` changes which source is shown and nothing about
 * what the page is describing (`detail-route.ts` § withSelectedFile).
 */
const openPath = computed((): string => selectedFileOf(route.query['file']) ?? entryPath.value);

/**
 * The committed files' paths, as one membership index: the path is the
 * file's identity (FR-030), so `has` is the whole resolution — for the URL's
 * own path in {@link owner}, whose miss the template reports as a dead link,
 * and for each census entry in {@link treeFiles}.
 */
const committedPaths = computed(
  () =>
    new Set(
      (snapshot.value?.files ?? [])
        .filter((file) => file.sourceId === openSourceId.value)
        .map((file) => file.sourceRelativePath),
    ),
);

/**
 * The committed readable files — the comparison-eligible subset (FR-025)
 * behind each invocation's comparison link: only a file with readable source
 * text can be a comparison input. Keyed by the file's whole identity —
 * Source and path (FR-030) — and unscoped by the open Source, because the
 * comparison route now names each side's own Source: a consented home's
 * copy of this name is exactly what the link exists to pair with.
 */
const comparableIdentities = computed(
  () =>
    new Set(
      (snapshot.value?.files ?? [])
        .filter((file) => isReadableFile(file))
        .map((file) => fileIdentityKey(file.sourceId, file.sourceRelativePath)),
    ),
);

const entryDetail = sessionViewState.entryDetail;
const openCompanion = sessionViewState.openCompanion;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
const snapshot = sessionViewState.snapshot;

/**
 * The inventory row and definition the URL names — the skill this page is
 * about, found by its own entry point.
 *
 * Resolved from the committed snapshot rather than from a fetched detail,
 * because the skill has to be known *before* anything is requested: it is what
 * carries the recognition this page is built around. A path the snapshot lists
 * no skill at belongs to no current generation, which is the same thing the
 * host would answer, so the page can say so without a doomed request.
 *
 * Any definition of that file answers: every product that reads the file reads
 * the same bytes and the same directory. Which names those products invoke it
 * by is a separate question, answered over the whole inventory by
 * {@link invocationNames}.
 */
const owner = computed(() => {
  const path = entryPath.value;
  for (const entry of snapshot.value?.skills ?? []) {
    for (const definition of entry.definitions) {
      // Both halves of the identity (FR-030): the address's own Source, so a
      // same-path skill in another Source cannot answer for this one.
      if (definition.sourceRelativePath === path && definition.sourceId === openSourceId.value) {
        return { entry, definition };
      }
    }
  }
  return null;
});

/**
 * The directory a path sits in, trailing slash kept — what the tree is rooted
 * at, so each row shows a name rather than a path.
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

/**
 * Whether the URL's selection is one of this skill's own committed files.
 *
 * A `file` query naming anything else — a hand-edited URL, a link kept from a
 * scan whose skill held that file — is a dead link rather than a file to open
 * here: every statement on this page is the skill's, and showing a file the
 * skill does not hold under them would attribute it to the skill.
 */
const selectionResolved = computed(() => treeFiles.value.includes(openPath.value));

/**
 * Where one file of this skill's directory opens: this same page, with that
 * file selected. The entry point drops the query rather than naming itself,
 * so the skill has one address and the link from the inventory is that address
 * (`detail-route.ts` § withSelectedFile).
 */
function skillFileRoute(sourceRelativePath: string): RouteLocationRaw {
  return {
    path: detailRoute('skill', entryPath.value, openSource.value),
    query: selectedFileQuery(sourceRelativePath === entryPath.value ? null : sourceRelativePath),
  };
}

/** The directory the tree is rooted at, so a row shows a name rather than a path. */
const treeDirectory = computed(() => directoryOf(treeFiles.value[0] ?? ''));

/**
 * One product's own name for this skill: the tool, the name its documentation
 * invokes the skill by — which is what the inventory keys that product's row
 * by (FR-007) — and the surfaces of the documented behaviors the admitting
 * rules rest on. A class because production builds these in exactly one
 * place, {@link invocationNames}.
 */
class SkillInvocation {
  /** The recognizing product, rendered through its closed-union caption. */
  public readonly tool: SupportedTool;
  /** That product's name for the skill, escaped for presentation like a path. */
  public readonly nameText: string;
  /**
   * The same name as accessible-name text: the single-line label rule,
   * because an accessible name collapses whitespace and would read two
   * invisibly different names as one ({@link inlinePresentationLabel}).
   */
  public readonly nameAccessibleText: string;
  /**
   * Whether the name draws nothing as authored — whitespace, or
   * default-ignorable code points — so the line can say so instead of showing
   * an apparently empty value (FR-025).
   */
  public readonly nameInvisible: boolean;
  /** The surfaces this product's admissions rest on, already captioned. */
  public readonly surfacesText: string;
  /**
   * The comparison of this name's copies — the open file's family's first
   * two readable entry files — or null when that family holds fewer than
   * two, where there is nothing to pair. A comparison is a pair within one
   * name and one family (FR-011), so each name offers its own: the same link the inventory row offers, so a reader deep
   * in a skill's files never has to go back to the list to start comparing.
   * The compare route's own file switchers take over from there, census
   * companions included.
   */
  public readonly compareRoute: ReturnType<typeof skillComparisonRouteFor> | null;

  /**
   * Builds one line from the row that names it and the definition in it.
   * `openFamily` is the open file's Source family, the boundary its
   * comparison entry stays inside. `namedAlready` is true when an earlier line of this page already carries
   * this row's comparison entry, which suppresses a second one: the
   * comparison belongs to the name, so two products invoking one file by one
   * name would otherwise offer the same control twice — one accessible name,
   * one destination (WCAG 2.4.6).
   */
  public constructor(
    entry: SkillInventoryEntryDto,
    definition: SkillDefinitionDto,
    comparableIdentities: ReadonlySet<string>,
    selectorOf: (sourceId: string) => SourceSelector,
    openFamily: SourceKind,
    namedAlready: boolean,
  ) {
    this.tool = definition.tool;
    this.nameText = escapeControlCharacters(entry.name);
    this.nameAccessibleText = inlinePresentationLabel(entry.name);
    this.nameInvisible = rendersNothingVisible(entry.name);
    this.surfacesText = definition.surfaces
      .map((surface) => VENDOR_SURFACE_TEXT[surface])
      .join(', ');
    // Each comparable copy once, by its whole identity: one definition per
    // (file, tool), so a file two products read is one copy, and a same-path
    // copy in another Source is a distinct one (FR-030).
    const offered = new Set<string>();
    const sides: ComparisonSide[] = [];
    for (const candidate of entry.definitions) {
      const identity = fileIdentityKey(candidate.sourceId, candidate.sourceRelativePath);
      if (comparableIdentities.has(identity) && !offered.has(identity)) {
        offered.add(identity);
        sides.push({
          source: selectorOf(candidate.sourceId),
          sourceRelativePath: candidate.sourceRelativePath,
        });
      }
    }
    // The pair stays inside the open file's family — a comparison never spans
    // two families (contracts/http-api.md § Host requirements #5) — through
    // the one pair rule every block entry uses (`detail-route.ts`
    // § familyComparisonPairsOf).
    const pair = familyComparisonPairsOf(sides).get(openFamily);
    this.compareRoute =
      !namedAlready && pair !== undefined
        ? skillComparisonRouteFor(openFamily, entry.name, pair[0], pair[1])
        : null;
  }
}

/**
 * The name each recognizing product invokes this skill by, in the closed tool
 * order (FR-007, data-model.md § Skill presentation).
 *
 * Read off the inventory rather than a field of the detail: a row is one
 * invocation name as one tool resolves it, so the entry file's rows already
 * carry every name and its product, and a second copy on the detail would be
 * a fact and something derived from it. The URL names a file rather than a
 * product, so the page states them all — this is what a per-tool address
 * used to say one at a time.
 *
 * Keyed on the skill's entry file, so opening a companion states the same
 * names: a companion is a file of the skill, not a skill of its own.
 */
const invocationNames = computed((): readonly SkillInvocation[] => {
  const definitionPath = owner.value?.definition.sourceRelativePath;
  if (definitionPath === undefined) {
    return [];
  }
  const byTool = new Map<SupportedTool, SkillInvocation>();
  // One comparison entry per name rather than per product: the comparison is
  // the name's, so a second product invoking the file by the same name adds a
  // line but no second link.
  const named = new Set<string>();
  for (const entry of snapshot.value?.skills ?? []) {
    for (const definition of entry.definitions) {
      // Both halves of the identity (FR-030): the gather spans rows — the
      // products invoke one file by different names — but never Sources, or a
      // same-path skill in another member would add its names and
      // recognitions to this page.
      if (
        definition.sourceRelativePath === definitionPath &&
        definition.sourceId === openSourceId.value
      ) {
        byTool.set(
          definition.tool,
          new SkillInvocation(
            entry,
            definition,
            comparableIdentities.value,
            (sourceId) => sessionSources.selectorOf(sourceId),
            sideFamilyOf({ source: openSource.value, sourceRelativePath: openPath.value }),
            named.has(entry.name),
          ),
        );
        named.add(entry.name);
      }
    }
  }
  return SUPPORTED_TOOL_ORDER.filter((tool) => byTool.has(tool)).map((tool) => byTool.get(tool)!);
});

/**
 * The skill's directory, escaped for presentation, which heads the page: the
 * directory is the skill (FR-007), and it is the one identity every product
 * reading it shares, where the names they invoke it by differ. Empty only
 * before an owner resolves, where the template titles the page by its kind.
 */
const skillDirectoryText = computed(() => escapeControlCharacters(treeDirectory.value));

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

const orderedDeclarations = computed(() => {
  const rank = (key: string): number => {
    const index = LEADING_SKILL_FRONTMATTER_KEYS.indexOf(key);
    return index === -1 ? LEADING_SKILL_FRONTMATTER_KEYS.length : index;
  };
  // `toSorted` is stable, so the keys past the leaders keep authored order.
  return (skillPresentation.value?.frontmatter ?? []).toSorted(
    (left, right) => rank(left.key) - rank(right.key),
  );
});

/**
 * The frontmatter as the YAML document the detail renders (FR-007,
 * frontmatter-yaml.ts): the declared keys in the order above, spelled back
 * in the block's own language, so a reader compares it against their file
 * without translating and pastes from it without converting.
 */
const frontmatterText = computed(() => frontmatterYamlText(orderedDeclarations.value));

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
 * Decided once per (Source, skill, open file), and only once the detail is
 * in hand — the Source is the identity's other half (FR-030): two consented
 * homes can hold one `skills/<name>/SKILL.md`, and a history step between
 * their two details keeps both paths identical while the skill is not. A
 * skill with nothing in it yet is not a skill with nothing to declare, and
 * deciding from that moment would open every skill on its files and then move
 * the reader when the declarations arrived.
 *
 * A commit drops the open detail and the route re-requests the same path under
 * the new generation (FR-030), so a rescan while the reader is reading takes
 * the detail away and brings the same one back. That round trip decides
 * nothing: the gap is skipped because nothing is in hand, and the return
 * matches the (Source, skill, open file) already decided for — which is what keeps a
 * reader who had opened the files list from being sent back to the
 * declarations. Leaving the route drops the memory with the component.
 */
const tabDecidedFor = ref<string | null>(null);

/**
 * The skill the strip last led with, so leading with it happens on the skill's
 * own arrival and not again.
 *
 * Separate from the selection above because the two answer different
 * questions: which file is being shown decides whether the files panel has to
 * be in view, while which skill it belongs to decides whether the page is
 * arriving at a skill at all. Choosing `SKILL.md` from the file list is a new
 * selection but the same skill, and answering it by leaving the list would
 * undo the reader's own click.
 */
const skillLedFor = ref<string | null>(null);
watch(
  [
    openSource,
    () => owner.value?.definition.sourceRelativePath,
    () => openPath.value,
    () => skillPresentation.value !== null,
    () => entryDetail.value !== null,
  ],
  ([sourceValue, entryPathValue, openPathValue, hasPresentation, entryHeld]) => {
    if (entryPathValue === undefined || !entryHeld) {
      // Nothing is in hand: the first render before the detail arrives, and
      // the gap a rescan opens. There is no tab to decide between yet, and the
      // strip keeps whatever the reader last chose until there is.
      return;
    }
    const decidingFor = `${sourceValue}\u0000${entryPathValue}\u0000${openPathValue}`;
    if (tabDecidedFor.value === decidingFor) {
      return;
    }
    tabDecidedFor.value = decidingFor;
    const ledFor = `${sourceValue}\u0000${entryPathValue}`;
    const skillArrived = skillLedFor.value !== ledFor;
    skillLedFor.value = ledFor;
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
    // The entry point is open and there is a skill to show. Lead with it on
    // the skill's own arrival, and leave the strip alone otherwise: reaching
    // the entry point from the file list is a file selection, and answering it
    // by leaving the list would undo the reader's own click.
    if (skillArrived) {
      selectTab('skill');
    }
  },
  { immediate: true },
);

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
  if (detailState.value === 'stale' || !selectionResolved.value) {
    return 'Nothing in the current scan sits at this link\u2019s path.';
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

/**
 * The height the pane had when the file it was showing left it, or 0 while a
 * file is in hand. It floors the pane for as long as the next file is in
 * flight, so stepping through a skill's directory keeps the page the size it
 * was instead of collapsing to the loading line and expanding again. A floor
 * rather than a fixed size: the file that arrives sets the pane's real height,
 * whether it is taller or shorter.
 */
const reservedPaneHeight = ref(0);

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
  if (resolved === null || !selectionResolved.value) {
    return;
  }
  void pageOwnership.openFileDetail(
    resolved.definition.sourceRelativePath,
    openPath.value,
    openSource.value,
  );
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
    (): number => familyGenerationOf(snapshot.value ?? null, openSource.value),
    // The Source is a key beside the path, because it is the other half of the
    // identity: a step between two Sources' details at one path leaves the path
    // identical and the file different, so without this the page would keep
    // showing the file it already had (FR-030).
    openSource,
  ],
  ([path, definitionPath]) => {
    if (path === '' || definitionPath === null || !selectionResolved.value) {
      // The URL names nothing this generation holds — a link from an earlier
      // scan, a file that is no longer committed, or a `file` query naming
      // something this skill does not hold. Dropping what is open is the
      // point: the page shows the recoverable state below, and holding the
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
  if (detailState.value === 'stale' || !selectionResolved.value) {
    return 'Link not in this scan';
  }
  // Only a whole-skill failure retitles the tab. A companion that failed to
  // load leaves the skill on screen — its name is still what this page is
  // showing, and a title saying the skill could not be loaded would describe a
  // page that is showing one.
  if (detailFailure.value !== null && detailState.value !== 'companion-failed') {
    return 'Skill could not be loaded';
  }
  // The skill's own directory, which is what heads the page. The raw value,
  // not this page's escaped spelling: the shell escapes its subject exactly
  // once at the rendering boundary (`App.vue`), so passing an escaped value
  // would double-escape — a directory containing a newline would head the
  // page as `\u000A` but title the tab `\u005Cu000A`. Null when the escaped
  // spelling still draws nothing, because a tab titled by it would read as
  // having no subject at all.
  const directory = treeDirectory.value;
  if (directory === '' || rendersNothingVisible(escapeControlCharacters(directory))) {
    return null;
  }
  return `${directory} — ${SOURCE_SELECTOR_TEXT[openSource.value]}`;
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
  [openSource, () => owner.value?.definition.sourceRelativePath],
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
  (file, previous) => {
    if (file === null && previous !== null) {
      // The pane's own height, taken before Vue patches the content away: the
      // line that replaces it is one line tall, so without this the page
      // shortens by the height of a file and springs back a frame later when
      // the next one arrives — a blink on every step through the tree, and a
      // scroll position that moves under the reader. Read here because this
      // watcher is synchronous; afterwards the element is already empty.
      reservedPaneHeight.value = paneElement.value?.offsetHeight ?? 0;
    }
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
      <!-- The skill's own directory heads the page: the directory is the
           skill (FR-007), and it is the one identity every product reading
           it shares, where the names they invoke it by differ and are listed
           below. Escaped for presentation like every path, never a locator
           anything can open (FR-024, FR-030). A URL no owner resolves for is
           headed by the kind, so the heading always describes the page
           (WCAG 2.4.6). -->
      <span v-if="skillDirectoryText !== ''" class="aci-path aci-authored-text">{{
        skillDirectoryText
      }}</span>
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

    <template v-else-if="detailState === 'stale' || !selectionResolved">
      <p class="aci-error">
        Nothing in the current scan sits at this link's path. The inventory may have changed since
        the link was made; a rescan that brings the path back will make it resolve again.
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
        <!-- Which family of place the skill came from, and — where that
             family holds more than one Source — which consented directory:
             an escaped presentation of the admitted root, never a path
             anything can open (FR-002, FR-007). -->
        <p v-if="sourceFamilyText !== null" class="aci-skill-detail__source-family">
          {{ sourceFamilyText }}
        </p>
        <p v-if="sourceRootText !== null" class="aci-skill-detail__root aci-note">
          <span class="aci-authored-text">{{ sourceRootText }}</span>
        </p>
        <!-- What each recognizing product invokes this skill by, with the
             surfaces of the documented behaviors its admitting rules rest on
             beside it (FR-007, FR-009). Two products reading one `SKILL.md`
             need not agree — Copilot invokes the authored `name`, Claude Code
             the skill directory — so the page states both rather than picking
             one, which a per-product address would have decided instead. Naming
             a surface is never a claim that it loaded the skill. Selecting a
             companion never changes this list: a companion is a file of the
             skill, not a skill of its own. -->
        <ul v-if="invocationNames.length > 0" class="aci-skill-detail__invocations" role="list">
          <li v-for="invocation in invocationNames" :key="invocation.tool">
            <span class="aci-skill-detail__invocation"
              >{{ SUPPORTED_TOOL_TEXT[invocation.tool] }} ({{ invocation.surfacesText }}) ·
              {{ CUSTOMIZATION_KIND_TEXT.skill }}</span
            >
            <!-- The name is labelled rather than trailing the product, because
                 what it is — the name that product's own documentation
                 invokes the skill by — is the whole point of showing several.
                 The span hugs its binding because it renders authored
                 whitespace, and a name that draws nothing as authored gets the
                 note the inventory row gives it, so the line never reads as an
                 empty value (FR-025). -->
            {{ ' · ' }}
            <span
              >Invocation name:
              <span
                class="aci-authored-text"
                :class="{ 'aci-authored-atomic': invocation.nameInvisible }"
                >{{ invocation.nameText }}</span
              ><span v-if="invocation.nameInvisible" class="aci-muted">
                (name with no visible characters)</span
              ></span
            >
            <!-- The comparison entry for this name (FR-011): present exactly
                 when the name resolves two or more readable files. The
                 comparison surface's own file switchers take over from there,
                 this skill's census files included. The accessible name
                 carries the name, because a page listing two products offers
                 the same phrase twice (WCAG 2.4.6; label-in-name keeps the
                 visible phrase as the prefix). -->
            <template v-if="invocation.compareRoute !== null">{{ ' · ' }}</template>
            <NuxtLink
              v-if="invocation.compareRoute !== null"
              :to="invocation.compareRoute"
              :aria-label="`Compare this skill's files: ${invocation.nameAccessibleText}`"
              >Compare this skill's files</NuxtLink
            >
          </li>
        </ul>
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
          <p v-if="skillPresentation.frontmatter.length === 0" class="aci-note">
            This skill declares none.
          </p>
          <!-- The declared keys as one read-only YAML document in the file's
               own order (FR-007), through the same viewer the instructions
               use — sized to the block, because a frontmatter is short
               (SourceViewer § fitContent). YAML because the block is YAML:
               nothing here is markup, a link, or a resolved reference
               (FR-025, FR-026, FR-033). -->
          <SourceViewer
            v-else
            :source-text="frontmatterText"
            :source-relative-path="entryPath"
            content-label="Frontmatter of"
            content-language="yaml"
            fit-content
          />
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
          <DirectoryFileTree
            :files="treeFiles"
            :selected-path="openPath"
            :directory="treeDirectory"
            label="Files in this skill"
            :route-for="skillFileRoute"
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
            :style="
              openFile === null && reservedPaneHeight > 0
                ? { minBlockSize: `${reservedPaneHeight}px` }
                : undefined
            "
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
              <div class="aci-skill-detail__file-title">
                <!-- The authored run is the heading's whole content: it renders
                     its own whitespace (`aci-authored-text`), so anything else
                     inside it would draw this template's indentation, and the
                     heading's accessible name would carry an action beside the
                     file it names. -->
                <h3 class="aci-path aci-authored-text">{{ openFilePathText }}</h3>
                <!-- Beside the file's own path: this panel is the one place a
                     skill's page names a single file. -->
                <OpenFileButton
                  v-if="openFile !== null"
                  :source-relative-path="openFile.sourceRelativePath"
                  :source="openSource"
                />
              </div>

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
/* The file's path and the link that opens it on one line, wrapping together
   when the path is long. */
.aci-skill-detail__file-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}

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
/* One line per recognizing product, laid across the overview's width rather
   than stacked in a column: this list is the widest thing the overview holds,
   and stacking three short parts per product left the rest of the line empty.
   Products wrap onto their own lines only when two no longer fit. */
.aci-skill-detail__invocations {
  column-gap: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  row-gap: 0.15rem;
}

/* The product, its name, and its comparison entry read as one line, set apart
   by separators rather than by punctuation inside the text — the same rhythm
   an inventory row's recognitions have. */
.aci-skill-detail__invocation {
  font-weight: 600;
}

/* The separator is a text node rather than generated content, so the line
   reads the same to a screen reader as it does on screen: `::before` content
   is not part of the accessible text, and `Skill` would run into
   `Invocation name` with nothing between them. */
.aci-skill-detail__invocations li {
  display: flex;
  column-gap: 0.4rem;
  flex-wrap: wrap;
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
