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
import SubjectUnavailable from '../../../../components/inspection/SubjectUnavailable.vue';
import LeavesIcon from '~icons/lucide/arrow-right';
import OpenFileButton from '../../../../components/inspection/OpenFileButton.vue';
import DetailNavigation from '../../../../components/inspection/DetailNavigation.vue';
import FileStrip from '../../../../components/inspection/FileStrip.vue';
import SourceViewer from '../../../../components/inspection/SourceViewer.vue';
import ToolMark from '../../../../components/ToolMark.vue';
import { AuthoredName } from '../../../../components/authored-name';
import { otherCopiesOf, type FileStripEntry } from '../../../../components/inspection/file-strip';
import { frontmatterYamlText } from '../../../../components/inspection/frontmatter-yaml';
import { LEADING_SKILL_FRONTMATTER_KEYS } from '../../../../components/inspection/declaration-order';
import {
  familyGenerationOf,
  familyComparisonPairsOf,
  sideFamilyOf,
  asSourceSelector,
  decodeDetailRoutePath,
  detailNeighbours,
  detailRoute,
  originRowNameOf,
  originRowNameQuery,
  type ComparisonSide,
  type SourceSelector,
  selectedFileOf,
  selectedFileQuery,
} from '../../../../components/detail-route';
import { VENDOR_SURFACE_TEXT } from '../../../../../shared/registries/behavior-text';
import type { VendorSurface } from '../../../../../shared/registries/behavior-types';
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
  accessiblePresentationLabel,
  escapeControlCharacters,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
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
const { sourceRootText, sourceFamilyCrumbText } = useOpenSourceFacts(
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
 * The inventory row this page was opened from, or null where the link named
 * none (`detail-route.ts` § originRowNameQuery). It settles nothing the page
 * shows: one file's page is one page whichever of its names was followed.
 */
const originRowName = computed(() => originRowNameOf(route.query['name']));

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
  const matches: { entry: SkillInventoryEntryDto; definition: SkillDefinitionDto }[] = [];
  for (const entry of snapshot.value?.skills ?? []) {
    for (const definition of entry.definitions) {
      // Both halves of the identity (FR-030): the address's own Source, so a
      // same-path skill in another Source cannot answer for this one.
      if (definition.sourceRelativePath === path && definition.sourceId === openSourceId.value) {
        matches.push({ entry, definition });
      }
    }
  }
  // Which row the reader followed, where this file is listed under more than
  // one name (`detail-route.ts` § originRowNameQuery). The first match is the
  // fallback: a link that names no row, and one naming a row this generation
  // no longer publishes, both resolve to the same page — only the moves to the
  // neighbouring rows depend on which row it is.
  const named = matches.find(({ entry }) => entry.name === originRowName.value);
  return named ?? matches[0] ?? null;
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
    // The row the reader followed rides along: selecting another file of this
    // skill is a move inside one page, and dropping the coordinate here made
    // the page fall back to whichever of the skill's rows the snapshot lists
    // first, taking the previous and next moves with it
    // (`detail-route.ts` § originRowNameQuery).
    query: {
      ...originRowNameQuery(originRowName.value),
      ...selectedFileQuery(sourceRelativePath === entryPath.value ? null : sourceRelativePath),
    },
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
  /**
   * That product's name for the skill, as every surface of the line needs it:
   * the reader's own characters, with this product's note beside them where
   * they draw nothing, and the single-line spelling for an accessible name
   * ({@link AuthoredName}).
   */
  public readonly name: AuthoredName;
  /** The surfaces this product's admissions rest on, already captioned. */
  public readonly surfacesText: string;
  /** The surfaces themselves, for the marks the attribute line draws. */
  public readonly surfaces: readonly VendorSurface[];
  /**
   * The comparison of this name's copies — the open file's family's first two
   * readable entry files — or null when that family holds fewer than two,
   * where there is nothing to pair. A comparison is a pair within one name and
   * one family (FR-011), and the group that carries the name is what offers
   * it: the route is keyed by the name, so two products invoking the file by
   * one name would otherwise leave which of their rows shows the link to the
   * order they happen to be in ({@link invocationGroups}).
   */
  public readonly compareRoute: ReturnType<typeof skillComparisonRouteFor> | null;

  /**
   * Builds one line from the row that names it and the definition in it.
   * `openFamily` is the open file's Source family, the boundary its comparison
   * entry stays inside.
   */
  public constructor(
    entry: SkillInventoryEntryDto,
    definition: SkillDefinitionDto,
    comparableIdentities: ReadonlySet<string>,
    selectorOf: (sourceId: string) => SourceSelector,
    openFamily: SourceKind,
  ) {
    this.tool = definition.tool;
    this.name = new AuthoredName(entry.name);
    this.surfacesText = definition.surfaces
      .map((surface) => VENDOR_SURFACE_TEXT[surface])
      .join(', ');
    this.surfaces = definition.surfaces;
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
      pair === undefined ? null : skillComparisonRouteFor(openFamily, entry.name, pair[0], pair[1]);
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
          ),
        );
      }
    }
  }
  return SUPPORTED_TOOL_ORDER.filter((tool) => byTool.has(tool)).map((tool) => byTool.get(tool)!);
});

/**
 * One invocation name and the recognitions that resolve it, in the order
 * {@link invocationNames} publishes them (FR-007).
 *
 * The name is the unit rather than the recognition, because the comparison is:
 * its route is keyed by the name, so a name two products invoke the file by
 * has one comparison and not two. Stated per recognition instead, which of the
 * two rows carried the link would be decided by whichever product the closed
 * tool order puts first — an arbitrary answer to a question the reader is
 * entitled to have settled.
 *
 * A class because production builds these in exactly one place
 * (AGENTS.md § Class and interface policy).
 */
class SkillInvocationGroup {
  /** The name every recognition in this group invokes the skill by. */
  public readonly name: AuthoredName;

  /**
   * This name's comparison, or null when its family holds fewer than two
   * readable copies — where the group says so rather than leaving the reader
   * to tell a missing control from a forgotten one.
   */
  public readonly compareRoute: ReturnType<typeof skillComparisonRouteFor> | null;

  /** The recognitions resolving this name, in the closed tool order. */
  public readonly recognitions: readonly SkillInvocation[];

  /**
   * The other files this name resolves, so the next copy is one move rather
   * than a return to the list (FR-007). Inside the group for the reason the
   * comparison link is: a copy is a copy *of this name*, and one file that
   * answers to two names has a different set under each — stated once for the
   * page, the strip could not say which name a copy was a copy under.
   */
  public readonly otherCopies: readonly FileStripEntry[];

  /** Takes the group's shared facts from its first recognition, which fixes them. */
  public constructor(
    recognitions: readonly SkillInvocation[],
    otherCopies: readonly FileStripEntry[],
  ) {
    const first = recognitions[0];
    if (first === undefined) {
      throw new Error('a group of invocations holds at least the one that opened it');
    }
    this.name = first.name;
    this.compareRoute = first.compareRoute;
    this.recognitions = recognitions;
    this.otherCopies = otherCopies;
  }
}

/**
 * The names this skill answers to, each with the recognitions that resolve it.
 * One group where every product agrees, and one per name where they do not:
 * FR-007 has Claude Code invoking the directory while Copilot invokes the
 * authored `name`, so one file answers to two.
 */
const invocationGroups = computed((): readonly SkillInvocationGroup[] =>
  [...Map.groupBy(invocationNames.value, (invocation) => invocation.name.authored).entries()].map(
    ([name, recognitions]) =>
      new SkillInvocationGroup(
        recognitions,
        otherCopiesOf(
          copiesOfName(name),
          fileIdentityKey(openSourceId.value ?? '', entryPath.value),
        ),
      ),
  ),
);

/**
 * Every file one invocation name resolves, as the strip's entries — the one on
 * screen included, which the strip's own filter removes
 * ({@link otherCopiesOf}).
 *
 * One name at a time, because each group states its own: a file two products
 * invoke by two names is a copy of each, and the two names rarely resolve the
 * same set.
 */
function copiesOfName(name: string): readonly FileStripEntry[] {
  const byFile = new Map<string, FileStripEntry>();
  for (const entry of snapshot.value?.skills ?? []) {
    if (entry.name !== name) {
      continue;
    }
    for (const definition of entry.definitions) {
      const key = fileIdentityKey(definition.sourceId, definition.sourceRelativePath);
      const existing = byFile.get(key);
      byFile.set(
        key,
        existing === undefined
          ? {
              key,
              sourceId: definition.sourceId,
              pathText: pathPresentationLabel(definition.sourceRelativePath),
              opens: {
                accessibleText: sessionSources.qualifiedLinkName(
                  accessiblePresentationLabel(definition.sourceRelativePath),
                  definition.sourceId,
                ),
                route: {
                  path: detailRoute(
                    'skill',
                    definition.sourceRelativePath,
                    sessionSources.selectorOf(definition.sourceId),
                  ),
                  // A copy of *this* name, so the link opens it under this name:
                  // the copy may answer to another name too, and without the
                  // coordinate the page it opens would take that other row's
                  // neighbours (`detail-route.ts` § originRowNameQuery).
                  query: originRowNameQuery(name),
                },
              },
              recognitions: [{ tool: definition.tool, surfaces: definition.surfaces }],
              carrierText: null,
            }
          : {
              ...existing,
              recognitions: [
                ...existing.recognitions,
                { tool: definition.tool, surfaces: definition.surfaces },
              ],
            },
      );
    }
  }
  return [...byFile.values()];
}

/**
 * The rows either side of this one in the skill list's own order, so the next
 * skill is one move rather than a return to the inventory (FR-007).
 */
const listNeighbours = computed(() => {
  const entries = snapshot.value?.skills ?? [];
  const rows = entries.map((entry) => ({
    label: inlinePresentationLabel(entry.name),
    // The move carries the row it opens, exactly as that row's own link in the
    // inventory does: a neighbour whose file is listed under two names would
    // otherwise land on the page as the other name's row and offer that row's
    // neighbours, which walks the reader back up the list.
    route: {
      path: detailRoute(
        'skill',
        entry.definitions[0]?.sourceRelativePath ?? '',
        sessionSources.selectorOf(entry.definitions[0]?.sourceId ?? ''),
      ),
      query: originRowNameQuery(entry.name),
    },
  }));
  return detailNeighbours(
    rows,
    entries.findIndex((entry) => entry === owner.value?.entry),
  );
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
 * The entry file's own name — the last segment of its path — as presentation
 * text, because the heading above already spells the directory it sits in and
 * a page carries no fact in two spellings (FR-007). Escaped like every path
 * (data-model.md § SourceRelativePath).
 */
const entryFileNameText = computed(() => {
  const path = entryDetail.value?.file.sourceRelativePath ?? '';
  return escapeControlCharacters(path.slice(path.lastIndexOf('/') + 1));
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
  <div ref="pageRoot" class="aci-skill-detail aci-route">
    <!-- The way back and the rows either side of this one, drawn in the bar
         with every other route's moves (`DetailNavigation.vue`). The kind is
         URL state, so naming it is what makes the move land on the skill list
         rather than the kind order's default tab. -->
    <DetailNavigation
      list-route="/?kind=skill"
      :list-text="CUSTOMIZATION_KIND_TEXT.skill"
      :previous="listNeighbours.previous"
      :next="listNeighbours.next"
    />

    <!-- Where the page sits, which is location rather than a way out: the
         Source family, the kind, and this page's own subject. -->
    <p class="aci-detail-crumbs">
      <template v-if="sourceFamilyCrumbText !== null"
        >{{ sourceFamilyCrumbText }} <span>›</span> </template
      >{{
        CUSTOMIZATION_KIND_TEXT.skill
      }}<!-- The subject and the separator before it stand together: the trail
           has no third step until an owner resolves — a link this scan holds
           nothing at never gets one — and a separator with nothing after it
           reads as a step that failed to render.
      --><template v-if="skillDirectoryText !== ''">
        <span>›</span>
        <span class="aci-detail-crumbs__subject aci-path">{{ skillDirectoryText }}</span>
      </template>
    </p>

    <h2 ref="heading" tabindex="-1" class="aci-detail-title">
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

    <!-- Two dead links, two sentences. The address names the skill and the
         `file` query names one file inside it, so a link can fail at either
         step, and one sentence for both said the skill's own path resolved
         nothing when it had resolved and only the selection had not. The
         skill's own step is checked first and by the inventory rather than by
         the request's state: a path this scan lists no skill at reaches no
         request to go stale, and it must not fall through to the selection
         sentence, which would tell the reader a directory holds no such file
         when there is no such directory. -->
    <template v-else-if="detailState === 'stale' || owner === null">
      <SubjectUnavailable outcome="warning">
        Nothing in the current scan sits at this link's path. The inventory may have changed since
        the link was made; a rescan that brings the path back will make it resolve again.
        <template #exit>
          <NuxtLink to="/?kind=skill">Return to the inventory and open it again.</NuxtLink>
        </template>
      </SubjectUnavailable>
    </template>

    <template v-else-if="!selectionResolved">
      <SubjectUnavailable outcome="warning">
        This skill's directory holds no file at the path this link selects. The skill may have
        changed since the link was made; its own files are on the files tab.
        <template #exit>
          <NuxtLink :to="skillFileRoute(entryPath)">Open this skill's own file.</NuxtLink>
        </template>
      </SubjectUnavailable>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request — the
         shell reports what happened to the session, so neither hides or repeats
         the other. The real message is shown rather than a phrase standing in
         for it, and the retry beside it is the way back without re-finding the
         link. -->
    <template v-else-if="entryDetail === null">
      <SubjectUnavailable outcome="error">
        {{ detailFailure }}
        <template #exit>
          <button type="button" @click="retryOpen">Try again</button>
        </template>
      </SubjectUnavailable>
    </template>

    <template v-else-if="entryDetail">
      <!-- The entry file's own facts, on the line under the heading: which
           file carries the skill, how it read, its size, and how many further
           files its directory ships. The products are not here — what each of
           them invokes this skill by is that recognition's own fact and one
           file can answer to two names (FR-007), so they are a row apiece
           below rather than a set of marks on this line. -->
      <!-- Only while the skill itself is in view. The files tab states the
           selected file's own path and facts on the viewer's line above it,
           and this line states the `SKILL.md`'s: with both on screen a reader
           selecting a companion read two sizes stacked and could not tell
           which one the page was about. -->
      <p v-if="activeTab === 'skill'" class="aci-detail-attributes">
        <span class="aci-path aci-authored-text">{{ entryFileNameText }}</span>
        <!-- No count here. The files tab states how many the directory holds,
             and a second count on this line counts the same directory a
             different way — the reader is left adding one to the other to
             learn what the tab already says. -->
        <span
          >{{ FILE_ENCODING_TEXT[entryDetail.file.encoding]
          }}<template v-if="entryDetail.file.encoding !== 'unknown'">
            · {{ entryDetail.file.sizeBytes }} bytes</template
          ></span
        >
        <!-- The command that opens the file, at the end of the line that
             states that file's facts — the one place every kind puts it, so a
             reader who found it on one detail finds it on the next. The files
             tab has its own on the viewer's line, because there the file on
             screen is whichever one the tree selected. -->
        <span class="aci-detail-attributes__end">
          <OpenFileButton :source-relative-path="entryPath" :source="openSource" />
        </span>
      </p>

      <!-- Which directory the skill was in, where its family holds more than
           one: an escaped presentation of the admitted root, never a path
           anything can open (FR-002). -->
      <p v-if="sourceRootText !== null" class="aci-skill-detail__root aci-note">
        <span class="aci-authored-text">{{ sourceRootText }}</span>
      </p>

      <!-- One row per recognition: the product, the surfaces of the documented
           behaviors its admitting rules rest on (FR-009), and the name that
           product invokes this skill by. The three are never folded into one
           line, whether or not the names agree today: an invocation name
           belongs to the recognition rather than to the file — FR-007 has
           Claude Code invoking the directory while Copilot invokes the
           authored `name`, so one file answers to two names — and a shape that
           changes with the data would leave a reader asking why this page
           looks different. Naming a surface is never a claim that it loaded
           the skill. Selecting a companion never changes this list: a
           companion is a file of the skill, not a skill of its own. -->
      <div class="aci-skill-detail__overview">
        <ul v-if="invocationGroups.length > 0" class="aci-skill-detail__invocations" role="list">
          <li v-for="group in invocationGroups" :key="group.name.text">
            <p class="aci-skill-detail__invocation-head">
              <!-- The name is labelled rather than left bare, because what it
                   is — the name a product's own documentation invokes the
                   skill by — is the whole point of showing several. The span
                   hugs its binding because it renders authored whitespace, and
                   a name that draws nothing is spelled out in full, so the
                   line never reads as an empty value (FR-025). -->
              <span
                >Invocation name:
                <span :class="group.name.isAuthored ? 'aci-authored-text' : 'aci-muted'">{{
                  group.name.text
                }}</span></span
              >
              <!-- This name's comparison (FR-011): present exactly when the
                   name resolves two or more readable files in this family. The
                   comparison surface's own file switchers take over from
                   there, this skill's census files included. The accessible
                   name carries the name, because a page listing two names
                   offers the same phrase twice (WCAG 2.4.6; label-in-name
                   keeps the visible phrase as the prefix). -->
              <NuxtLink
                v-if="group.compareRoute !== null"
                class="aci-button aci-button--primary aci-skill-detail__invocation-compare"
                :to="group.compareRoute"
                :aria-label="`Compare this skill's files: ${group.name.singleLineText}`"
                >Compare this skill's files
                <LeavesIcon class="aci-detail-compare__mark" aria-hidden="true"
              /></NuxtLink>
              <!-- Why there is no comparison, rather than nothing at all: a
                   missing control reads the same as a forgotten one, and the
                   reason is a fact about the name — this family holds one copy
                   of it, so there is no pair to make (FR-011). -->
              <span v-else class="aci-skill-detail__invocation-compare aci-muted"
                >This name has one copy here, so there is nothing to compare</span
              >
            </p>
            <ul class="aci-skill-detail__recognitions" role="list">
              <li v-for="invocation in group.recognitions" :key="invocation.tool">
                <span class="aci-skill-detail__invocation-product">
                  <ToolMark :tool="invocation.tool" decorative />
                  {{ SUPPORTED_TOOL_TEXT[invocation.tool] }}</span
                >
                <span class="aci-skill-detail__invocation-surfaces">{{
                  invocation.surfacesText
                }}</span>
              </li>
            </ul>
            <!-- The other files this name resolves, one line whatever the
                 count (`FileStrip.vue`). Inside the group for the reason the
                 comparison link above is: a copy is a copy of this name, and a
                 file answering to two names has a different set under each.
                 Nothing here states an order or a winner: which copy a session
                 loads turns on runtime this tool does not observe (FR-009).
                 The landmark carries the name as well, because a page listing
                 two names would otherwise hold two landmarks called the same
                 thing (WCAG 2.4.1; label-in-name keeps the visible phrase as
                 the prefix, WCAG 2.5.3). -->
            <FileStrip
              :open-source-id="openSourceId"
              :entries="group.otherCopies"
              label="Other copies of this skill"
              :accessible-label="`Other copies of this skill: ${group.name.singleLineText}`"
            />
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
            panel-label="Frontmatter"
            :source-text="frontmatterText"
            :source-relative-path="entryPath"
            content-label="Frontmatter of"
            content-language="yaml"
          />
        </div>

        <div v-if="skillPresentation" class="aci-skill-detail__instructions">
          <p v-if="skillBodyIsEmpty" class="aci-note">This skill has none.</p>
          <!-- The same read-only viewer the files tab uses, given the entry
               point's own path so the body is highlighted as the Markdown it
               is. Highlighting is tokenizing, not rendering: no heading
               becomes large, no link becomes clickable, and no image loads
               (FR-033). -->
          <SourceViewer
            v-else
            panel-label="Instructions"
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
            supporting-label="Supporting files"
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
              <SubjectUnavailable outcome="error">
                {{ detailFailure }}
                <template #exit>
                  <button type="button" @click="retryOpen">Try again</button>
                </template>
              </SubjectUnavailable>
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
                <!-- The command that opens what is on screen, on that file's own
                     line: at the end of the tab row it stood over both panels
                     and left the reader to work out whether it opened the skill
                     or the file they had selected. -->
                <OpenFileButton
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
                panel-label="Source"
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
/* The open file's path with the command that opens it, on one line: the
   command acts on the file the line names, so a reader never has to work out
   what it applies to. */
.aci-skill-detail__file-title {
  align-items: center;
  column-gap: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  row-gap: 0.375rem;
}

.aci-skill-detail__file-title > :last-child {
  margin-inline-start: auto;
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
/* One box per name, stacked. The name is the box's heading and the products
   that resolve it are the rows inside, which is what makes the comparison the
   name's rather than one product's. */
.aci-skill-detail__invocations {
  display: grid;
  gap: 0.375rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aci-skill-detail__invocations > li {
  background: var(--aci-surface-raised);
  border: 1px solid var(--aci-line);
  border-radius: 0.4375rem;
  overflow: hidden;
}

/* The name heads its own box on a band of its own, with the comparison it owns
   at the end of that band: the band is what separates the name from the
   recognitions under it, where a shared surface would leave two kinds of line
   reading as one list. It wraps rather than pushing the name off the line
   (WCAG 1.4.10). */
.aci-skill-detail__invocation-head {
  align-items: center;
  background: var(--aci-surface-sunken);
  border-block-end: 1px solid var(--aci-hairline);
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  margin: 0;
  padding: 0.3125rem 0.625rem;
}

.aci-skill-detail__invocation-compare {
  margin-inline-start: auto;
}

/* One row per recognition inside the box: the product and the surfaces its
   admitting rules rest on (FR-009). Two columns, so a reader comparing two
   products reads down one rather than hunting along a sentence — the product
   column fixed, the surfaces taking what is left because they are what vary in
   length. Below the reflow width each row becomes a column of its own. */
.aci-skill-detail__recognitions {
  display: grid;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aci-skill-detail__recognitions li {
  align-items: center;
  column-gap: 0.75rem;
  display: grid;
  grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
  padding: 0.25rem 0.625rem;
  row-gap: 0.15rem;
}

/* A hairline between recognitions, which separates rows inside a box the
   border above has already identified (main.css § --aci-hairline). */
.aci-skill-detail__recognitions li + li {
  border-block-start: 1px solid var(--aci-hairline);
}

@media (width < 40rem) {
  .aci-skill-detail__recognitions li {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* The product names the row, so it carries the row's weight. */
.aci-skill-detail__invocation-product {
  align-items: center;
  display: flex;
  font-weight: 600;
  gap: 0.3125rem;
}

/* The surfaces qualify the recognition they sit beside rather than being one
   of the things a reader scans for — the same treatment they get on a row. */
.aci-skill-detail__invocation-surfaces {
  color: var(--aci-muted);
  font-size: 0.65625rem;
  letter-spacing: 0.01em;
}

/* What the recognitions sit in, between the head's file line and the tabs.
   Kept short on purpose: every line of it is a line the files do not get, and
   the real data is two or three rows. */
.aci-skill-detail__overview {
  margin-block: 0.5rem;
}

/* The two halves of the entry point, inside the tab that holds the skill
   itself. */
.aci-skill-detail__declarations,
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
/* `start` because the tree takes the height its own rows ask for: stretched to
   the column beside it, its frame ran on past its last row and drew an empty
   box under the files it lists. */
.aci-skill-detail__layout {
  align-items: start;
  display: grid;
  gap: 0.75rem 0.875rem;
  grid-template-columns: minmax(0, 1fr);
  padding-block-start: 0.75rem;
}

@media (min-width: 52rem) {
  .aci-skill-detail__layout {
    grid-template-columns: 15rem minmax(0, 1fr);
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
