<script setup lang="ts">
// The plugin comparison route (T829–T832; FR-011, FR-012): one plugin name's
// declarations compared across two of the carriers that resolve it — each
// side one JSON document diffed in Monaco (research.md § 7) — with no
// verdict, no merge, and no fix anywhere.
//
// The route is the plugin kind's, not a shared one: comparison is
// kind-specific (spec.md § Clarifications Session 2026-08-14), and each
// family's comparison unit is its inventory's own row unit — for skills one
// name's copies, for MCP one declared server name, here one plugin name as
// its vendor addresses it (data-model.md § Inventory unit). The comparison
// is opened from that name's inventory row or from one of its carriers'
// detail pages, and stays inside what the row holds: its pickers move the
// two sides among the row's own carriers.
//
// A row with two carriers is a repository that keeps parallel catalogs — one
// where Codex reads and one where Claude does — offering the same plugin
// from the same marketplace name. Whether the two entries still agree is
// exactly what this page answers.
//
// The URL carries the model's own coordinates —
// `/plugins/compare?name=<plugin name>&left=<path>&right=<path>` — the row's
// name in the carriers' own spelling (FR-007) and the two carriers by their
// Source-relative Paths (FR-030). A selection the model cannot express — a
// name no current row is, one carrier twice, or a carrier the named row does
// not hold — is reported, never opened.
//
// Like the plugin detail, this surface shows declared values exactly as
// authored — credentials included, with nothing masked and no control that
// would uncover a masked value — and it says none of that (FR-027).
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NuxtLink } from '#components';
import RecognitionComparison from '../../components/plugin-comparison/RecognitionComparison.vue';
import SourceDiff from '../../components/plugin-comparison/SourceDiff.vue';
import SourceViewer from '../../components/inspection/SourceViewer.vue';
import { nextTabForKey } from '../../components/tab-navigation';
import type { PluginComparisonSide } from '../../components/plugin-comparison/recognition-comparison';
import { canonicalDeclaredEntriesJsonText } from '../../components/declared-entries-json';
import { fromJsonStringBody } from '../../components/detail-route';
import {
  pluginComparisonRouteFor,
  type PluginComparisonFileRequest,
} from '../../composables/plugin-comparison';
import { usePageOwnership } from '../../composables/page-ownership';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { PLUGIN_CARRIER_TEXT, PLUGIN_SOURCE_FORM_TEXT } from '../../../shared/api-text';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import {
  CUSTOMIZATION_KIND_TEXT,
  SUPPORTED_TOOL_ORDER,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
} from '../../../shared/entities';
import type { SupportedTool } from '../../../shared/entities';
import type {
  CustomizationFileDto,
  PluginCarrierDetailDto,
  PluginFileDetailDto,
  PluginSourceForm,
} from '../../../shared/api-types';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats rendering a comparison with no
  // session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const comparison = sessionViewState.pluginComparison;
const snapshot = sessionViewState.snapshot;
const status = comparison.status;

const route = useRoute();
const router = useRouter();
const pageOwnership = usePageOwnership();

/**
 * The comparison's own content registry, for the viewer this page mounts when
 * both carriers name one directory: the surface that replaces the open pair is
 * this one, so the model it holds is dropped where the pair is
 * (`SourceViewer.registerContentOwner`).
 */
const registerComparisonContentOwner = (disposer: () => void): (() => void) =>
  comparison.registerOpenContentOwner(disposer);

/**
 * The page heading, focused on entry so a keyboard user starts at the top and
 * whenever a control the reader is on is about to unmount. Declared with the
 * page's other roots rather than beside the guards that use it: the retries
 * above reach for it, and a `const` declared after them would sit in its
 * temporal dead zone for any of them that ran during setup.
 */
const heading = ref<HTMLHeadingElement | null>(null);

/** The inventory link that lands on the plugins tab rather than the default. */
const inventoryRoute = '/?kind=plugin';

/**
 * One query parameter as the single string it is, or null when the URL does
 * not carry it. A repeated parameter arrives as an array; this route's are
 * not repeated, so the array form folds to its first value rather than being
 * a case. Present-but-empty stays the empty string, because a catalog can
 * declare `""` as a plugin name (FR-025).
 */
function queryParameter(name: string): string | null {
  const parameter = route.query[name];
  if (typeof parameter === 'string') {
    return parameter;
  }
  return Array.isArray(parameter) && typeof parameter[0] === 'string' ? parameter[0] : null;
}

/**
 * The plugin name whose row owns this comparison (FR-007), decoded the way
 * its link encoded it, so a declared name that is not well-formed UTF-16
 * round-trips to its own comparison (`plugin-comparison.ts`).
 */
const subjectName = computed(() => {
  const parameter = queryParameter('name');
  return parameter === null ? null : fromJsonStringBody(parameter);
});

/** The first compared carrier's Source-relative Path (FR-030). */
const leftPath = computed(() => {
  const parameter = queryParameter('left');
  return parameter === null ? '' : fromJsonStringBody(parameter);
});

/** The second compared carrier's Source-relative Path (FR-030). */
const rightPath = computed(() => {
  const parameter = queryParameter('right');
  return parameter === null ? '' : fromJsonStringBody(parameter);
});

/**
 * Whether the URL names a selection at all; without a name and two paths
 * there is nothing to open. A path is never the empty string
 * (data-model.md § SourceRelativePath), so `''` folds into absence; the
 * empty declared name stays a name.
 */
const hasSelection = computed(
  () => subjectName.value !== null && leftPath.value !== '' && rightPath.value !== '',
);

/**
 * The coordinates most recently requested by a picker and not yet reflected
 * by the route; the same gap-filler the sibling comparison routes keep, so a
 * pick renders on the picked value rather than on the one the route still
 * carries for a frame.
 */
const pendingPair = shallowRef<{ readonly left: string; readonly right: string } | null>(null);

// The route caught up (or the reader navigated): the query is the truth
// again, and a pending value kept past this point would shadow it.
watch([leftPath, rightPath], () => {
  pendingPair.value = null;
});

/** The pending-aware current coordinates; the route's, once it has caught up. */
const currentLeftPath = computed(() => pendingPair.value?.left ?? leftPath.value);
const currentRightPath = computed(() => pendingPair.value?.right ?? rightPath.value);

/**
 * The `file` coordinate this page itself wrote on the last pair switch, or
 * null when the coordinate is the reader's own.
 *
 * Not reactive state: it decides whether the normalization below may replace
 * the coordinate, and a render never reads it.
 */
let switchedFile: string | null = null;

/**
 * Replaces the compared coordinates in place, inside the same named row.
 * `replace` rather than `push`: stepping through pairs is this page's working
 * motion, and a history entry per pick would make the back button replay
 * every pair the reader stepped through on the way.
 */
function switchTo(left: string, right: string): void {
  pendingPair.value = { left, right };
  switchedFile = comparedFile.value;
  // The file on screen travels with the move, not the one the link happened to
  // name: a reader stepping a side while reading one of the plugin's files is
  // changing which copy that file comes from, not leaving the file — and the
  // panel they are looking at is the files panel, which the `file` coordinate
  // is what keeps open. A name the new pair does not ship falls back to that
  // pair's own first file once its rows settle ({@link comparedFile}).
  void router.replace(
    pluginComparisonRouteFor(subjectName.value ?? '', left, right, comparedFile.value),
  );
}

/**
 * The one inventory row owning the comparison: the row whose plugin name the
 * URL carries. The comparison never leaves it — its sides are that name's
 * declarations — and null when no current row is the named one, which the
 * template reports instead of comparing (FR-011).
 */
const owningRow = computed(() => {
  if (subjectName.value === null) {
    return null;
  }
  return (snapshot.value?.plugins ?? []).find((entry) => entry.name === subjectName.value) ?? null;
});

/**
 * The paths the pickers offer: the owning row's carriers, one entry per
 * physical carrier in the row's published order. One file that several
 * products recognize is one carrier here — the same bytes and the same
 * declaration, so a pair of its recognitions would compare a document with
 * itself.
 */
const comparablePaths = computed<readonly string[]>(() => [
  ...new Set((owningRow.value?.carriers ?? []).map((carrier) => carrier.sourceRelativePath)),
]);

/**
 * How a side states whose reading it shows: the product this side was fetched
 * for, named only when the file has more than one, where the root and the
 * manifest below could have been another product's.
 */
function readingTextOf(sourceRelativePath: string): string {
  const carriers = owningRow.value?.carriers ?? [];
  const tools = new Set(
    carriers
      .filter((carrier) => carrier.sourceRelativePath === sourceRelativePath)
      .map((carrier) => carrier.tool),
  );
  const tool = toolForPath(sourceRelativePath);
  return tools.size > 1 && tool !== null
    ? `Read as ${SUPPORTED_TOOL_TEXT[tool]} reads this carrier`
    : '';
}

/**
 * The product whose reading one side is, for the request that fetches it: the
 * first product in the closed tool order that recognizes that file for this
 * row.
 *
 * A file several products recognize is one carrier to this surface — a pair of
 * its recognitions would compare a document with itself ({@link
 * comparablePaths}) — but the root, the source form, and the manifest forms a
 * side states are one product's reading of it (`api-types.ts`
 * § PluginCarrierDetailParams.tool). The side line names which, so the reading
 * on screen is attributed rather than assumed.
 *
 * Null for a path the row does not carry, which {@link pairFault} reports
 * instead of comparing.
 */
function toolForPath(sourceRelativePath: string): SupportedTool | null {
  const carriers = owningRow.value?.carriers ?? [];
  for (const tool of SUPPORTED_TOOL_ORDER) {
    if (
      carriers.some(
        (carrier) => carrier.sourceRelativePath === sourceRelativePath && carrier.tool === tool,
      )
    ) {
      return tool;
    }
  }
  return null;
}

/**
 * What is wrong with the link's coordinates, before any request — the model's
 * own validation, reported instead of a comparison. Null when the selection
 * is the model's: one plugin name's row holding both carriers.
 */
const pairFault = computed<string | null>(() => {
  if (!hasSelection.value) {
    return 'This link names no plugin comparison. Open a comparison from a plugin row in the inventory, or from a plugin’s detail page.';
  }
  if (currentLeftPath.value === currentRightPath.value) {
    return 'A comparison needs this plugin declared in two distinct files, and this link names the same file twice.';
  }
  if (owningRow.value === null) {
    return 'No plugin name in the current scan matches this link’s. The inventory may have changed since the link was made; open a comparison from a plugin row.';
  }
  const held = new Set(owningRow.value.carriers.map((carrier) => carrier.sourceRelativePath));
  if (!held.has(currentLeftPath.value) || !held.has(currentRightPath.value)) {
    // Covers a path that is no current carrier at all: such a path is on no
    // row, this one included.
    return 'A file this link names does not resolve this plugin in the current scan. The inventory may have changed since the link was made; open a comparison from a plugin row.';
  }
  return null;
});

// One effect owns "which selection should be open", so entering the route, a
// URL edit, a pick, and a committed generation all take the same path. The
// committed generations are part of the key: adopting a newer one drops the
// open comparison while the coordinates stay identical, so their change is
// what re-requests the same selection under the new snapshot.
watch(
  [
    subjectName,
    leftPath,
    rightPath,
    (): number => snapshot.value?.repositoryGeneration ?? 0,
    (): number | null => snapshot.value?.globalGeneration ?? null,
  ],
  () => {
    if (pairFault.value !== null) {
      // The coordinates are outside the model; the template reports the fault
      // ({@link pairFault}) instead of a comparison.
      comparison.close();
      return;
    }
    const leftTool = toolForPath(currentLeftPath.value);
    const rightTool = toolForPath(currentRightPath.value);
    if (leftTool === null || rightTool === null) {
      // A path this row does not carry: the fault above reports it, and there
      // is no product to ask for a reading of it.
      comparison.close();
      return;
    }
    void comparison.open(
      subjectName.value ?? '',
      currentLeftPath.value,
      leftTool,
      currentRightPath.value,
      rightTool,
    );
  },
  { immediate: true },
);

/**
 * Whether the pickers render: only a row with more than two comparable
 * carriers has a file to move a side to — with exactly two, both already
 * stand on the two sides and each selector would offer nothing but its own
 * value.
 */
const pickersAvailable = computed(
  () => pairFault.value === null && comparablePaths.value.length > 2,
);

/** The first side's picker binding; a pick moves the `left` coordinate. */
const leftSelection = computed({
  get: () => currentLeftPath.value,
  set: (path: string) => {
    switchTo(path, currentRightPath.value);
  },
});

/** The second side's picker binding; a pick moves the `right` coordinate. */
const rightSelection = computed({
  get: () => currentRightPath.value,
  set: (path: string) => {
    switchTo(currentLeftPath.value, path);
  },
});

/**
 * The two halves of a plugin comparison, as the tab strip presents them: what
 * the two carriers declare about the plugin, and the files the two copies
 * ship. Tabs rather than one column for the reason the detail pages' are: two
 * subjects, and stacked, the files sat below everything the declarations say.
 */
const COMPARE_TABS = ['declaration', 'files'] as const;

/** Which half of the comparison is in view; see {@link COMPARE_TABS}. */
type CompareTab = (typeof COMPARE_TABS)[number];

/** The label each tab shows. */
const COMPARE_TAB_TEXT: Readonly<Record<CompareTab, string>> = {
  /** Label for the panel holding the two declarations. */
  declaration: 'Declaration',
  /** Label for the panel holding the compared file's two copies. */
  files: 'Files',
};

const activeTab = ref<CompareTab>('declaration');

/** The `id` of the panel a tab controls (WCAG 4.1.2). */
function comparePanelId(tab: CompareTab): string {
  return `aci-plugin-compare-panel-${tab}`;
}

/** The `id` of the tab that controls {@link comparePanelId}'s panel. */
function compareTabId(tab: CompareTab): string {
  return `aci-plugin-compare-tab-${tab}`;
}

/**
 * Arrow keys move the selection, matching the WAI-ARIA tabs pattern that
 * every other tab strip in this product follows. Selection follows focus
 * because switching panels loses no work: opening the files panel asks for
 * the compared file's two copies once, and stepping back to the declarations
 * keeps them.
 */
function onTabKeydown(event: KeyboardEvent, index: number): void {
  const next = nextTabForKey(event.key, COMPARE_TABS, index);
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior.
    return;
  }
  event.preventDefault();
  activeTab.value = next;
  document.getElementById(compareTabId(next))?.focus();
}

/**
 * The file of the compared plugins the URL has open, named relative to each
 * side's own root, or null when the link opens on the declarations. Two
 * copies of one plugin sit at two paths, so the name they share is the one
 * inside them — `skills/checklist/SKILL.md`, not either copy's whole path.
 */
const selectedFile = computed(() => {
  const parameter = queryParameter('file');
  return parameter === null ? null : fromJsonStringBody(parameter);
});

/**
 * One carrier's plugin root for the compared name, or null when this carrier
 * reaches no directory here — a source outside this repository, or an
 * extraction that failed. A manifest is its own plugin's root; a catalog
 * answers from the entry that resolves this name.
 */
function pluginRootOf(detail: PluginCarrierDetailDto): string | null {
  if (detail.carrier === 'manifest') {
    return detail.pluginRoot === '' ? null : detail.pluginRoot;
  }
  const declared = (detail.plugins ?? []).find((plugin) => plugin.name === subjectName.value);
  return declared?.pluginRoot ?? null;
}

/**
 * What kind of place one carrier's offering of the compared name puts the
 * plugin's files (`api-types.ts` § PluginSourceForm), or null when this
 * carrier declares nothing to answer from — a failed extraction, where the
 * entries are unknown rather than sourceless.
 *
 * A manifest is the plugin's own file inside the plugin's own directory, so
 * its answer is that directory rather than an offering's.
 */
function pluginSourceFormOf(detail: PluginCarrierDetailDto): PluginSourceForm | null {
  if (detail.carrier === 'manifest') {
    return 'repository-directory';
  }
  const declared = (detail.plugins ?? []).find((plugin) => plugin.name === subjectName.value);
  return declared?.sourceForm ?? null;
}

/**
 * The files one side's plugin ships, keyed by the name they have inside its
 * root: the row's published paths under that root, which is where the census
 * put them (contracts/inspection-path-allowlist.md § Bounded companion
 * census). Empty when the carrier reached no root.
 */
function shippedFilesOf(detail: PluginCarrierDetailDto): ReadonlyMap<string, string> {
  const root = pluginRootOf(detail);
  const shipped = new Map<string, string>();
  if (root === null) {
    return shipped;
  }
  // This side's own list, published by the carrier that is this side
  // (`api-types.ts` § PluginCarrierDto.files): the census's answer for the
  // directory its offering named, so a root inside the other side's — one
  // reached through a link that side's descent refused — belongs to the side
  // whose census listed it and to no other. The root is still what names the
  // file inside the plugin, which is how the two sides' copies line up.
  const tool = toolForPath(detail.file.sourceRelativePath);
  for (const carrier of owningRow.value?.carriers ?? []) {
    if (carrier.sourceRelativePath !== detail.file.sourceRelativePath || carrier.tool !== tool) {
      // This side is one product's reading of one file, and two products
      // reading one catalog can reach different files from it.
      continue;
    }
    for (const path of carrier.files) {
      if (path.startsWith(root)) {
        shipped.set(path.slice(root.length), path);
      }
    }
  }
  return shipped;
}

/**
 * The plugin's own manifest one carrier reaches, or null when this scan holds
 * none for it. The same resolution the detail page performs: a manifest
 * carrier *is* the manifest, and a catalog's offering names the documented
 * forms its vendors read inside the root, of which the first the generation
 * holds is the plugin's own declaration of itself.
 */
function manifestPathOf(detail: PluginCarrierDetailDto): string | null {
  if (detail.carrier === 'manifest') {
    return detail.file.sourceRelativePath;
  }
  const declared = (detail.plugins ?? []).find((plugin) => plugin.name === subjectName.value);
  // This side's own files: the manifest a plugin declares itself with is one
  // of the files its offering reached, so a form the other side's directory
  // holds is not this side's manifest.
  const shipped = new Set(
    (owningRow.value?.carriers ?? [])
      .filter(
        (carrier) =>
          carrier.sourceRelativePath === detail.file.sourceRelativePath &&
          carrier.tool === toolForPath(detail.file.sourceRelativePath),
      )
      .flatMap((carrier) => carrier.files),
  );
  for (const path of declared?.manifestPaths ?? []) {
    if (shipped.has(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Each side's manifest path once the pair is adopted, with the document each
 * side needs beside them: two sides resolving to one file need one read, and
 * the panel then shows that file rather than a diff of it with itself.
 *
 * Which of those the view already holds is not decided here. A document a
 * carrier response carried is adopted by the comparison view, which is where
 * those responses live, so this page states what its panels show and never a
 * second copy of that rule (contracts/http-api.md § Comparison views).
 */
const manifestRow = computed(() => {
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (status.value !== 'ready' || left === null || right === null) {
    return null;
  }
  const leftPath = manifestPathOf(left);
  const rightPath = manifestPathOf(right);
  const leftFetch = leftPath;
  const rightFetch = rightPath === leftPath ? null : rightPath;
  return { leftPath, rightPath, leftFetch, rightFetch };
});

// The manifests are the declaration panel's second subject, requested with the
// pair rather than with a tab: the panel the page opens on shows them.
watch(
  manifestRow,
  (row) => {
    if (row === null) {
      comparison.closeManifestPair();
      return;
    }
    void comparison.openManifestPair(
      fileRequestFor(comparison.leftDetail.value, row.leftFetch),
      fileRequestFor(comparison.rightDetail.value, row.rightFetch),
    );
  },
  { immediate: true },
);

/**
 * One side's manifest source: the document the pair adopted for that side, or
 * the carrier's own file when the carrier is itself that manifest — one path
 * in one scan is one document, whichever request brought it.
 */
function manifestFileOf(
  detail: PluginCarrierDetailDto | null,
  fetched: PluginFileDetailDto | null,
): CustomizationFileDto | null {
  if (detail?.carrier === 'manifest') {
    return detail.file;
  }
  return fetched?.file ?? null;
}

/**
 * The manifest comparison the declaration panel draws: the two plugins' own
 * declarations of themselves, as the diff's operands, or null while the pair
 * is not in hand. A side this scan holds no manifest for is the stated
 * absence, exactly as a file only one copy ships is.
 */
const manifestPair = computed(() => {
  const row = manifestRow.value;
  if (row === null || comparison.manifestStatus.value === 'loading') {
    return null;
  }
  if (row.leftPath === null && row.rightPath === null) {
    return null;
  }
  if (row.leftPath === row.rightPath) {
    // One file behind both carriers: a diff of a manifest with itself shows a
    // reader nothing, so the section reads it instead.
    return null;
  }
  const left = manifestFileOf(comparison.leftDetail.value, comparison.leftManifest.value);
  const right = manifestFileOf(comparison.rightDetail.value, comparison.rightManifest.value);
  if (row.leftPath === null || row.rightPath === null) {
    // One plugin declares itself with a manifest this scan holds and the other
    // declares itself nowhere: the existence difference is part of the
    // comparison, shown as the present side's content against the stated
    // absence (FR-011). The absent side is labelled by the form the present
    // one uses inside its own root, which is the name that side would have.
    const present = row.leftPath === null ? right : left;
    if (present === null || !isReadableFile(present)) {
      return null;
    }
    const presentPath = row.leftPath ?? row.rightPath ?? '';
    const root = pluginRootOf(
      (row.leftPath === null ? comparison.rightDetail.value : comparison.leftDetail.value) ??
        comparison.leftDetail.value!,
    );
    const relative =
      root !== null && presentPath.startsWith(root) ? presentPath.slice(root.length) : presentPath;
    return {
      originalText: row.leftPath === null ? '' : present.sourceText,
      originalPath: row.leftPath ?? relative,
      originalAbsent: row.leftPath === null,
      modifiedText: row.rightPath === null ? '' : present.sourceText,
      modifiedPath: row.rightPath ?? relative,
      modifiedAbsent: row.rightPath === null,
    };
  }
  if (left === null || !isReadableFile(left) || right === null || !isReadableFile(right)) {
    return null;
  }
  return {
    originalText: left.sourceText,
    originalPath: row.leftPath,
    modifiedText: right.sourceText,
    modifiedPath: row.rightPath,
  };
});

/**
 * Where each compared plugin keeps its own manifest, for the section that
 * shows them: the same two captions the sides above use, with the path each
 * side's manifest sits at. A side that has none carries what its offering
 * named instead — the directory when it named one, and otherwise the kind of
 * place it put the plugin — because those are different absences and the
 * section states them apart.
 */
const manifestSides = computed(() => {
  const row = manifestRow.value;
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (row === null || left === null || right === null) {
    return [];
  }
  return [
    {
      caption: 'First plugin',
      path: row.leftPath,
      root: pluginRootOf(left),
      sourceForm: pluginSourceFormOf(left),
    },
    {
      caption: 'Second plugin',
      path: row.rightPath,
      root: pluginRootOf(right),
      sourceForm: pluginSourceFormOf(right),
    },
  ];
});

/**
 * The one manifest behind both carriers, once it is in hand: two offerings of
 * one directory declare themselves with one file, so the panel reads it
 * instead of diffing it with itself.
 */
const sharedManifest = computed(() => {
  const row = manifestRow.value;
  if (row === null || (row.leftPath === null && row.rightPath === null)) {
    return null;
  }
  if (row.leftPath !== row.rightPath) {
    // Two manifests, or one against a stated absence: both are diffs
    // (FR-011), and this viewer is for the one file behind both carriers.
    return null;
  }
  const file =
    manifestFileOf(comparison.leftDetail.value, comparison.leftManifest.value) ??
    manifestFileOf(comparison.rightDetail.value, comparison.rightManifest.value);
  return file !== null && isReadableFile(file) ? file : null;
});

/**
 * What the manifest section says for the state it is in, or null while it is
 * showing one. Its own statement beside the file panel's, because the
 * manifests are their own request (FR-028).
 */
const manifestStatement = computed<string | null>(() => {
  const row = manifestRow.value;
  if (row === null) {
    return null;
  }
  if (row.leftPath === null && row.rightPath === null) {
    // Nothing to add: each side states above what its own offering reached,
    // and the two need not have reached the same kind of nothing — one may
    // name a directory here that holds no manifest while the other names a
    // location outside this repository entirely.
    return null;
  }
  switch (comparison.manifestStatus.value) {
    case 'loading':
      return null;
    case 'stale':
      return 'A manifest this link named is no longer in the current scan. A rescan that brings it back will make this comparison resolve again.';
    case 'failed':
      return comparison.manifestErrorMessage.value === null
        ? 'This manifest comparison could not be loaded.'
        : `This manifest comparison could not be loaded. ${comparison.manifestErrorMessage.value}`;
    case 'idle':
    case 'ready':
      if (row.leftPath === null || row.rightPath === null) {
        const only = row.rightPath === null ? 'first' : 'second';
        return manifestPair.value === null
          ? 'This manifest is not text this product can show. The plugin’s own page states what was found.'
          : `Only the ${only} plugin declares itself with a manifest this scan holds: it is compared against the other plugin’s stated absence, which is the existence difference rather than an empty file.`;
      }
      if (row.leftPath === row.rightPath) {
        return sharedManifest.value === null
          ? 'This manifest is not text this product can show. The plugin’s own page states what was found.'
          : 'Both carriers resolve to one manifest file, so this is that file rather than two copies of it.';
      }
      return manifestPair.value === null
        ? 'One of these manifests is not text this product can show, so there is nothing to diff. Each plugin’s own page states what was found.'
        : null;
  }
  return null;
});

/** Whether the manifest statement gets a retry; see {@link fileRetryable}. */
const manifestRetryable = computed(
  () =>
    // A pair neither side holds a manifest for is idle by rights, and a retry
    // there would offer to re-run a request nothing ever made.
    (manifestRow.value?.leftPath ?? manifestRow.value?.rightPath ?? null) !== null &&
    (comparison.manifestStatus.value === 'failed' || comparison.manifestStatus.value === 'idle'),
);

/** Re-requests the manifest pair; the manifest section's own retry. */
function retryManifestPair(): void {
  const row = manifestRow.value;
  if (row === null) {
    return;
  }
  // Focus first, for the reason {@link retryFilePair} does it.
  heading.value?.focus();
  void comparison.openManifestPair(
    fileRequestFor(comparison.leftDetail.value, row.leftFetch),
    fileRequestFor(comparison.rightDetail.value, row.rightFetch),
  );
}

/**
 * The directory each compared plugin is, for the files panel's own heading
 * block: a file of this panel is a file inside one of these two roots, and the
 * panel would otherwise show names with no statement of where they sit. The
 * same two captions and the same order as the declaration panel's sides —
 * first named, first shown. A side whose carrier reached no directory here
 * states that instead of a path.
 */
const rootSides = computed(() => {
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (status.value !== 'ready' || left === null || right === null) {
    return [];
  }
  return [
    {
      caption: 'First plugin',
      root: pluginRootOf(left),
      carrierPath: left.file.sourceRelativePath,
    },
    {
      caption: 'Second plugin',
      root: pluginRootOf(right),
      carrierPath: right.file.sourceRelativePath,
    },
  ];
});

/**
 * Every file either compared plugin ships, in name order, with each side's
 * own path for it. A name both sides ship is comparable; a name only one
 * ships is listed and stated rather than diffed against an absent side —
 * that file has no counterpart, and its own plugin's page is where it is
 * read.
 *
 * Empty while the pair is not adopted: which files a plugin ships is the
 * root its carrier's declaration named, which is what those requests answer.
 */
const fileRows = computed(() => {
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (status.value !== 'ready' || left === null || right === null) {
    return [];
  }
  const leftFiles = shippedFilesOf(left);
  const rightFiles = shippedFilesOf(right);
  // Which files read as text is the generation's own answer, published beside
  // every file it holds: bytes no reader shows are not a comparison, so such
  // a copy is listed and said rather than opened (FR-025).
  const readable = new Set(
    (snapshot.value?.files ?? [])
      .filter((file) => isReadableFile(file))
      .map((file) => file.sourceRelativePath),
  );
  return [...new Set([...leftFiles.keys(), ...rightFiles.keys()])]
    .toSorted((first, second) => (first < second ? -1 : 1))
    .map((name) => {
      const leftPath = leftFiles.get(name) ?? null;
      const rightPath = rightFiles.get(name) ?? null;
      return {
        name,
        leftPath,
        rightPath,
        comparable:
          (leftPath === null || readable.has(leftPath)) &&
          (rightPath === null || readable.has(rightPath)),
      };
    });
});

/**
 * Whether the settled pair ships a file by this name.
 *
 * Read by the normalization below, which rewrites the `file` coordinate after
 * a pair switch the reader made: the file they were reading may be one only
 * the previous pair had. A link that names a file no side ships is reported
 * instead of quietly replaced — a bookmark identifies what it names, and
 * showing another file under it would answer a question nobody asked.
 */
function selectedFileShipped(name: string): boolean {
  return fileRows.value.some((row) => row.name === name);
}

/**
 * The file this page would open on when the link names none: the first name
 * both copies ship, then the first comparable one, then the first of any.
 */
function defaultComparedFile(): string | null {
  for (const row of fileRows.value) {
    if (row.comparable && row.leftPath !== null && row.rightPath !== null) {
      return row.name;
    }
  }
  for (const row of fileRows.value) {
    if (row.comparable) {
      return row.name;
    }
  }
  return fileRows.value[0]?.name ?? null;
}

/**
 * The file the files panel compares: the one the URL names, or — when it names
 * none — the first both copies ship, falling back to the first of any. The
 * panel is about a file, so it always has one: an empty state there would be
 * a screen whose whole subject the reader has to go and choose. Both copies'
 * first, because a file only one ships opens on an absence, and the panel a
 * reader opens unasked should open on a comparison.
 */
const comparedFile = computed(
  () =>
    // The coordinate as the URL carries it: a name no side ships is a dead link
    // this page reports, and the switch that could produce one normalizes the
    // URL instead ({@link normalizeSwitchedFile}).
    selectedFile.value ?? defaultComparedFile(),
);

// A pair the reader switched carries the file they were reading, which the new
// pair may not ship. Once its rows settle, the coordinate this page wrote is
// replaced by the file the panel would have opened on — in the URL, so the
// address names what is on screen. A coordinate the reader's own link carried
// is never replaced: the panel reports it instead (FR-011, FR-030).
watch([fileRows, selectedFile], () => {
  const named = selectedFile.value;
  if (named === null || named !== switchedFile || fileRows.value.length === 0) {
    return;
  }
  switchedFile = null;
  if (selectedFileShipped(named)) {
    return;
  }
  void router.replace(
    pluginComparisonRouteFor(
      subjectName.value ?? '',
      currentLeftPath.value,
      currentRightPath.value,
      defaultComparedFile(),
    ),
  );
});

// A link that names a file opens on the files: a reader who kept one asked
// for that file, and landing them on the declarations would answer a question
// they did not ask. Decided once per selection, so switching tabs afterwards
// stays where the reader put it.
const tabDecidedFor = ref<string | null>(null);
watch(
  [subjectName, leftPath, rightPath],
  ([name, left, right]) => {
    const decidingFor = `${name}\u0000${left}\u0000${right}`;
    if (tabDecidedFor.value === decidingFor) {
      return;
    }
    tabDecidedFor.value = decidingFor;
    // The file the link arrived with, read once here rather than watched:
    // choosing a file inside the panel moves that coordinate too, and a
    // decision that watched it would move the reader's tab under them.
    activeTab.value = selectedFile.value === null ? 'declaration' : 'files';
  },
  { immediate: true },
);

/** The compared file's row, or null when the pair ships none this scan holds. */
const selectedFileRow = computed(
  () => fileRows.value.find((row) => row.name === comparedFile.value) ?? null,
);

/**
 * Whether the two sides' copies of the selected file are one file: two
 * carriers may name one root — the ordinary shape of a repository that keeps
 * one plugin and two catalogs offering it — and a file diffed against itself
 * would draw an empty comparison the reader has to interpret.
 */
const selectedFileIsShared = computed(
  () =>
    selectedFileRow.value !== null &&
    selectedFileRow.value.leftPath === selectedFileRow.value.rightPath,
);

// The file pane's own effect: which file is open, requested once per
// selection and dropped when the selection leaves. The adopted pair is a key
// because the roots come from it — a re-request under a newer generation
// re-resolves the same name to the same two paths.
watch(
  [
    // The coordinates rather than the row object: a refreshed snapshot rebuilds
    // an equal row, and an identity watch would drop and re-request the same
    // two files on every refresh — and, for a file this function cannot serve,
    // would turn one rejection's refresh into an endless round trip.
    (): string | null => selectedFileRow.value?.leftPath ?? null,
    (): string | null => selectedFileRow.value?.rightPath ?? null,
    selectedFileIsShared,
    activeTab,
  ],
  ([leftFilePath, rightFilePath, shared, tab]) => {
    const row =
      leftFilePath === null && rightFilePath === null
        ? null
        : { leftPath: leftFilePath, rightPath: rightFilePath };
    if (row === null) {
      // The pair ships no file by this name in this scan; the panel states it
      // where the comparison would be.
      comparison.closeFilePair();
      return;
    }
    if (!(selectedFileRow.value?.comparable ?? true)) {
      // Bytes no reader shows: the panel says so where the comparison would
      // be, and asks for nothing (FR-025).
      comparison.closeFilePair();
      return;
    }
    if (tab !== 'files') {
      // The panel nobody has opened asks for nothing: what is already in hand
      // stays, so stepping back to it is instant.
      return;
    }
    // One request when there is one file to read, and it is the side that has
    // it: a name only the second copy ships is that copy's file, so asking for
    // the first side's absent path would read nothing at all.
    const [original, modified] = shared
      ? [row.leftPath, null]
      : row.leftPath === null
        ? [null, row.rightPath]
        : [row.leftPath, row.rightPath];
    if (
      comparison.fileStatus.value === 'ready' &&
      (comparison.leftFile.value?.file.sourceRelativePath ?? null) === original &&
      (comparison.rightFile.value?.file.sourceRelativePath ?? null) === modified
    ) {
      // Already open on these two: returning to the panel is not a new
      // selection, and re-requesting would drop the diff the reader left and
      // rebuild it — losing its scroll position for nothing.
      return;
    }
    // Neither a one-sided name nor a shared file is diffed — against an absent
    // side there is nothing to diff, and against itself nothing to show — so
    // the panel states what it is and reads it (T830, T831).
    void comparison.openFilePair(
      fileRequestFor(comparison.leftDetail.value, original),
      fileRequestFor(comparison.rightDetail.value, modified),
    );
  },
  { immediate: true },
);

/**
 * The compared-file switcher binding: choosing a file moves the `file`
 * coordinate, so the two sides are always the same file of the two copies. A
 * computed with a setter so the `<select>` binds with `v-model` and no event
 * handler reaches into the DOM for the chosen value.
 */
const fileSelection = computed({
  get: () => comparedFile.value ?? '',
  set: (name: string) => {
    void router.replace(
      pluginComparisonRouteFor(
        subjectName.value ?? '',
        currentLeftPath.value,
        currentRightPath.value,
        name,
      ),
    );
  },
});

/**
 * What one file option reads as: the name both copies give the file, and —
 * for one only a single copy ships — which copy that is, so the existence
 * difference is visible in the list itself. The empty option is the state the
 * page opens in, where the declarations are the whole comparison.
 */
function fileOptionLabel(row: {
  readonly name: string;
  readonly leftPath: string | null;
  readonly rightPath: string | null;
  readonly comparable: boolean;
}): string {
  const spelled = inlinePresentationLabel(row.name);
  const side =
    row.rightPath === null
      ? `${spelled} (first plugin only)`
      : row.leftPath === null
        ? `${spelled} (second plugin only)`
        : spelled;
  return row.comparable ? side : `${side} — not text this product can show`;
}

/**
 * The two sides of the open file pair once both are in hand, or null. The
 * paths are the adopted details' own, never the pending selection's: a
 * selection changes one render before the re-request drops this view, and
 * labelling one file's source with another's path would attribute content to
 * a file that does not hold it (FR-025).
 */
const openFilePair = computed(() => {
  const row = selectedFileRow.value;
  if (comparison.fileStatus.value !== 'ready' || row === null || selectedFileIsShared.value) {
    return null;
  }
  const left = comparison.leftFile.value?.file ?? null;
  const right = comparison.rightFile.value?.file ?? null;
  // A name only one copy ships is compared against that absence rather than
  // read alone: the existence difference is part of the comparison, and the
  // empty operand is diff arithmetic the diff labels as absent rather than a
  // fabricated empty file (FR-011).
  const present = row.leftPath === null ? right : left;
  if (row.leftPath === null || row.rightPath === null) {
    if (present === null || !isReadableFile(present)) {
      return null;
    }
    return {
      originalText: row.leftPath === null ? '' : present.sourceText,
      originalPath: row.leftPath ?? row.name,
      originalAbsent: row.leftPath === null,
      modifiedText: row.rightPath === null ? '' : present.sourceText,
      modifiedPath: row.rightPath ?? row.name,
      modifiedAbsent: row.rightPath === null,
    };
  }
  if (left === null || !isReadableFile(left) || right === null || !isReadableFile(right)) {
    // A copy this scan cannot show as text has no document to diff, which the
    // statement below says instead (FR-028).
    return null;
  }
  return {
    originalText: left.sourceText,
    originalPath: row.leftPath,
    modifiedText: right.sourceText,
    modifiedPath: row.rightPath,
  };
});

/**
 * The one file behind both carriers, once it is in hand: two catalogs naming
 * one directory offer one file rather than two copies of it, so the panel
 * reads it through the ordinary viewer instead of diffing it with itself. The
 * note above it is what says why there is no diff. Null while the read has
 * not settled, and for bytes this product cannot show as text (FR-028).
 */
const sharedFile = computed(() => {
  const row = selectedFileRow.value;
  if (row === null || comparison.fileStatus.value !== 'ready') {
    return null;
  }
  // One file to read: both carriers naming one directory, where a diff of a
  // file with itself would show nothing. A name only one copy ships is not
  // this case — that one is diffed against its stated absence (FR-011).
  if (!selectedFileIsShared.value) {
    return null;
  }
  const file = (comparison.leftFile.value ?? comparison.rightFile.value)?.file ?? null;
  return file !== null && isReadableFile(file) ? file : null;
});

/**
 * What the panel says beside a file only one copy ships: which plugin has it,
 * so the existence difference is stated where that copy is read. Null when
 * both copies ship the name, where the diff is the statement (T830, T831).
 */
const oneSidedFileNote = computed<string | null>(() => {
  const row = selectedFileRow.value;
  if (row === null || (row.leftPath !== null && row.rightPath !== null)) {
    return null;
  }
  const only = row.rightPath === null ? 'first' : 'second';
  return `Only the ${only} plugin ships this file: it is compared against the other copy's stated absence, which is the existence difference rather than an empty file.`;
});

/**
 * What the file pane says for the state it is in, or null while it is
 * showing a comparison. Its own statement beside the page's, because the file
 * pane fails alone (FR-028).
 */
const fileStateStatement = computed<string | null>(() => {
  const row = selectedFileRow.value;
  if (row === null) {
    // Either neither copy ships a file at all — the panel's own note says so
    // above — or the link names one no side ships, which is a dead coordinate
    // this states rather than replacing (FR-030).
    return fileRows.value.length === 0
      ? null
      : 'This link names a file neither compared plugin ships in the current scan. Choose one of the files above, or open the comparison again from a plugin row.';
  }
  if (!row.comparable) {
    return 'A copy of this file is not text this product can show, so there is nothing to compare. Each plugin’s own page states what was found.';
  }
  switch (comparison.fileStatus.value) {
    case 'stale': {
      // Two ways a copy resolves to nothing here, told apart by what the
      // committed inventory still holds: a file the scan no longer has, and a
      // file it has whose own row is another kind's — a plugin root that is
      // also an MCP carrier's or a permission policy's directory — where the
      // file detail is deliberately not the resource (contracts/http-api.md
      // § get-file-detail).
      const committed = new Set(
        (snapshot.value?.files ?? []).map((file) => file.sourceRelativePath),
      );
      const held = [row.leftPath, row.rightPath].filter((path) => path !== null);
      return held.every((path) => committed.has(path))
        ? 'A copy of this file is published under another kind’s row, which is where it is read; it is not compared here.'
        : 'One of these copies is no longer in the current scan. A rescan that brings it back will make this comparison resolve again.';
    }
    case 'failed':
      return comparison.fileErrorMessage.value === null
        ? 'This file comparison could not be loaded.'
        : `This file comparison could not be loaded. ${comparison.fileErrorMessage.value}`;
    case 'idle':
      return 'This file comparison could not be loaded.';
    case 'loading':
      return null;
    case 'ready':
      if (selectedFileIsShared.value) {
        // One file behind both carriers, read through the viewer above: the
        // sentence here is only for bytes no reader shows.
        return sharedFile.value === null
          ? 'This file is not text this product can show. The plugin’s own page states what was found.'
          : null;
      }
      if (openFilePair.value !== null) {
        // The diff is on screen, which is the statement.
        return null;
      }
      // A name only one copy ships is shown as that copy against the other's
      // stated absence, so the pair is what renders it and the only reason
      // there is none is bytes no reader shows (FR-011, FR-028). Judging this
      // case by {@link sharedFile} would announce unreadable bytes over a
      // rendered diff, since a one-sided name is never the shared file.
      return row.leftPath === null || row.rightPath === null
        ? 'This file is not text this product can show. The plugin’s own page states what was found.'
        : 'One of these copies is not text this product can show, so there is nothing to diff. Each plugin’s own page states what was found.';
  }
  return null;
});

/**
 * Whether the file pane's statement gets a retry: a failed or recoverable
 * request re-requests the same two copies, while a shared file, a one-sided
 * name, and a stale path describe what the scan holds, which no retry
 * changes.
 */
const fileRetryable = computed(
  () =>
    selectedFileRow.value?.comparable === true &&
    (comparison.fileStatus.value === 'failed' || comparison.fileStatus.value === 'idle'),
);

/** Re-requests the open file pair; the file pane's own retry. */
function retryFilePair(): void {
  const row = selectedFileRow.value;
  if (row === null) {
    return;
  }
  // Focus first: the button is inside the branch the retry replaces, so the
  // click that starts the request unmounts the element focus is on and the
  // reader would resume from the top of the document (WCAG 2.4.3).
  heading.value?.focus();
  void comparison.openFilePair(
    fileRequestFor(comparison.leftDetail.value, row.leftPath),
    fileRequestFor(comparison.rightDetail.value, selectedFileIsShared.value ? null : row.rightPath),
  );
}

/**
 * One side's file request: the path, and the carrier whose offering reached it
 * — the coordinates the plugin's own file function takes
 * (`plugin-comparison.ts` § PluginComparisonFileRequest). Null for a path this
 * side does not have, and null when the side's product is unknown, which
 * {@link pairFault} reports instead of comparing.
 */
function fileRequestFor(
  detail: PluginCarrierDetailDto | null,
  filePath: string | null,
): PluginComparisonFileRequest | null {
  if (detail === null || filePath === null) {
    return null;
  }
  const tool = toolForPath(detail.file.sourceRelativePath);
  return tool === null
    ? null
    : {
        filePath,
        carrier: {
          sourceRelativePath: detail.file.sourceRelativePath,
          tool,
          pluginName: subjectName.value,
        },
      };
}

/**
 * The compared plugin name as the heading shows it: the authored spelling
 * escaped for presentation, with an authored empty name given its own note.
 * Null while the URL carries no name, where the fault statement is the page.
 */
const subjectNameText = computed(() =>
  subjectName.value === null
    ? null
    : subjectName.value === ''
      ? '(empty name)'
      : pathPresentationLabel(subjectName.value),
);

/** Whether {@link subjectNameText} is the authored spelling rather than this product's note. */
const subjectNameIsAuthored = computed(
  () => subjectName.value !== null && subjectName.value !== '',
);

/**
 * What of each carrier the diff shows, for the sides' accessible names
 * (FR-025): the compared declaration, named by the row's subject through the
 * whitespace-safe spelling — an accessible name is a flat string.
 */
const diffContentLabel = computed(() => {
  const name =
    subjectName.value === null || subjectName.value === ''
      ? '(empty name)'
      : inlinePresentationLabel(subjectName.value);
  return `declaration ${name} of`;
});

/**
 * What one compared carrier is, beside its path: its Source family, its
 * recognized kind, and its read outcome. Every Source of this release is the
 * repository's. A catalog's detail carries a content-free file summary, which
 * has a size only when its bytes were read as text.
 */
function fileFacts(detail: PluginCarrierDetailDto): string {
  const facts = [
    'Repository',
    CUSTOMIZATION_KIND_TEXT.plugin,
    FILE_ENCODING_TEXT[detail.file.encoding],
  ];
  if (detail.file.encoding !== 'unknown') {
    facts.push(`${detail.file.sizeBytes} bytes`);
  }
  return facts.join(' · ');
}

/**
 * One side's recognizing products, on one line: each product whose carrier
 * the row lists at that path, with the surfaces its admission rests on
 * (FR-009 — naming a surface never claims it loaded the file).
 *
 * One line rather than a row per tool: both sides' recognitions are facts
 * about the carrier file each side is, so the two lines already say which
 * products read which side, and a table of two states per tool would spend
 * three rows saying what two lines say.
 */
function attributionText(path: string): string {
  return (owningRow.value?.carriers ?? [])
    .filter((carrier) => carrier.sourceRelativePath === path)
    .map(
      (carrier) =>
        `${SUPPORTED_TOOL_TEXT[carrier.tool]} (${carrier.surfaces
          .map((surface) => VENDOR_SURFACE_TEXT[surface])
          .join(', ')})`,
    )
    .join(' · ');
}

/**
 * The document one carrier declares this plugin with, or null when this
 * carrier holds none of it.
 *
 * A catalog declares the plugin in one entry, which serializes to canonical
 * JSON exactly as every other kind's declared metadata does (research.md
 * § 7). A manifest declares its plugin with its whole content and is strict
 * JSON already, so the file is the document: re-serializing what the detail
 * deliberately does not parse would put the same document one round trip
 * further from what the author wrote (api-types.ts § PluginManifestDetailDto).
 * Null for an extraction that failed, for a catalog that offers this name
 * nowhere, and for a manifest whose bytes are not text this product can show
 * — none of which is a document to diff (FR-028).
 */
function declarationTextOf(detail: PluginCarrierDetailDto): string | null {
  if (detail.carrier === 'manifest') {
    return isReadableFile(detail.file) ? detail.file.sourceText : null;
  }
  const declared = (detail.plugins ?? []).find((plugin) => plugin.name === subjectName.value);
  return declared === undefined ? null : canonicalDeclaredEntriesJsonText(declared.fields);
}

/**
 * The whole ready view as one derivation, null outside 'ready': the two
 * sides, each with its identity and its declaration document. One computed
 * rather than one per projection, so the authored content it holds is
 * released together on the next read.
 *
 * Every rendered coordinate is the adopted detail's own path, never the
 * pending-aware picker coordinate: a pick updates the coordinates one render
 * before the re-request drops this view, and labelling the old details with
 * the new paths would put one carrier's declared values — credentials
 * included — under another carrier's name for that frame (FR-025, FR-030).
 */
const readyView = computed(() => {
  if (status.value !== 'ready' || subjectName.value === null) {
    return null;
  }
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  if (left === null || right === null) {
    return null;
  }
  const leftText = declarationTextOf(left);
  const rightText = declarationTextOf(right);
  if (leftText === null || rightText === null) {
    // A side with no document is stated rather than diffed against an empty
    // one, which would read as a declaration that says nothing (FR-028).
    return null;
  }
  const sideOf = (
    caption: string,
    detail: PluginCarrierDetailDto,
    declarationText: string,
  ): PluginComparisonSide => {
    // A catalog listing one name twice offers it twice, and the pair being
    // compared is one of them: the count is stated rather than the second
    // offering being dropped without a word.
    const declarations =
      detail.carrier === 'catalog'
        ? (detail.plugins ?? []).filter((plugin) => plugin.name === subjectName.value).length
        : 1;
    return {
      caption,
      path: detail.file.sourceRelativePath,
      carrierText: PLUGIN_CARRIER_TEXT[detail.carrier],
      factsText: fileFacts(detail),
      recognitionText: attributionText(detail.file.sourceRelativePath),
      readingText: readingTextOf(detail.file.sourceRelativePath),
      declarationText,
      duplicateNote:
        declarations > 1
          ? `This catalog declares this plugin ${declarations} times; the first declaration is compared here, and the plugin's own page shows them all.`
          : null,
    };
  };
  return {
    sides: [sideOf('First file', left, leftText), sideOf('Second file', right, rightText)] as [
      PluginComparisonSide,
      PluginComparisonSide,
    ],
    hasManifestSide: left.carrier === 'manifest' || right.carrier === 'manifest',
  };
});

/**
 * Whether the pair is adopted but one side has no document to compare — the
 * one ready state that is not a comparison, so the page says what it holds
 * instead of showing an empty side (FR-028).
 */
const documentMissing = computed(
  () => status.value === 'ready' && readyView.value === null && pairFault.value === null,
);

/**
 * What this page says for the state it is in — one value read by both the
 * visible copy and the live region, so what a reader hears is the sentence on
 * the screen (WCAG 4.1.3). A link fault outranks the request status.
 */
const stateStatement = computed<string | null>(() => {
  const fault = pairFault.value;
  if (fault !== null) {
    return fault;
  }
  if (documentMissing.value) {
    return 'A file this link names holds no readable declaration of this plugin in the current scan, so there is nothing to compare. Its own page states what was found there.';
  }
  switch (status.value) {
    case 'stale':
      return 'No plugin carrier in the current scan sits at one of this link’s paths. The inventory may have changed since the link was made; a rescan that brings the file back will make it resolve again.';
    case 'failed':
      return comparison.errorMessage.value === null
        ? 'This comparison could not be loaded.'
        : `This comparison could not be loaded. ${comparison.errorMessage.value}`;
    case 'idle':
      return 'This comparison could not be loaded.';
    case 'loading':
    case 'ready':
      return null;
  }
  return null;
});

/**
 * What the polite live region announces; see {@link stateStatement}.
 * 'loading' and 'ready' announce themselves: a reader stepping the pickers
 * holds focus on a select, so without a completion phrase nothing would say
 * the comparison behind it changed (WCAG 4.1.3).
 */
const announcement = computed(() => {
  if (stateStatement.value !== null) {
    return stateStatement.value;
  }
  if (status.value === 'loading') {
    return 'Loading this comparison…';
  }
  if (status.value !== 'ready') {
    return '';
  }
  // The manifests and the compared file are their own requests, each with its
  // own outcome: a live region announces what changed, so a failure or a wait
  // in either would otherwise leave the sentence identical and be announced
  // nowhere — and the panel it happened on may not be the one in view
  // (WCAG 4.1.3).
  const parts = [
    'Comparison ready.',
    comparison.manifestStatus.value === 'loading'
      ? 'Loading the manifests…'
      : (manifestStatement.value ?? ''),
    activeTab.value === 'files' || comparison.fileStatus.value !== 'idle'
      ? comparison.fileStatus.value === 'loading'
        ? 'Loading this file comparison…'
        : (fileStateStatement.value ?? '')
      : '',
  ];
  return parts.filter((part) => part !== '').join(' ');
});

/**
 * Whether the failed statement gets a retry: 'failed' and the recoverable
 * 'idle' both re-request the same selection, while a link fault, 'stale', and
 * a missing document describe what the scan holds, which no retry changes.
 */
const retryable = computed(
  () =>
    pairFault.value === null &&
    !documentMissing.value &&
    (status.value === 'failed' || status.value === 'idle'),
);

/** The ready view's own region; what the focus guard below watches. */
const readyRegion = ref<HTMLElement | null>(null);

/** The error/state statement's region; watched by the same focus guard. */
const stateRegion = ref<HTMLElement | null>(null);

/** The pickers' region; what the pickers focus guard below watches. */
const pickersRegion = ref<HTMLElement | null>(null);

/** The failed statement's retry button; what the retry focus guard watches. */
const retryButton = ref<HTMLButtonElement | null>(null);

/** Set as the route is left, so the focus guards yield to the next route. */
let leaving = false;

// A generation replacement drops the ready view while keyboard focus may be
// inside it, and the unmount would silently drop focus to the document body
// (WCAG 2.4.3). Synchronous, because after the patch the focused element is
// already gone; scoped to the regions rather than the page, so a pick never
// yanks focus off the picker the reader is operating.
watch(
  status,
  (next) => {
    if (leaving) {
      return;
    }
    const leavesReadyRegion =
      next !== 'ready' && readyRegion.value?.contains(document.activeElement) === true;
    const leavesStateRegion =
      (next === 'loading' || next === 'ready') &&
      stateRegion.value?.contains(document.activeElement) === true;
    if (leavesReadyRegion || leavesStateRegion) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The same rescue for the pickers themselves: a committed generation can take
// the population away and unmount the very select the reader is operating
// (WCAG 2.4.3).
watch(
  pickersAvailable,
  (available) => {
    if (!available && !leaving && pickersRegion.value?.contains(document.activeElement) === true) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The retry button is its own case: only a fault's flip removes it, which the
// status guard above cannot see (WCAG 2.4.3).
watch(
  retryable,
  (can) => {
    if (!can && !leaving && retryButton.value === document.activeElement) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

/**
 * Re-requests the selection the URL names; the failed state's retry. Focus
 * moves to the heading first, because the button this click came from
 * unmounts with the failed branch the moment the state returns to loading
 * (WCAG 2.4.3).
 */
function retryOpen(): void {
  heading.value?.focus();
  const leftTool = toolForPath(currentLeftPath.value);
  const rightTool = toolForPath(currentRightPath.value);
  if (leftTool === null || rightTool === null) {
    return;
  }
  void comparison.open(
    subjectName.value ?? '',
    currentLeftPath.value,
    leftTool,
    currentRightPath.value,
    rightTool,
  );
}

onMounted(() => {
  // Arriving from the inventory: the shell is already mounted, so nothing
  // else places focus, and this page's own mount is the moment its heading
  // exists (WCAG 2.4.3).
  heading.value?.focus();
});

/**
 * What the document title says this page is showing (WCAG 2.4.2): the
 * comparison, or the state that replaced it.
 */
const titleSubject = computed<string>(() => {
  if (pairFault.value !== null) {
    return hasSelection.value
      ? 'Link names no comparable declarations'
      : 'Link names no comparison';
  }
  if (documentMissing.value) {
    return 'Nothing to compare';
  }
  switch (status.value) {
    case 'ready':
    case 'loading':
      return 'Comparing plugins';
    case 'stale':
      return 'Link not in this scan';
    case 'failed':
    case 'idle':
      return 'Comparison could not be loaded';
  }
  return 'Comparing plugins';
});
watchEffect(() => {
  // Reported as this page instance's own, so an outgoing page's unmount
  // cannot erase what this page just titled the tab with
  // (`SessionViewState.reportPageSubject`).
  pageOwnership.reportSubject(titleSubject.value);
});

onBeforeUnmount(() => {
  // Before the close, whose status change would otherwise trip the focus
  // guard while the next route owns focus.
  leaving = true;
  // Leaving the route drops the declarations this page requested; the title
  // subject is `usePageOwnership`'s to release, after unmount, where a
  // replacement page's own report stands.
  comparison.close();
});
</script>

<template>
  <div class="aci-plugin-compare">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the plugin
         list rather than the kind order's default tab. -->
    <p><NuxtLink :to="inventoryRoute">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">Compare plugins</h2>

    <!-- The comparison's subject: the plugin name whose row owns it, in the
         carriers' own spelling (FR-007) — the same heading rule its
         inventory row uses. -->
    <p
      v-if="subjectNameText !== null && pairFault === null"
      class="aci-plugin-compare__name"
      :class="subjectNameIsAuthored ? 'aci-authored-text' : 'aci-muted'"
    >
      {{ subjectNameText }}
    </p>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read
         (WCAG 4.1.3). -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>

    <!-- The pickers: a comparison stays inside the one row that owns it, so
         what a reader chooses is which of that row's carriers stands on each
         side. Native selects, each labelled through `for`/`id`
         (WCAG 2.4.6). -->
    <div v-if="pickersAvailable" ref="pickersRegion" class="aci-plugin-compare__pickers">
      <div class="aci-plugin-compare__picker">
        <label for="aci-plugin-compare-first">First plugin file</label>
        <select id="aci-plugin-compare-first" v-model="leftSelection">
          <!-- The other side's file is unselectable — the two sides would
               hold one file (FR-011). -->
          <option
            v-for="path in comparablePaths"
            :key="path"
            :value="path"
            :disabled="path !== currentLeftPath && path === currentRightPath"
          >
            {{ inlinePresentationLabel(path) }}
          </option>
        </select>
      </div>
      <div class="aci-plugin-compare__picker">
        <label for="aci-plugin-compare-second">Second plugin file</label>
        <select id="aci-plugin-compare-second" v-model="rightSelection">
          <option
            v-for="path in comparablePaths"
            :key="path"
            :value="path"
            :disabled="path !== currentRightPath && path === currentLeftPath"
          >
            {{ inlinePresentationLabel(path) }}
          </option>
        </select>
      </div>
    </div>

    <!-- The ready view leads the branch chain so its one bundled projection
         is evaluated on every render (see readyView). One wrapper, so the
         focus guard can ask whether focus is inside the region a generation
         replacement unmounts. -->
    <div v-if="readyView !== null" ref="readyRegion">
      <!-- The same strip every other surface uses, down to its classes and
           its roving tabindex: two subjects, and a reader who knows one strip
           knows this one (QR-004, contracts/accessibility-acceptance.md). -->
      <div class="aci-kind-tabs" role="tablist" aria-label="Plugin comparison">
        <button
          v-for="(tab, index) in COMPARE_TABS"
          :id="compareTabId(tab)"
          :key="tab"
          class="aci-kind-tab"
          type="button"
          role="tab"
          :aria-controls="comparePanelId(tab)"
          :aria-selected="tab === activeTab"
          :tabindex="tab === activeTab ? 0 : -1"
          @click="activeTab = tab"
          @keydown="onTabKeydown($event, index)"
        >
          {{ COMPARE_TAB_TEXT[tab] }}
          <span v-if="tab === 'files'" class="aci-kind-count">{{ fileRows.length }}</span>
        </button>
      </div>

      <!-- Both panels stay in the document and the unselected one is hidden,
           so the diff behind the strip keeps its scroll and its models across
           a switch. -->
      <div
        v-show="activeTab === 'declaration'"
        :id="comparePanelId('declaration')"
        role="tabpanel"
        :aria-labelledby="compareTabId('declaration')"
        tabindex="0"
      >
        <RecognitionComparison
          :sides="readyView.sides"
          :content-label="diffContentLabel"
          :has-manifest-side="readyView.hasManifestSide"
        >
          <template #manifest>
            <!-- Each plugin's own manifest, beside the entries that offer it —
                 the pairing the detail page shows for one plugin, shown here
                 for two. -->
            <section>
              <h3>Manifest</h3>
              <!-- Where each plugin's own declaration of itself sits, named
                   before it is shown: two copies of one plugin keep their
                   manifests at two paths, and a diff with no paths would not
                   say which file either half is. -->
              <div class="aci-plugin-compare__roots">
                <section v-for="side in manifestSides" :key="side.caption">
                  <h4>{{ side.caption }}</h4>
                  <p v-if="side.path !== null" class="aci-path aci-authored-text">
                    {{ pathPresentationLabel(side.path) }}
                  </p>
                  <!-- What the absence is, for the reason the plugin's own
                       page states it that way: an offering that names a place
                       outside this repository names no directory here to hold
                       a manifest. -->
                  <p v-else-if="side.root !== null" class="aci-note">
                    This scan holds no manifest inside
                    <span class="aci-path aci-authored-text">{{
                      pathPresentationLabel(side.root)
                    }}</span
                    >, which is what this offering names.
                  </p>
                  <p v-else-if="side.sourceForm !== null" class="aci-note">
                    This offering names {{ PLUGIN_SOURCE_FORM_TEXT[side.sourceForm] }}, so this scan
                    holds none of this plugin's own files.
                    <template v-if="side.sourceForm === 'repository-directory'">
                      No directory this scan can enumerate follows from what it writes.
                    </template>
                  </p>
                  <p v-else class="aci-note">This scan holds no manifest for this plugin.</p>
                </section>
              </div>
              <p
                v-if="manifestStatement !== null"
                :class="manifestRetryable ? 'aci-error' : 'aci-note'"
              >
                {{ manifestStatement }}
              </p>
              <p v-if="manifestRetryable">
                <button type="button" @click="retryManifestPair">Try again</button>
              </p>
              <SourceViewer
                v-if="sharedManifest !== null"
                :source-text="sharedManifest.sourceText"
                :source-relative-path="sharedManifest.sourceRelativePath"
                :register-content-owner="registerComparisonContentOwner"
              />
              <SourceDiff v-else-if="manifestPair !== null" v-bind="manifestPair" />
              <p v-else-if="comparison.manifestStatus.value === 'loading'" class="aci-empty">
                Loading this manifest comparison…
              </p>
            </section>
          </template>
        </RecognitionComparison>
      </div>

      <div
        v-show="activeTab === 'files'"
        :id="comparePanelId('files')"
        role="tabpanel"
        :aria-labelledby="compareTabId('files')"
        tabindex="0"
      >
        <!-- Which directory each side of a file comparison comes from, at the
             top of the panel the way the declaration panel heads its two
             carriers: the names below are names inside these two roots. -->
        <div class="aci-plugin-compare__roots">
          <section v-for="side in rootSides" :key="side.caption">
            <h3>{{ side.caption }}</h3>
            <p v-if="side.root !== null" class="aci-path aci-authored-text">
              {{ pathPresentationLabel(side.root) }}
            </p>
            <p v-else class="aci-note">
              This carrier's offering names no directory in this repository, so this side ships no
              file.
            </p>
            <p class="aci-note">
              declared in
              <span class="aci-path aci-authored-text">{{
                pathPresentationLabel(side.carrierPath)
              }}</span>
            </p>
          </section>
        </div>

        <p v-if="fileRows.length === 0" class="aci-note">
          There is no file to compare: neither plugin's directory holds one in this scan, and an
          offering whose `source` names no directory here ships none.
        </p>
        <template v-else>
          <!-- The compared file: the two sides are always the same file of
               the two copies, so what a reader chooses is which one — the
               same switcher motion the skill comparison uses to step through
               one name's files. A file only one copy ships says so in its own
               label, and choosing it shows the present content against its
               stated absence. -->
          <div class="aci-plugin-compare__pickers">
            <div class="aci-plugin-compare__picker">
              <label for="aci-plugin-compare-file">Compared file</label>
              <select id="aci-plugin-compare-file" v-model="fileSelection">
                <option v-for="row in fileRows" :key="row.name" :value="row.name">
                  {{ fileOptionLabel(row) }}
                </option>
              </select>
            </div>
          </div>

          <!-- The compared file's own section, headed at the level the two
               root sections above use: the diff's fallback captions are `h4`,
               and without a heading of their own they would read as belonging
               to the second plugin's section (WCAG 1.3.1). -->
          <section class="aci-plugin-compare__file">
            <h3>File comparison</h3>
            <!-- One directory behind both carriers is one file: the note says so
               and the file is read through the ordinary viewer, because a
               diff of a file with itself shows a reader nothing. -->
            <p v-if="selectedFileIsShared" class="aci-note">
              Both carriers name one directory, so this is one file rather than two copies of it.
            </p>
            <p v-else-if="oneSidedFileNote !== null" class="aci-note">{{ oneSidedFileNote }}</p>
            <SourceViewer
              v-if="sharedFile !== null"
              :source-text="sharedFile.sourceText"
              :source-relative-path="sharedFile.sourceRelativePath"
              :register-content-owner="registerComparisonContentOwner"
            />
            <SourceDiff v-else-if="openFilePair !== null" v-bind="openFilePair" />
            <p v-else-if="comparison.fileStatus.value === 'loading'" class="aci-empty">
              Loading this file comparison…
            </p>
            <template v-else-if="fileStateStatement !== null">
              <p :class="fileRetryable ? 'aci-error' : 'aci-note'">{{ fileStateStatement }}</p>
              <p v-if="fileRetryable">
                <button type="button" @click="retryFilePair">Try again</button>
              </p>
            </template>
          </section>
        </template>
      </div>
    </div>

    <template v-else-if="status === 'loading'">
      <p class="aci-empty">Loading this comparison…</p>
    </template>

    <!-- One wrapper for the statement view too, so the focus guard can ask
         whether focus sits on a control an automatic refresh is about to
         unmount (WCAG 2.4.3). -->
    <div v-else-if="stateStatement !== null" ref="stateRegion">
      <p :class="retryable ? 'aci-error' : 'aci-note'">{{ stateStatement }}</p>
      <p v-if="retryable">
        <button ref="retryButton" type="button" @click="retryOpen">Try again</button>
      </p>
      <p>
        <NuxtLink :to="inventoryRoute"
          >Return to the inventory and open a comparison from a plugin row.</NuxtLink
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.aci-plugin-compare {
  display: flex;
  flex-direction: column;
}

.aci-plugin-compare > p:first-child {
  margin: 0;
}

/* The compared name reads as the page's subject, one step below the
   heading. */
.aci-plugin-compare__name {
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
}

/* The two roots side by side, stacking on a narrow viewport where two columns
   would crush both (WCAG 1.4.10) — the declaration panel's own arrangement. */
.aci-plugin-compare__roots {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
  margin-block: 0.75rem;
}

@media (min-width: 52rem) {
  .aci-plugin-compare__roots {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-plugin-compare__roots h3 {
  font-size: 1rem;
  margin: 0 0 0.25rem;
}

.aci-plugin-compare__roots p {
  margin: 0 0 0.25rem;
}

.aci-plugin-compare__pickers {
  display: grid;
  gap: 0.5rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  margin-block-end: 0.75rem;
}

@media (min-width: 52rem) {
  .aci-plugin-compare__pickers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-plugin-compare__picker {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* A select is sized by its widest option, and a plugin's file names are as
   long as its directories happen to be: without this cap one of them widens
   the page and the reader scrolls sideways to read anything (WCAG 1.4.10). */
.aci-plugin-compare__picker select {
  max-inline-size: 100%;
}

.aci-plugin-compare__file {
  margin-block-start: 0.75rem;
}

.aci-plugin-compare__file > h3 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}
</style>
