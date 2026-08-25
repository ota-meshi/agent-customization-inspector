<script setup lang="ts">
// The Codex plugin carrier detail route (T773): one plugin of one carrier,
// addressed by the carrier's own path with the plugin the reader followed and
// the file they have open named in the query —
// `/plugins/<source-relative path>?plugin=<name>&file=<source-relative path>`.
//
// The plugin is the subject, not the file. A catalog resolves many plugin names
// to the sources they come from, so the page publishes the entry the reader
// followed and the catalog's own `name` and `interface` beside it — never the
// file's bytes, which would put every other plugin the catalog lists on a
// screen about one, exactly as an MCP carrier's detail withholds its own.
//
// The plugin and its files are two tabs, the arrangement the skill detail uses:
// a plugin *is* its root, so what the plugin declares and the files it ships
// are two subjects, and stacking them left the files below everything the
// offering declares. The page opens on the plugin itself — the catalog entry
// that offers it, and the plugin's own manifest, which is its declaration of
// itself where the entry is one file's statement about it — exactly as the
// skill detail opens on what its `SKILL.md` declares. The manifest is read
// here rather than linked to as a page of its own: it is one of the files the
// plugin ships, and none of them is a customization with a page
// (contracts/inspection-path-allowlist.md § Bounded companion census).
//
// The host answers for one row, so the plugin name is part of the request
// rather than a filter applied to what came back. A step between two plugins
// of one catalog is therefore a new request, exactly as a step between two
// files is; selecting another of one plugin's files is not, and keeps the
// declarations already in hand.
//
// The declared values are the file's literals. A credential stays the
// characters that were written and an environment reference is never resolved
// (FR-026), and nothing the manifest points at is opened: `skills`,
// `mcpServers`, `apps`, `hooks`, and asset paths are declarations there and
// reach no read (`codex.excluded.plugin-files`). Nothing on this page claims
// the plugin is installed, enabled, trusted, or loaded — all four are User
// state this product never reads (FR-009).
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';
import { NuxtLink } from '#components';
import OpenFileButton from '../../components/inspection/OpenFileButton.vue';
import DirectoryFileTree from '../../components/inspection/DirectoryFileTree.vue';
import SourceViewer from '../../components/inspection/SourceViewer.vue';
import { declaredEntriesJsonText } from '../../components/declared-entries-json';
import {
  decodeDetailRoutePath,
  fromJsonStringBody,
  selectedFileOf,
} from '../../components/detail-route';
import { pluginCarrierDetailRoute } from '../../components/plugin-detail-route';
import { pluginComparisonRouteFor } from '../../composables/plugin-comparison';
import { nextTabForKey } from '../../components/tab-navigation';
import { usePageOwnership } from '../../composables/page-ownership';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import { PLUGIN_CARRIER_TEXT, PLUGIN_SOURCE_FORM_TEXT } from '../../../shared/api-text';
import type { PluginSourceForm } from '../../../shared/api-types';
import type { CustomizationKind, SupportedTool } from '../../../shared/entities';
import {
  CUSTOMIZATION_KIND_ORDER,
  CUSTOMIZATION_KIND_TEXT,
  SUPPORTED_TOOL_ORDER,
  isSupportedTool,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
  rendersNothingVisible,
} from '../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats rendering a detail page with no
  // session behind it.
  throw new Error('the session view state was not provided by the shell');
}

const route = useRoute();

/**
 * The carrier's Source-relative path from the URL's catch-all segments — the
 * file's identity and half the route identity (FR-030). The segments arrive
 * decoded but still spelled as the well-formed text the link carried, so the
 * escape the encoder applied is undone here (`detail-route.ts`).
 */
const carrierPath = computed((): string => {
  const parameter = route.params['path'];
  return decodeDetailRoutePath(typeof parameter === 'string' ? [parameter] : (parameter ?? []));
});

/**
 * The plugin the reader followed, or null when the link named none — the row
 * that resolves no plugin name at all. Decoded the way the link encoded it, so
 * a declared name that is not well-formed UTF-16 round-trips to its own
 * selection (`plugin-detail-route.ts`).
 */
const openPluginName = computed((): string | null => {
  const parameter = route.query['plugin'];
  return typeof parameter === 'string' ? fromJsonStringBody(parameter) : null;
});

/**
 * The file of this plugin the URL selects, or null when it selects none — a
 * link from the inventory, which names the plugin and lets the page open on
 * the plugin's own manifest.
 */
const selectedFile = computed((): string | null => selectedFileOf(route.query['file']));

const pluginDetail = sessionViewState.pluginDetail;
// The plugin's own manifest, in the slot a skill's entry point uses: it is what
// the plugin panel shows beside the offering, and it stays there while the
// reader steps through the other files in the files panel.
const manifestDetail = sessionViewState.pluginManifestFile;
// The selected file's own detail: a file the plugin ships carries no
// recognition, so it is served by the file detail every unrecognized file is,
// in the slot a skill's selected file uses.
const selectedFileDetail = sessionViewState.pluginOpenFile;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
/** The manifest slot's own failed request, reported where the manifest is shown. */
const manifestError = sessionViewState.entryDetailError;
const snapshot = sessionViewState.snapshot;

/** The kind's own caption, for the heading and the recognition line. */
const kindText = CUSTOMIZATION_KIND_TEXT.plugin;

/** The inventory link that lands on the plugins tab rather than the default. */
const inventoryRoute = '/?kind=plugin';

/**
 * The inventory carriers the URL's path names, with the row each belongs to —
 * empty when the committed inventory holds none there. Resolved from the
 * snapshot rather than from the fetched detail because they carry the
 * recognizing product and the surfaces this page states, and a path the
 * inventory does not list is a dead link reportable without a doomed request.
 */
const owner = computed(() =>
  (snapshot.value?.plugins ?? []).flatMap((entry) =>
    entry.carriers
      .filter((carrier) => carrier.sourceRelativePath === carrierPath.value)
      .map((carrier) => ({ name: entry.name, carrier })),
  ),
);

/**
 * The product whose reading this page shows: the one the link named, or — for a
 * link that named none — the first carrier of this row at this path in the
 * closed tool order.
 *
 * A carrier is one `(file, tool)` pair, so which product is asked decides the
 * plugin root, the source form, and the manifest forms the page states
 * (`api-types.ts` § PluginCarrierDetailParams.tool). Every link this product
 * renders names one; the fallback is for a link written before, or by hand,
 * and the page says which product it settled on rather than answering silently.
 *
 * Null while the snapshot holds no carrier at this path, where there is nothing
 * to ask and {@link carrierResolved} already reports the link.
 */
const openTool = computed((): SupportedTool | null => {
  const named = route.query['tool'];
  if (typeof named === 'string' && isSupportedTool(named)) {
    return named;
  }
  for (const tool of SUPPORTED_TOOL_ORDER) {
    if (owner.value.some(({ carrier }) => carrier.tool === tool)) {
      return tool;
    }
  }
  return null;
});

/** Whether the link named the product whose reading the page is showing. */
const toolNamedByLink = computed(() => {
  const named = route.query['tool'];
  return typeof named === 'string' && isSupportedTool(named);
});

/**
 * How the page states whose reading it shows. A carrier every product reads is
 * three carriers of one row, each with its own root and manifest, so the
 * sentence names the one this page answers for — and says so plainly when the
 * link left it unsaid.
 */
const readingText = computed(() => {
  const tool = openTool.value;
  if (tool === null) {
    return '';
  }
  return toolNamedByLink.value
    ? `Read as ${SUPPORTED_TOOL_TEXT[tool]} reads this carrier`
    : `Read as ${SUPPORTED_TOOL_TEXT[tool]} reads this carrier; the link named no product`;
});

/** Whether the committed inventory lists this file as a plugin carrier at all. */
const carrierListed = computed(() => owner.value.length > 0);

/**
 * The Source-relative Path of every file the committed generation holds, so a
 * tree never offers an entry that cannot be opened.
 */
const committedPaths = computed(
  () => new Set((snapshot.value?.files ?? []).map((file) => file.sourceRelativePath)),
);

/**
 * The row the query names, or null when the committed inventory holds none.
 * The row is what this page is about: its carriers, and the files of the plugin
 * roots those carriers reach.
 */
const row = computed(
  () =>
    (snapshot.value?.plugins ?? []).find((entry) => entry.name === openPluginName.value) ?? null,
);

/**
 * The roots this carrier's own declarations named for the open row, or empty
 * while the declarations are not in hand.
 *
 * One row can list two catalogs — two files can each declare a marketplace of
 * the same name — and they need not offer the plugin from one directory. The
 * row's files are the union, because the row is the name; this page shows one
 * carrier, so it shows what that carrier's offering reached.
 */
const carrierRoots = computed((): readonly string[] => {
  const detail = openDetail.value;
  if (detail === null) {
    return [];
  }
  if (detail.carrier === 'manifest') {
    // A manifest declares the one plugin the folder holding it is, so its root
    // is the carrier's own answer rather than an entry's.
    return detail.pluginRoot === '' ? [] : [detail.pluginRoot];
  }
  const roots: string[] = [];
  for (const declaration of detail.plugins ?? []) {
    if (declaration.pluginRoot !== null && !roots.includes(declaration.pluginRoot)) {
      roots.push(declaration.pluginRoot);
    }
  }
  return roots;
});

/**
 * The directories this carrier's offering names, as the one authored phrase
 * the manifest note points at. An offering of one name may name two, so the
 * note lists what it named rather than choosing between them.
 */
const namedRootsText = computed(() =>
  carrierRoots.value.map((root) => pathPresentationLabel(root)).join(' and '),
);

/**
 * The files this carrier's offering ships that the open generation still holds.
 * The row publishes every path the scan enumerated below the roots its
 * offerings named; a path the current commit no longer carries is dropped, so
 * the tree can offer no file this generation cannot serve (FR-030).
 */
const rowFiles = computed(() => {
  // This carrier's own list, as the census under its offering's directory
  // produced it (`api-types.ts` § PluginCarrierDto.files). A manifest carrier
  // is a file of the plugin as well as the thing that declares it, the way a
  // skill's `SKILL.md` is, and it is in that list, so the tree and the row's
  // count are the same fact.
  // This carrier and no other: the open row's, at this path, as the product
  // this page answers for reads it. One catalog offers many plugins, each
  // row's carrier lists the files that row's own offering reached, and two
  // products reading one catalog can reach different files from it — the
  // source forms they document are not the same set.
  const reached = new Set(
    (row.value?.carriers ?? [])
      .filter(
        (carrier) =>
          carrier.sourceRelativePath === carrierPath.value && carrier.tool === openTool.value,
      )
      .flatMap((carrier) => carrier.files),
  );
  return [...reached].filter((path) => committedPaths.value.has(path)).toSorted();
});

/** The open detail once it is this carrier's; a slow previous one never renders here. */
const openDetail = computed(() => {
  const detail = pluginDetail.value;
  return detail !== null && detail.file.sourceRelativePath === carrierPath.value ? detail : null;
});

/**
 * The plugin's own manifest among the files it ships, or null when this scan
 * holds none — a root that ships no manifest, and every offering whose source
 * names no directory here.
 *
 * The declaration answers where it is, because which file inside a root a
 * client reads as the plugin's own declaration is that vendor's contract
 * (`api-types.ts` § PluginDeclarationDto.manifestPaths). It is kept only when
 * the generation holds a file there, the way the tree keeps its own entries.
 */
const manifestFile = computed((): string | null => {
  const detail = openDetail.value;
  if (detail === null) {
    return null;
  }
  if (detail.carrier === 'manifest') {
    // The carrier *is* the manifest: this page is open at its path, so there is
    // nothing to look up and nothing to drop — the file is committed by virtue
    // of having been served.
    return detail.file.sourceRelativePath;
  }
  for (const declaration of detail.plugins ?? []) {
    // The documented forms in the vendor's own order: the first one this
    // generation actually holds is the manifest, because nothing named them by
    // probing the filesystem.
    for (const path of declaration.manifestPaths) {
      if (rowFiles.value.includes(path)) {
        return path;
      }
    }
  }
  return null;
});

/**
 * The file this page shows: the one the URL selects, or — for a link that
 * selects none — the plugin's own manifest, falling back to the first file it
 * ships when the root carries no manifest. Null while the row ships nothing
 * here, where there is no file to show at all.
 *
 * Opening on the manifest is what makes the page show the plugin rather than
 * the offering: the catalog entry beside it is one file's statement about the
 * plugin, and the manifest is the plugin's own.
 */
const openFilePath = computed((): string | null => {
  // Nothing until the declaration is in hand: which files this carrier's plugin
  // ships is the root its offering named, and which of them is the manifest is
  // the declaration's own answer. Reading the URL's selection before that would
  // open a file on the strength of the query alone — the dead-link case reads
  // as a file of the plugin — and picking the row's first file would read a
  // file this page then replaces, since the manifest is not always first in
  // sort order.
  if (openDetail.value === null) {
    return null;
  }
  if (selectedFile.value !== null) {
    return rowFiles.value.includes(selectedFile.value) ? selectedFile.value : null;
  }
  return manifestFile.value ?? rowFiles.value[0] ?? null;
});

/**
 * Whether the committed inventory holds the carrier and plugin the link names:
 * the path is one of the row's carriers, and the query names a plugin that
 * carrier declares. A link naming no plugin resolves only against the row that
 * resolves no name — the one that closes the list — because that row is a real
 * row of the inventory rather than a page every carrier also answers under.
 *
 * The snapshot answers this on its own, which is what makes it the gate on the
 * request rather than {@link linkResolved}: the files a plugin ships come from
 * the declarations that request serves, so gating on those would leave a link
 * that names one waiting for a request it had itself prevented.
 */
const carrierResolved = computed(() =>
  owner.value.some(
    ({ name, carrier }) => name === openPluginName.value && carrier.tool === openTool.value,
  ),
);

/**
 * Whether the link resolves: its carrier and plugin are ones the inventory
 * holds, and — when it selects a file — that file is one this plugin ships. A
 * `file` query naming anything else is a dead link rather than a file to open
 * under this plugin's heading.
 *
 * A selection is neither resolved nor dead until the declarations are in hand,
 * and reads as resolved there: the page is waiting on the request that decides
 * it, and reporting a dead link in the meantime would state an outcome this
 * page cannot yet know — on every link that names a file, since none of them
 * has an answer before the carrier's own declarations arrive.
 */
const linkResolved = computed(
  () =>
    carrierResolved.value &&
    (selectedFile.value === null ||
      openDetail.value === null ||
      rowFiles.value.includes(selectedFile.value)),
);

/**
 * The directory the plugin's file tree is rooted at: the root this carrier's
 * declaration named, so every row below it reads as a name inside the plugin.
 * Empty when the row ships nothing here.
 *
 * The declared root rather than a prefix shared by the files: a plugin shipping
 * only its manifest shares `<root>/.codex-plugin/` with itself, and a tree
 * rooted there would show `plugin.json` as the whole plugin.
 *
 * Two entries of one name may name two directories, and the tree strips the
 * directory it is rooted at from every path it draws. Rooted at one of two, a
 * file under the other would be drawn as whatever tail it happens to share
 * with that root — `one/two/file.txt` and `two/file.txt` as one row named
 * `two/file.txt`. What they share is what every path can be shown relative to,
 * which for unrelated roots is the Source root and full paths.
 */
const treeDirectory = computed(() => {
  const [first, ...rest] = carrierRoots.value;
  if (first === undefined) {
    return '';
  }
  if (rest.length === 0) {
    return first;
  }
  // Each root carries its trailing slash, so splitting one ends in an empty
  // segment; it survives the intersection only for two identical roots, which
  // the union these came from does not hold.
  let shared = first.split('/');
  for (const root of rest) {
    const segments = root.split('/');
    let index = 0;
    while (index < shared.length && shared[index] === segments[index]) {
      index += 1;
    }
    shared = shared.slice(0, index);
  }
  return shared.length === 0 ? '' : `${shared.join('/')}/`;
});

/** The carrier's path as the heading shows it, through the one label rule every surface uses. */
const pathText = computed(() => pathPresentationLabel(carrierPath.value));

/** Whether {@link pathText} is this product's spelled-out form rather than the file's own. */
const pathIsSpelledOut = computed(
  () => pathText.value !== escapeControlCharacters(carrierPath.value),
);

/**
 * The plugin name as the heading shows it: the authored spelling escaped for
 * presentation, with an authored empty name given its own note, because the
 * heading would otherwise draw nothing.
 */
const pluginNameText = computed(() =>
  openPluginName.value === null
    ? null
    : openPluginName.value === ''
      ? '(empty name)'
      : pathPresentationLabel(openPluginName.value),
);

/**
 * The products that recognize this carrier and the surfaces they recognize it
 * on, restated from the row so the page and the list agree (FR-007). Naming a
 * surface never claims that surface loaded the file (FR-009).
 */
const toolsText = computed(() =>
  [
    ...new Set(
      owner.value.map(
        ({ carrier }) =>
          `${SUPPORTED_TOOL_TEXT[carrier.tool]} (${carrier.surfaces
            .map((surface) => VENDOR_SURFACE_TEXT[surface])
            .join(', ')})`,
      ),
    ),
  ].join(', '),
);

/**
 * Where this plugin's comparison opens, or null when the row holds no second
 * carrier: a comparison needs one plugin name declared in two distinct files,
 * and the counterpart is the first carrier of this row that is not the one
 * this page is open at. The comparison surface's own pickers take over from
 * there. Null for the row that resolves no name, which is about no plugin a
 * comparison would compare.
 */
const compareRoute = computed((): RouteLocationRaw | null => {
  const name = openPluginName.value;
  if (name === null || row.value === null) {
    return null;
  }
  for (const carrier of row.value.carriers) {
    if (carrier.sourceRelativePath !== carrierPath.value) {
      return pluginComparisonRouteFor(name, carrierPath.value, carrier.sourceRelativePath);
    }
  }
  return null;
});

/**
 * Where one file of this plugin opens: this same page, with that file
 * selected. The name travels because one plugin root can be reached through
 * more than one offering, and a file of it belongs to whichever row the reader
 * came through.
 *
 * Every entry names itself, the manifest included, rather than dropping the
 * query for the file the page opens on by itself: which file that is comes from
 * the declaration the host served, so a link that left it unsaid would name a
 * different file once the declaration changed.
 */
function pluginFileRoute(sourceRelativePath: string): RouteLocationRaw {
  // The product stays what this page is open for: stepping through the
  // plugin's files is not a step to another carrier.
  return pluginCarrierDetailRoute(
    carrierPath.value,
    openTool.value ?? SUPPORTED_TOOL_ORDER[0]!,
    openPluginName.value,
    sourceRelativePath,
  );
}

/** What the open carrier is to the plugins it declares, for the caption line. */
const carrierText = computed(() =>
  openDetail.value === null ? null : PLUGIN_CARRIER_TEXT[openDetail.value.carrier],
);

/**
 * The catalog entries this carrier makes for the row the page is about, each as
 * the JSON document the detail renders (FR-007): every key the file wrote
 * under this plugin, in the file's own order, spelled back in the carrier's own
 * language so a reader compares it against their file without translating and
 * pastes from it without converting.
 *
 * Empty for a manifest, which declares its plugin with its whole content and is
 * read in the files tab: a parsed key list beside it would be the same
 * strict-JSON document twice.
 *
 * The host answered for this row alone, so no selection happens here. One entry
 * under a named row; several only under the row that closes the list, where one
 * catalog can hold more than one entry naming nothing. Empty while the
 * extraction failed — the entries are unknown rather than absent (FR-028).
 */
const openDeclarations = computed(() =>
  openDetail.value?.carrier !== 'catalog'
    ? []
    : (openDetail.value.plugins ?? []).map((plugin, index) => ({
        key: index,
        jsonText: declaredEntriesJsonText(plugin.fields),
        sourceForm: plugin.sourceForm,
      })),
);

/**
 * What kind of place this carrier's offerings of the open row name, when they
 * all name the same kind — the phrase the manifest note is written around
 * (`api-text.ts` § PLUGIN_SOURCE_FORM_TEXT).
 *
 * Null when they disagree, which one catalog holding two entries of the null
 * row can produce, and null when there is no declaration to answer from: a
 * failed extraction leaves the entries unknown rather than sourceless, and the
 * declaration section above already states that.
 */
const openSourceForm = computed((): PluginSourceForm | null => {
  const [first, ...rest] = new Set(
    openDeclarations.value.map((declaration) => declaration.sourceForm),
  );
  return first !== undefined && rest.length === 0 ? first : null;
});

/**
 * What a catalog declares about itself, as the same JSON document. Empty for a
 * manifest, which is one plugin's own file and declares nothing about a
 * catalog.
 */
const catalogJsonText = computed(() => {
  const detail = openDetail.value;
  return detail === null || detail.carrier !== 'catalog' || detail.catalogFields.length === 0
    ? ''
    : declaredEntriesJsonText(detail.catalogFields);
});

/**
 * The carrier's own published facts, which the definition list states: the file
 * the route names, whatever the files tab is showing beside it.
 */
const carrierFile = computed(() => openDetail.value?.file ?? null);

/**
 * The manifest's own file once its detail is this plugin's, or null while the
 * offering reached none — a slow request never leaves the previous plugin's
 * manifest under this one's heading.
 */
const manifestFileDetail = computed(() => {
  const carrier = openDetail.value;
  if (carrier?.carrier === 'manifest') {
    // Served complete by the carrier request itself: asking the file detail for
    // it as well would put one file's content in two slots.
    return { file: carrier.file, diagnostics: carrier.diagnostics };
  }
  const detail = manifestDetail.value;
  return detail !== null && detail.file.sourceRelativePath === manifestFile.value ? detail : null;
});

/**
 * The file the files panel is showing, once its detail is this selection's — a
 * slow request never leaves the previous file's source under the new one. The
 * manifest answers from its own slot, where it is held for the plugin panel:
 * asking for it twice would put one file's detail in two places.
 */
const openFile = computed(() => {
  const detail =
    openFilePath.value === manifestFile.value ? manifestFileDetail.value : selectedFileDetail.value;
  return detail !== null && detail.file.sourceRelativePath === openFilePath.value
    ? detail.file
    : null;
});

/**
 * What the open file is to this plugin, for the line under its heading.
 *
 * Most files below a plugin root are ones the plugin ships that no rule
 * admitted — an asset, a bundled `.mcp.json`, a hooks file — but not all of
 * them: a path a rule independently admits keeps its own recognitions and its
 * own row, a nested `SKILL.md` above all (FR-007), and the manifest that is
 * itself this page's carrier is admitted by the rule this page was reached
 * through (`claude.repo.skills-directory-plugin`). What the file is is
 * therefore read from the detail the host served for it rather than from its
 * path: saying no rule admitted a file whose own detail names its kind would
 * deny a recognition this product published.
 *
 * The plain sentence stands while the detail is not in hand, where the kind is
 * not yet known and the file is a file of the plugin either way.
 */
const openFileRoleText = computed(() => {
  if (openFilePath.value === carrierPath.value) {
    return 'The manifest that declares this plugin';
  }
  // What the file is comes from the inventory rather than from the file's own
  // request: a plugin's file is served as the plugin's ({@link
  // openFileRoleKinds}), and a rule that independently admitted it publishes
  // that on its own kind's rows, which the snapshot already carries.
  const [first, ...rest] = openFileRoleKinds.value;
  if (first === undefined) {
    return 'One of the files the plugin ships; no rule admitted it';
  }
  const kinds = [first, ...rest].map((kind) => CUSTOMIZATION_KIND_TEXT[kind]).join(', ');
  return `One of the files the plugin ships; also recognized on its own row as ${kinds}`;
});

/**
 * The kinds whose inventory rows name the open file, in the closed kind order
 * and without repetition — empty for the ordinary file of a plugin, which no
 * rule admitted (contracts/inspection-path-allowlist.md § Bounded companion
 * census).
 *
 * Read from the snapshot the page already holds rather than from the file's
 * own detail: a plugin's file is served as the plugin's, so its request
 * answers with the file rather than with a kind, and the rows are where a
 * recognition is published (FR-007).
 */
const openFileRoleKinds = computed((): readonly CustomizationKind[] => {
  const path = openFilePath.value;
  const held = snapshot.value;
  if (path === null || held === null) {
    return [];
  }
  // One entry per kind whose rows can name a file, filtered through the closed
  // kind order so two files never read in two orders (`entities.ts`
  // § CUSTOMIZATION_KIND_ORDER). The plugin kind is not among them: this page
  // is that row.
  const named: Readonly<Partial<Record<CustomizationKind, boolean>>> = {
    instructions: held.instructions.some((row) =>
      row.files.some((file) => file.sourceRelativePath === path),
    ),
    skill: held.skills.some((row) =>
      row.definitions.some((definition) => definition.sourceRelativePath === path),
    ),
    MCP: held.mcp.some((row) =>
      row.declarations.some((declaration) => declaration.sourceRelativePath === path),
    ),
    agent: held.agents.some((row) =>
      row.definitions.some((definition) => definition.sourceRelativePath === path),
    ),
    'prompt/command': held.prompts.some((row) =>
      row.definitions.some((definition) => definition.sourceRelativePath === path),
    ),
    permissions: held.permissions.some((row) => row.sourceRelativePath === path),
    'output style': held.outputStyles.some((row) =>
      row.definitions.some((definition) => definition.sourceRelativePath === path),
    ),
  };
  return CUSTOMIZATION_KIND_ORDER.filter((kind) => named[kind] === true);
});

/** The open file's path as presentation text, escaped like every path. */
const openFilePathText = computed(() =>
  openFile.value === null ? '' : escapeControlCharacters(openFile.value.sourceRelativePath),
);

/** The manifest's path as presentation text, for the plugin panel's own heading line. */
const manifestPathText = computed(() =>
  manifestFile.value === null ? '' : escapeControlCharacters(manifestFile.value),
);

/** The carrier's own diagnostics, rendered as the registry's maintained text (FR-028). */
const diagnosticMessages = computed(() =>
  (openDetail.value?.diagnostics ?? []).map((diagnostic) => ({
    key: diagnostic.diagnosticId,
    text: DIAGNOSTIC_REGISTRY[diagnostic.code].message,
  })),
);

/** The open file's own diagnostics — a read that failed, or bytes no reader shows. */
const openFileDiagnostics = computed(() => {
  if (openFile.value === null) {
    return [];
  }
  return (
    (openFilePath.value === manifestFile.value
      ? manifestFileDetail.value?.diagnostics
      : selectedFileDetail.value?.diagnostics) ?? []
  );
});

/**
 * The manifest's complete authored source for the plugin panel, or null when
 * this scan holds no readable manifest — an offering that reached none, and one
 * whose bytes are not text this product can show, which the files panel states
 * with its diagnostics (FR-028).
 */
const manifestSource = computed(() => {
  const file = manifestFileDetail.value?.file ?? null;
  return file !== null && isReadableFile(file) ? file : null;
});

/**
 * What this route says when its own request failed, or null when none has: the
 * failing state's statement, then the failure's own message.
 *
 * One value, read by the visible paragraphs and the live region, so what a
 * reader hears is the sentence that is on the screen. The idle branch needs no
 * error to speak: an idle page is this route's recoverable failure state
 * however it was reached — a failed carrier request carries its message in
 * `detailError`, while a newer-generation refresh that could not adopt leaves
 * the message to the shell (`SessionViewState`) and this statement stands
 * alone. It is what keeps a held plugin whose file request ended that way from
 * sitting on a loading pane with nothing in flight and no way back.
 */
const detailFailure = computed<string | null>(() => {
  const statement =
    detailState.value === 'companion-failed'
      ? 'This file could not be loaded.'
      : detailState.value === 'idle'
        ? 'This plugin could not be loaded.'
        : null;
  if (statement === null) {
    return null;
  }
  return detailError.value === null ? statement : `${statement} ${detailError.value}`;
});

/**
 * The two halves of a plugin detail, as the tab strip presents them: the
 * offering the catalog declares, and the files the plugin ships.
 *
 * They are tabs rather than one column for the reason the skill detail's are:
 * two subjects, not one long one. Stacked, the files sat below everything the
 * catalog declares, so reaching one meant scrolling past content the reader had
 * already read, and the file being read sat below that again.
 */
const PLUGIN_DETAIL_TABS = ['plugin', 'files'] as const;

/** Which half of the plugin is in view; see {@link PLUGIN_DETAIL_TABS}. */
type PluginDetailTab = (typeof PLUGIN_DETAIL_TABS)[number];

/** The label each tab shows. */
const PLUGIN_DETAIL_TAB_TEXT: Readonly<Record<PluginDetailTab, string>> = {
  /** Label for the panel holding the offering and the plugin's own manifest. */
  plugin: 'Plugin',
  /** Label for the panel holding the plugin's root and the open file. */
  files: 'Files',
};

const activeTab = ref<PluginDetailTab>('plugin');
/** The tab buttons, so a switch this page decides can carry focus with it. */
const tabButtons = ref<HTMLButtonElement[]>([]);

/**
 * The page's root, for {@link selectTab}. Declared before the tab-selection
 * watch below: that watch is immediate, so it calls `selectTab` synchronously
 * during setup, and a `const` declared after it would still be in its temporal
 * dead zone there.
 */
const pageRoot = ref<HTMLElement | null>(null);

/** The pane holding the open file's source; read by the focus guard below. */
const paneElement = ref<HTMLElement | null>(null);

/**
 * The height the pane had when the file it was showing left it, or 0 while a
 * file is in hand. It floors the pane for as long as the next file is in
 * flight, so stepping through a plugin's files keeps the page the size it was
 * instead of collapsing to the loading line and expanding again. The height is
 * a floor rather than a fixed size: the file that arrives sets the pane's real
 * height, whether it is taller or shorter.
 */
const reservedPaneHeight = ref(0);

/**
 * Selects a tab on the reader's behalf, keeping focus reachable.
 *
 * Both panels stay in the document and the unselected one is hidden, so a
 * switch the reader did not click can hide the subtree their focus is in — a
 * history step to another of this plugin's files while they were reading the
 * declaration. Focus would then be on a hidden element, and the next Tab would
 * restart from the top of the document. Moving it to the tab that now owns the
 * panel keeps the reader where the content they navigated to is.
 */
function selectTab(tab: PluginDetailTab): void {
  if (activeTab.value === tab) {
    return;
  }
  const hidden = pageRoot.value?.querySelector(`#${pluginTabPanelId(activeTab.value)}`);
  const focusWasInside = hidden?.contains(document.activeElement) === true;
  activeTab.value = tab;
  if (focusWasInside) {
    void nextTick(() => tabButtons.value[PLUGIN_DETAIL_TABS.indexOf(tab)]?.focus());
  }
}

/** The `id` of the panel a tab controls (WCAG 4.1.2). */
function pluginTabPanelId(tab: PluginDetailTab): string {
  return `aci-plugin-panel-${tab}`;
}

/** The `id` of the tab that controls {@link pluginTabPanelId}'s panel. */
function pluginTabId(tab: PluginDetailTab): string {
  return `aci-plugin-tab-${tab}`;
}

/**
 * Arrow keys move the selection, matching the WAI-ARIA tabs pattern. Selection
 * follows focus because switching panels issues no request and loses no work:
 * both halves are already in hand, so the extra Enter that manual activation
 * asks for would be friction with nothing behind it.
 */
function onTabKeydown(event: KeyboardEvent, index: number): void {
  const next = nextTabForKey(event.key, PLUGIN_DETAIL_TABS, index);
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior; swallowing
    // it here would break Tab out of the strip.
    return;
  }
  event.preventDefault();
  activeTab.value = next;
  document.getElementById(pluginTabId(next))?.focus();
}

/**
 * Opening a plugin starts on the plugin itself, unless the URL selected one of
 * its other files — a link a reader kept to `.mcp.json` is a request for that
 * file, and landing them on the offering would answer a question they did not
 * ask. It is the skill detail's rule: the address alone opens what the
 * customization declares, and a selection opens the file.
 *
 * Decided once per (carrier, plugin, selection), not once per arrival. A commit
 * drops the open detail and the route re-requests under the new generation
 * (FR-030), so a rescan while the reader is reading takes the detail away and
 * brings the same one back; deciding again on that round trip would move a
 * reader who had switched tabs.
 */
const tabDecidedFor = ref<string | null>(null);
watch(
  [carrierPath, openPluginName, selectedFile],
  ([path, pluginName, filePath]) => {
    const decidingFor = `${path}\u0000${pluginName}\u0000${filePath}`;
    if (tabDecidedFor.value === decidingFor) {
      return;
    }
    tabDecidedFor.value = decidingFor;
    selectTab(filePath === null ? 'plugin' : 'files');
  },
  { immediate: true },
);

/** The heading's accessible name: the flattened label rule (WCAG 2.4.4). */
const headingAccessibleText = computed(() =>
  openPluginName.value === null
    ? `${kindText}: ${inlinePresentationLabel(carrierPath.value)}`
    : `${kindText}: ${inlinePresentationLabel(openPluginName.value)}`,
);

/** What the live region announces as the request settles. */
const detailAnnouncement = computed(() => {
  if (detailState.value === 'loading') {
    return 'Loading this plugin…';
  }
  if (detailState.value === 'stale' || !linkResolved.value) {
    return 'This plugin is not in the current scan.';
  }
  // The selection and the manifest are two requests, and either can fail while
  // the other is in hand. Both are named, because a live region announces what
  // changed: with only the first, the second to settle would leave the sentence
  // identical and never be announced at all — and the panel it failed on may
  // not be the one in view.
  const failures = [
    detailFailure.value,
    manifestError.value === null
      ? null
      : `This plugin's manifest could not be loaded. ${manifestError.value}`,
  ].filter((message) => message !== null);
  if (failures.length > 0) {
    return failures.join(' ');
  }
  if (openDetail.value === null) {
    return '';
  }
  // The same test the panes render from: a file is in hand or it is not.
  // Reading it from the *source* instead would announce a manifest whose bytes
  // no reader shows as forever loading, and a plugin whose selected file is
  // still in flight as ready.
  return openFilePath.value !== null && openFile.value === null
    ? 'Loading this file…'
    : `${kindText} ready.`;
});

const heading = ref<HTMLHeadingElement | null>(null);
const pageOwnership = usePageOwnership();

/**
 * Requests the plugin and file the URL currently names. The route watcher below
 * calls it on every selection, and the failed-pane branch calls it again as the
 * retry — same inputs, same path.
 */
const requestOpen = (): void => {
  // A manifest carrier's request serves that file complete, so neither slot
  // asks for it again: the page reads both the manifest section and a
  // selection of the manifest itself from the carrier's own detail, and a
  // second request could only fail a pane whose source is already in hand.
  const servedByCarrier = openDetail.value?.carrier === 'manifest';
  const tool = openTool.value;
  if (tool === null) {
    // No carrier at this path in the committed inventory: the watcher's
    // resolution gate reports the link, and there is no product to ask.
    return;
  }
  void pageOwnership.openPluginDetail(
    { sourceRelativePath: carrierPath.value, pluginName: openPluginName.value, tool },
    servedByCarrier ? null : manifestFile.value,
    servedByCarrier && openFilePath.value === carrierPath.value ? null : openFilePath.value,
  );
};

/**
 * The retry the failed panes offer. Focus moves to the heading first: the
 * button is inside the branch the retry replaces, so the click that starts the
 * request unmounts the element focus is on, and the reader would resume from
 * the top of the document (WCAG 2.4.3).
 */
const retryOpen = (): void => {
  heading.value?.focus();
  requestOpen();
};

// One effect owns "which plugin and file should be open", so entering the
// route, a history step between plugins, a step between one plugin's files, and
// a newly committed generation all take the same path: adopting a newer
// generation closes the open detail while the URL stays identical, so the
// generation is part of what "open" means.
//
// The open file is one of the keys because the page opens on the plugin's own
// manifest, which the served declaration names: the first request settles the
// declaration, that names the manifest, and this effect then asks for it. The
// declarations already in hand are kept across that second request, so the tab
// strip and the tree the reader is looking at stay mounted.
watch(
  [
    carrierPath,
    openPluginName,
    openTool,
    manifestFile,
    openFilePath,
    (): boolean => carrierResolved.value,
    (): number => snapshot.value?.repositoryGeneration ?? 0,
  ],
  ([path, , , , , resolved]) => {
    if (path === '' || !resolved) {
      pageOwnership.close();
      return;
    }
    requestOpen();
  },
  { immediate: true },
);

// Focus moves to the heading when the page is entered or the plugin changes:
// following a link in an SPA moves no focus by itself. Selecting another of the
// plugin's files is not a change of subject, so it moves nothing.
onMounted(() => {
  heading.value?.focus();
});
watch([carrierPath, openPluginName], () => {
  heading.value?.focus();
});

/** Set as the route is left, so the focus guards below yield to the next route. */
let leaving = false;

// While a switch to another of the plugin's files is in flight, the pane is
// replaced by its loading line. If keyboard focus is inside it at that moment —
// reading a bundled skill in Monaco when a history step changes the selection —
// the unmount would drop focus to the document body, restarting keyboard and
// reader position from the top of the document. The guard runs synchronously,
// before Vue patches the pane away, because afterwards the focused element is
// already gone (WCAG 2.4.3).
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
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// A generation replacement drops the whole detail while the URL stays:
// adopting a newer commit closes the open plugin and the route re-requests it
// (`SessionViewState`). The unmount takes the tab strip, the tree, and both
// panels with it — parts the pane guard above does not cover — and neither of
// the other guards fires, because the state is not `stale` and neither the
// carrier nor the plugin changed. The subject condition keeps this out of a
// step to another plugin, whose own watcher above focuses the heading.
watch(
  openDetail,
  (detail, previous) => {
    if (
      detail === null &&
      previous !== null &&
      previous.file.sourceRelativePath === carrierPath.value &&
      !leaving &&
      pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== heading.value
    ) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The dead-link and stale transitions replace the whole body of the page — the
// tree the reader may be navigating included — so their guard watches those
// states themselves and considers the whole page root (WCAG 2.4.3).
watch(
  [detailState, linkResolved],
  ([state, resolved]) => {
    if (
      (state === 'stale' || !resolved) &&
      !leaving &&
      pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== heading.value
    ) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

onBeforeUnmount(() => {
  leaving = true;
  // The title subject and the open detail are both `usePageOwnership`'s to
  // drop, after unmount, where the guards above are naturally inert and a
  // replacement page's own report or open stands.
});

/**
 * What the tab title says while this page is open (WCAG 2.4.2).
 *
 * A page that is showing a plugin reports the name heading it — the same words
 * a sighted reader sees at the top. A page that is not reports the state it is
 * in instead, because the title has to be state-appropriate: a reader returning
 * to a tab titled after a plugin would find a page saying the link no longer
 * resolves. Null falls back to the route's surface name, which is what the row
 * that resolves no plugin name gets.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return 'Loading a plugin';
  }
  if (detailState.value === 'stale' || !linkResolved.value) {
    return 'Link not in this scan';
  }
  // Only a whole-page failure retitles the tab. A file that failed to load
  // leaves the plugin on screen — its name is still what this page is showing.
  if (detailFailure.value !== null && detailState.value !== 'companion-failed') {
    return 'Plugin could not be loaded';
  }
  // The raw name, not this page's escaped spelling: the shell escapes its
  // subject exactly once at the rendering boundary (`App.vue`), so passing an
  // escaped value would double-escape — a name containing a newline would head
  // the page as `\u000A` but title the tab `\u005Cu000A`. Null when the
  // escaped spelling still draws nothing, because a tab titled by it would read
  // as having no subject at all.
  const subject = openPluginName.value ?? carrierPath.value;
  return rendersNothingVisible(escapeControlCharacters(subject)) ? null : subject;
});
watch(
  titleSubject,
  () => {
    // Reported as this page instance's own, so an outgoing page's unmount
    // cannot erase what this page just titled the tab with
    // (`SessionViewState.reportPageSubject`).
    pageOwnership.reportSubject(titleSubject.value);
  },
  { immediate: true },
);
</script>

<template>
  <div ref="pageRoot" class="aci-plugin-detail">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the plugin
         list rather than the kind order's default tab. -->
    <p><NuxtLink :to="inventoryRoute">Back to the inventory</NuxtLink></p>

    <div class="aci-plugin-detail__title">
      <h2 ref="heading" tabindex="-1" :aria-label="headingAccessibleText">
        <!-- The record's own identity heads the page: the declared plugin name,
             or the carrier's path for the row that resolves none. Either is
             escaped for presentation, never a locator anything can open
             (FR-024, FR-030). -->
        <span v-if="pluginNameText !== null" class="aci-authored-text">{{ pluginNameText }}</span>
        <span v-else class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{
          pathText
        }}</span>
      </h2>
      <OpenFileButton v-if="carrierFile !== null" :source-relative-path="carrierPath" />
    </div>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ detailAnnouncement }}
    </p>

    <template v-if="detailState === 'loading'">
      <p class="aci-empty">Loading this plugin…</p>
    </template>

    <template v-else-if="detailState === 'stale' || !linkResolved">
      <!-- Two dead links, two sentences: a path the scan does not hold, and a
           held carrier that declares no plugin by this name or ships no file at
           the one selected — which covers a carrier whose declarations could
           not be read, whose plugins are unknown rather than absent
           (FR-028). -->
      <p v-if="carrierListed" class="aci-error">
        This carrier declares nothing at this link in the current scan. It may have changed since
        the link was made — its declarations may even be unreadable right now — and a rescan that
        brings the plugin back will make it resolve again.
      </p>
      <p v-else class="aci-error">
        The current scan holds no plugin carrier at this path. It may have been removed or renamed
        since the link was made; a rescan that brings it back will make this link resolve again.
      </p>
    </template>

    <!-- A failed request: this route reports it, because this route made it —
         the shell reports what happened to the session, so neither hides or
         repeats the other. The retry beside it is the way back without
         re-finding the link. It covers a request that ended holding nothing and
         one that ended while the declarations were held: an idle page has no
         request in flight, so without this the panels below would wait on a
         file that is never coming. -->
    <template v-else-if="carrierFile === null || detailState === 'idle'">
      <p class="aci-error">{{ detailFailure }}</p>
      <p>
        <button type="button" @click="retryOpen">Try again</button>
      </p>
    </template>

    <template v-else>
      <dl class="aci-definition-grid">
        <dt>Declared in</dt>
        <dd class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{ pathText }}</dd>
        <dt>Carrier</dt>
        <dd>{{ carrierText }}</dd>
        <dt>Recognized by</dt>
        <dd>{{ toolsText }}</dd>
        <!-- Which of those products this page answers for: the root, the
             source form, and the manifest forms below are that product's
             reading of this carrier. -->
        <dt>Reading</dt>
        <dd>{{ readingText }}</dd>
        <dt>Encoding</dt>
        <!-- What the read produced, and nothing else — the same facts an MCP
             carrier's detail states, because both are files admitted so their
             declarations can be published (FR-007). -->
        <dd>
          {{ FILE_ENCODING_TEXT[carrierFile.encoding]
          }}<template v-if="carrierFile.encoding !== 'unknown'">
            · {{ carrierFile.sizeBytes }} bytes</template
          ><template v-if="isReadableFile(carrierFile) && carrierFile.hadLeadingBom">
            · byte-order mark removed before decoding</template
          >
        </dd>
      </dl>

      <ul v-if="diagnosticMessages.length > 0" class="aci-plugin-detail__diagnostics" role="list">
        <li v-for="diagnostic in diagnosticMessages" :key="diagnostic.key" class="aci-note">
          {{ diagnostic.text }}
        </li>
      </ul>

      <!-- Two subjects, two tabs: the offering the catalog declares, and the
           files the plugin ships. A real `tablist` rather than a pair of
           buttons, because assistive technology has to announce "tab 1 of 2,
           selected" for the strip to be usable at all (QR-004,
           contracts/accessibility-acceptance.md) — which obliges the roving
           tabindex and arrow keys the WAI-ARIA tabs pattern specifies. -->
      <div class="aci-kind-tabs" role="tablist" aria-label="Plugin detail">
        <button
          v-for="(tab, index) in PLUGIN_DETAIL_TABS"
          :id="pluginTabId(tab)"
          :key="tab"
          ref="tabButtons"
          class="aci-kind-tab"
          type="button"
          role="tab"
          :aria-controls="pluginTabPanelId(tab)"
          :aria-selected="tab === activeTab"
          :tabindex="tab === activeTab ? 0 : -1"
          @click="activeTab = tab"
          @keydown="onTabKeydown($event, index)"
        >
          {{ PLUGIN_DETAIL_TAB_TEXT[tab] }}
          <span v-if="tab === 'files'" class="aci-kind-count">{{ rowFiles.length }}</span>
        </button>
      </div>

      <!-- Both panels stay in the document and the unselected one is hidden, so
           Monaco keeps its model and the reader's scroll position across a tab
           switch. Every tab therefore names its panel: both IDREFs resolve, and
           omitting one would drop a relationship assistive technology uses to
           move from a tab to what it controls. -->
      <div
        v-show="activeTab === 'plugin'"
        :id="pluginTabPanelId('plugin')"
        role="tabpanel"
        :aria-labelledby="pluginTabId('plugin')"
        tabindex="0"
      >
        <!-- The catalog's own declarations first: what the file says about
             itself, before what it says about the plugin the reader
             followed. -->
        <section v-if="catalogJsonText !== ''">
          <h3>Catalog</h3>
          <SourceViewer
            :source-text="catalogJsonText"
            :source-relative-path="carrierPath"
            content-label="Catalog declarations of"
            content-language="json"
            fit-content
          />
        </section>

        <!-- The entry the reader followed. A manifest has no section of its own
             here: it declares its plugin with its whole content, which the
             files tab reads, and a parsed key list beside it would be the same
             strict-JSON document twice. -->
        <section v-if="openDetail?.carrier === 'catalog'">
          <h3>Declaration</h3>
          <p v-if="openDeclarations.length === 0" class="aci-note">
            This catalog publishes no entry to show: its entries could not be read, or the link
            names a plugin it does not offer.
          </p>
          <SourceViewer
            v-for="declaration in openDeclarations"
            :key="declaration.key"
            :source-text="declaration.jsonText"
            :source-relative-path="carrierPath"
            content-label="Plugin declaration of"
            content-language="json"
            fit-content
          />
        </section>

        <!-- The plugin's own declaration of itself, read here rather than
             linked to: it is one of the files the plugin ships, so it has no
             page of its own, and a plugin shown without it would be the
             catalog's statement about the plugin and nothing from the plugin. -->
        <section v-if="manifestFile !== null">
          <h3>Manifest</h3>
          <div class="aci-plugin-detail__file-title">
            <p class="aci-path aci-authored-text">{{ manifestPathText }}</p>
            <OpenFileButton :source-relative-path="manifestFile" />
          </div>
          <SourceViewer
            v-if="manifestSource !== null"
            :source-text="manifestSource.sourceText"
            :source-relative-path="manifestSource.sourceRelativePath"
          />
          <template v-else-if="manifestFileDetail === null">
            <!-- The manifest is the request that failed: the declarations
                 above are still in hand, so the failure and the retry belong
                 beside them. Without this the panel that opens by default
                 would wait on a request that has already ended, with the only
                 way back on a panel the reader is not looking at. The file the
                 reader selected has its own request and its own outcome in the
                 files panel; neither reports the other's. -->
            <template v-if="manifestError !== null">
              <p class="aci-error">
                This plugin's manifest could not be loaded. {{ manifestError }}
              </p>
              <p>
                <button type="button" @click="retryOpen">Try again</button>
              </p>
            </template>
            <p v-else class="aci-note">Loading this file…</p>
          </template>
          <p v-else class="aci-note">This file has no source text to show.</p>
        </section>
        <!-- What the absence is, rather than one sentence covering every way
             there could be none. An offering naming a Git repository, an npm
             package, or any other place outside this repository names no
             directory here at all, so a note about a directory that ships no
             manifest would report this repository as missing a file the
             offering never put in it (`api-types.ts` § PluginSourceForm). -->
        <p v-else-if="carrierRoots.length > 0" class="aci-note">
          This scan holds no manifest inside
          <span class="aci-path aci-authored-text">{{ namedRootsText }}</span
          >, which is what this offering names.
        </p>
        <p v-else-if="openSourceForm !== null" class="aci-note">
          This offering names {{ PLUGIN_SOURCE_FORM_TEXT[openSourceForm] }}, so this scan holds none
          of this plugin's own files.
          <template v-if="openSourceForm === 'repository-directory'">
            No directory this scan can enumerate follows from what it writes.
          </template>
        </p>
        <p v-else-if="openDeclarations.length > 0" class="aci-note">
          These offerings name no directory in this repository, so this scan holds none of this
          plugin's own files.
        </p>

        <!-- The comparison this plugin's row can open: one name declared in
             two files, which is what a repository keeping parallel catalogs
             has. Placed under the declaration, because it is a step out of
             this page rather than one of the plugin's own facts. -->
        <p v-if="compareRoute !== null" class="aci-plugin-detail__compare">
          <NuxtLink :to="compareRoute">Compare this plugin</NuxtLink>
        </p>

        <!-- Stated on the panel that shows the declaration, because that is
             where the values it speaks of are. -->
        <p class="aci-note">
          A component a manifest points at — bundled skills, an `.mcp.json`, an `.app.json`, hook
          files, assets — is shown as the value the file wrote and is never opened. Whether the
          plugin is installed, enabled, or trusted is state outside this repository.
        </p>
      </div>

      <div
        v-show="activeTab === 'files'"
        :id="pluginTabPanelId('files')"
        role="tabpanel"
        :aria-labelledby="pluginTabId('files')"
        tabindex="0"
      >
        <!-- What the plugin ships, which is what the plugin is: an offering
             shown without the skills, hooks, assets, and its own manifest would
             show the entry and not the customization
             (contracts/inspection-path-allowlist.md § Bounded companion
             census). -->
        <p v-if="rowFiles.length === 0" class="aci-note">
          This scan found no files for this plugin. The `source` on the offering is where the
          catalog says the plugin comes from: nothing outside this repository is ever fetched, and a
          source inside it has files here only when this repository holds the directory it names.
        </p>

        <template v-else>
          <!-- The tree is as long as the plugin root happens to be, and it
               stands between the reader and the file they came to read. A
               screen reader can jump the `nav` landmark; a keyboard user has
               nothing unless the page offers it, so this link is that mechanism
               (WCAG 2.4.1). -->
          <p class="aci-plugin-detail__skip-link">
            <a href="#aci-plugin-detail-file-contents">Skip to file contents</a>
          </p>

          <div class="aci-plugin-detail__layout">
            <DirectoryFileTree
              :files="rowFiles"
              :selected-path="openFilePath ?? ''"
              :directory="treeDirectory"
              label="Files in this plugin"
              :route-for="pluginFileRoute"
            />

            <!-- One element for all three states, so the skip target above
                 survives the swap between them: a target that unmounted when
                 loading became ready would drop the focus it had just received
                 to the document body (WCAG 2.4.3). -->
            <div
              id="aci-plugin-detail-file-contents"
              ref="paneElement"
              tabindex="-1"
              class="aci-plugin-detail__main"
              :style="
                openFile === null && reservedPaneHeight > 0
                  ? { minBlockSize: `${reservedPaneHeight}px` }
                  : undefined
              "
            >
              <!-- Only the pane failed: the offering and the tree above still
                   describe the plugin, and the reader keeps them while retrying
                   the one file that did not load. -->
              <template v-if="detailState === 'companion-failed'">
                <p class="aci-error">{{ detailFailure }}</p>
                <p>
                  <button type="button" @click="retryOpen">Try again</button>
                </p>
              </template>
              <!-- The manifest is served through its own slot, so a failure
                   there settles nowhere this pane watches: a reader who
                   selected the manifest in the tree would wait on a request
                   that has already ended, with the failure and the retry on a
                   panel they are not looking at (FR-028). -->
              <template v-else-if="openFilePath === manifestFile && manifestError !== null">
                <p class="aci-error">
                  This plugin's manifest could not be loaded. {{ manifestError }}
                </p>
                <p>
                  <button type="button" @click="retryOpen">Try again</button>
                </p>
              </template>
              <!-- A switch to another file of this plugin is still in flight:
                   the tree and the URL already name the new file, so the pane
                   shows nothing rather than the previous file's source under
                   the new selection. -->
              <p v-else-if="openFile === null" class="aci-note">Loading this file…</p>
              <template v-else>
                <div class="aci-plugin-detail__file-title">
                  <!-- The authored run is the heading's whole content: it
                       renders its own whitespace (`aci-authored-text`), so
                       anything else inside it would draw this template's
                       indentation. -->
                  <h3 class="aci-path aci-authored-text">{{ openFilePathText }}</h3>
                  <OpenFileButton :source-relative-path="openFile.sourceRelativePath" />
                </div>

                <!-- What the file is to this plugin, then the facts every
                     file publishes. All but one of them has no kind of its
                     own, so there is nothing read out of it to publish beside
                     it — the complete authored source is the whole answer
                     (FR-007, FR-025). -->
                <p class="aci-note">
                  {{ openFileRoleText }} · {{ FILE_ENCODING_TEXT[openFile.encoding]
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

                <!-- Only the readable variants carry text. An unreadable file
                     has no source to show and its diagnostic above says why; a
                     binary one — a plugin's own asset — has none either, and
                     the encoding line above is the whole story. -->
                <SourceViewer
                  v-if="isReadableFile(openFile)"
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
  </div>
</template>

<style scoped>
/* The heading and the open control share a line, as every detail page's do. */
.aci-plugin-detail__title {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* The file's path and the link that opens it on one line, wrapping together
   when the path is long. */
.aci-plugin-detail__file-title {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
}

/* The detail route's bypass mechanism (WCAG 2.4.1): out of the way until it is
   focused, then a normal visible link. Not `display: none`, which would take it
   out of the tab order and leave nothing to bypass with. */
.aci-plugin-detail__skip-link {
  margin: 0;
}

.aci-plugin-detail__skip-link a {
  block-size: 1px;
  clip-path: inset(50%);
  inline-size: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
}

.aci-plugin-detail__skip-link a:focus-visible {
  block-size: auto;
  clip-path: none;
  inline-size: auto;
  overflow: visible;
  position: static;
}

/* The tree beside the file it opens, stacking on a narrow viewport — the
   arrangement the skill detail's files panel uses. */
.aci-plugin-detail__layout {
  display: grid;
  gap: 0.75rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  padding-block-start: 0.75rem;
}

@media (min-width: 52rem) {
  .aci-plugin-detail__layout {
    grid-template-columns: minmax(9rem, 14rem) minmax(0, 1fr);
  }
}

.aci-plugin-detail__compare {
  margin: 0.75rem 0 0;
}

.aci-plugin-detail__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.aci-plugin-detail__main > h3 {
  border: 0;
  font-size: 1rem;
  margin: 0;
  padding: 0;
}

/* The file's own diagnostics, set as plain notes under the facts they qualify. */
.aci-plugin-detail__diagnostics {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
}
</style>
