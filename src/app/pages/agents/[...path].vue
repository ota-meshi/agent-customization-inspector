<script setup lang="ts">
// The custom-agent detail route (T525): `/agents/<source-relative path>` —
// what one agent file declares, and the complete file those declarations were
// read from.
//
// The file is the subject, and the page is headed by its Source-relative
// Path. The inventory unit is the declared agent name (data-model.md
// § Inventory unit), and this page states it under the heading — read out of
// the file's own declarations, or stated as not known where the file publishes
// none — but the file is what the page shows, so the path is what heads it.
// The URL carries no tool segment, so the path alone is the link's identity,
// stable across rescans and server launches (FR-030).
//
// The parse and the file are two tabs, not one column, exactly as the
// instruction detail splits them: the metadata and the instructions answer
// what the file tells a product, while the complete authored source is where
// every authored spelling stays readable — a triple-quoted TOML string, a
// comment the parse drops. Stacking them would show one file's content twice.
//
// The parse tab shows the two halves the way each one reads: the metadata as
// one YAML document, so a reader compares declared values without translating
// a format, and the instructions as Markdown, because that is the syntax an
// agent's prose is written in whatever the file around it is. Highlighting is
// tokenizing, not rendering (FR-033).
//
// This surface shows file contents exactly as authored — credentials included,
// with nothing masked and no control that would uncover a masked value — and
// resolves no environment reference: the files are the reader's own, over a
// loopback-bound session (FR-025, FR-026, FR-027). A path the file names — a
// `config_file`, a skill path — is text on this page like every other line:
// nothing is resolved, opened, imported, or run, and no target is read
// (FR-019, FR-033). A declared `mcp_servers` block is this file's own content
// and reaches no MCP inventory row: nothing here connects to a server, and an
// MCP declaration's home is an explicit carrier (data-model.md § Inventory
// unit). What a spawned session would inherit from its parent, and which agent
// a spawn would select, are the vendor's documented composition and are not
// projected here (FR-009).
//
// Leaving the route, a client-data purge, and a commit that replaces the
// generation all drop the open detail through the same cleanup the prompt
// route uses; only the URL survives a commit, and the page refetches the same
// path under the new generation.
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
import OpenFileButton from '../../components/inspection/OpenFileButton.vue';
import SourceViewer from '../../components/inspection/SourceViewer.vue';
import { frontmatterYamlText } from '../../components/inspection/frontmatter-yaml';
import { LEADING_AGENT_METADATA_KEYS } from '../../components/inspection/declaration-order';
import { customAgentComparisonRouteFor } from '../../composables/custom-agent-comparison';
import { decodeDetailRoutePath } from '../../components/detail-route';
import { nextTabForKey } from '../../components/tab-navigation';
import { usePageOwnership } from '../../composables/page-ownership';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import {
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_ORDER,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
} from '../../../shared/entities';
import type {
  AgentPresentationDto,
  DeclaredEntryDto,
  FileDetailDto,
} from '../../../shared/api-types';
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
 * The Source-relative path from the URL's catch-all segments — the file's
 * identity and the whole route identity (FR-030). The router hands the
 * segments over individually and decoded, so joining them with `/` restores
 * the published spelling exactly.
 */
const openPath = computed((): string => {
  // Each segment arrives percent-decoded but still spelled as the well-formed
  // text the link carried, so the escape the encoder applied is undone here:
  // a lone surrogate in an authored entry name round-trips to the path the
  // inventory published (`detail-route.ts`).
  const parameter = route.params['path'];
  return decodeDetailRoutePath(typeof parameter === 'string' ? [parameter] : (parameter ?? []));
});

const entryDetail = sessionViewState.entryDetail;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
const snapshot = sessionViewState.snapshot;

/**
 * The custom-agent inventory definitions the URL's path names — empty when the
 * committed inventory holds none there. Resolved from the snapshot rather than
 * from a fetched detail because they have to be known before anything is
 * requested: they carry the recognizing products and the name this page
 * states, and a path the inventory does not list is the same dead link the
 * host would answer, reportable without a doomed request.
 *
 * Gathered across rows rather than found in one, because a row is one name and
 * this page is one file: two products reading one file could resolve different
 * names, and the page is about the file either way (data-model.md § Inventory
 * unit).
 */
const owner = computed(() =>
  (snapshot.value?.agents ?? [])
    .flatMap((entry) =>
      entry.definitions
        .filter((definition) => definition.sourceRelativePath === openPath.value)
        .map((definition) => ({ name: entry.name, definition })),
    )
    // In the contracted tool order, not the order the rows were walked in:
    // gathering across rows visits them by name, so a file two products name
    // differently would state its products in whatever order those two names
    // happened to sort (data-model.md § ToolRecognition).
    .toSorted(
      (left, right) =>
        SUPPORTED_TOOL_ORDER.indexOf(left.definition.tool) -
        SUPPORTED_TOOL_ORDER.indexOf(right.definition.tool),
    ),
);

/** The kind's own caption, for the heading and the recognition line. */
const kindText = CUSTOMIZATION_KIND_TEXT.agent;

/**
 * The comparison entries for this file (FR-011, T575): one per row this file
 * is listed under that also holds a readable counterpart — this file beside
 * another file of that row, exactly as a skill's entry link stays inside its
 * name's row. One per row rather than the first row alone, because the
 * products identify an agent by different facts, so one file sits on the row
 * of its declared `name` and on the row of its file name, and each may own a
 * pair the other does not. Empty when this file is not readable or no row of
 * its own holds a readable counterpart; the compare route's own pickers take
 * over from there, so any other pair of a row is one pick away rather than
 * composed here.
 *
 * The null-named row is skipped for the reason its own row links no
 * comparison: its files share the absence of a name rather than an identity
 * (data-model.md § Inventory unit).
 */
const comparePairRoutes = computed(() => {
  const readable = new Set(
    (snapshot.value?.files ?? []).filter(isReadableFile).map((file) => file.sourceRelativePath),
  );
  if (!readable.has(openPath.value)) {
    return [];
  }
  const entries: {
    readonly key: string;
    readonly nameText: string;
    readonly nameAccessibleText: string;
    readonly route: ReturnType<typeof customAgentComparisonRouteFor>;
  }[] = [];
  const named = new Set<string>();
  for (const entry of snapshot.value?.agents ?? []) {
    const name = entry.name;
    if (name === null || named.has(name)) {
      continue;
    }
    let holdsOpenFile = false;
    let counterpart: string | undefined;
    for (const definition of entry.definitions) {
      if (definition.sourceRelativePath === openPath.value) {
        holdsOpenFile = true;
      } else if (counterpart === undefined && readable.has(definition.sourceRelativePath)) {
        counterpart = definition.sourceRelativePath;
      }
    }
    if (holdsOpenFile && counterpart !== undefined) {
      named.add(name);
      entries.push({
        key: name,
        // The drawn label rule, so a name built only from invisible code
        // points still identifies its link ({@link pathPresentationLabel}),
        // and this product's note where the name is the empty string, which
        // has nothing to draw.
        nameText: name === '' ? '(empty name)' : pathPresentationLabel(name),
        // The accessible name carries the row's name through the single-line
        // label rule instead: an accessible name collapses whitespace, so two
        // rows differing only in it must not announce as one control (FR-025,
        // WCAG 2.4.6).
        nameAccessibleText: name === '' ? '(empty name)' : inlinePresentationLabel(name),
        route: customAgentComparisonRouteFor(name, openPath.value, counterpart),
      });
    }
  }
  return entries;
});

/**
 * The path as the heading shows it, through the one label rule every surface
 * that draws a path uses ({@link pathPresentationLabel}).
 */
const pathText = computed(() => pathPresentationLabel(openPath.value));

/**
 * Whether {@link pathText} is the spelled-out form rather than the file's own
 * spelling, which an authored name of whitespace or default-ignorable code
 * points produces. The label then draws this product's characters instead of
 * the reader's, so it is not authored text and does not title the tab.
 * Compared against the escaping rather than tested again, so the two cannot
 * answer differently.
 */
const pathIsSpelledOut = computed(() => pathText.value !== escapeControlCharacters(openPath.value));

/**
 * The products that recognize this file and the surfaces they recognize it on,
 * restated from the row so the page and the list agree (FR-007). The row's
 * definitions are already in the closed tool order and each one's surfaces in
 * the closed surface order.
 */
const toolsText = computed(() =>
  owner.value
    .map(
      ({ definition }) =>
        `${SUPPORTED_TOOL_TEXT[definition.tool]} (${definition.surfaces
          .map((surface) => VENDOR_SURFACE_TEXT[surface])
          .join(', ')})`,
    )
    .join(', '),
);

/**
 * The names this file's agent is known by, restated from the rows it is listed
 * under so the page and the list agree (FR-007), or null when every row
 * holding it is the one that publishes no name — under a product that
 * identifies an agent by its declared `name`, a file declaring none and a file
 * whose declarations could not be read at all (FR-028).
 *
 * Several when the products that recognize the file disagree, which they do
 * wherever a `.claude/agents/*.md` is both Claude Code's subagent, named by
 * its declared `name`, and a Copilot agent profile, named by the configuration
 * file's own name — two rows, one file, both restated here.
 *
 * Through the same two rules the row uses, so one name reads identically in
 * both places: the shared label rule, which spells out a name built only from
 * whitespace or invisible code points, and the empty-name note, because an
 * authored empty string has no characters for the label rule to draw and the
 * line would otherwise end after the colon. The note is written here rather
 * than shared, the way every MCP surface writes its own (`McpRow.vue`,
 * `pages/mcp/[...path].vue`): copy a component renders lives where it renders
 * (AGENTS.md § User-visible copy policy).
 */
const displayedAgentNames = computed(() => {
  const names = new Map<string, string>();
  for (const { name } of owner.value) {
    // A null-named row publishes no name, so it contributes none: the line
    // states the names this file is listed under, and the row that says the
    // name is not known is not one of them.
    if (name !== null) {
      names.set(name, name === '' ? '(empty name)' : pathPresentationLabel(name));
    }
  }
  return names;
});

/**
 * What the line says when this file publishes no name at all: the two states
 * the null-named row tells apart, told apart here too (FR-028). A failed
 * extraction leaves the name unknown, while a parsed file with no usable
 * `name` declares none — and the file's own recognitions answer, because the
 * extraction ran once per file. Written here rather than shared, the way every
 * surface writes its own copy (AGENTS.md § User-visible copy policy).
 */
const noAgentNameText = computed(() =>
  owner.value.some(({ definition }) => definition.parseStatus === 'failed')
    ? 'The declarations in this file could not be read, so its agent name is unknown.'
    : 'This file declares no agent name.',
);

/** The displayed names as the line writes them, or null when there are none. */
const agentNamesText = computed(() =>
  displayedAgentNames.value.size === 0 ? null : [...displayedAgentNames.value.values()].join(', '),
);

/**
 * The label {@link agentNamesText} is introduced by, plural exactly when the
 * recognizing products name the file's agent differently. Counted from the
 * names themselves rather than from the rendered line, which a name holding a
 * comma and a space would split into two. Written here for the same reason the
 * empty-name note is: copy a component renders lives where it renders
 * (AGENTS.md § User-visible copy policy).
 */
const agentNamesLabel = computed(() =>
  displayedAgentNames.value.size > 1 ? 'Agent names' : 'Agent name',
);

/**
 * Whether every name on this line is the reader's own characters rather than
 * this product's note, which decides the authored-text styling — the same
 * distinction the row draws. Asked of the names actually displayed, so a file
 * also listed under the null-named row keeps the styling its shown name
 * earns. Compared against the two substitutions rather than tested again, so
 * the two cannot answer differently.
 */
const agentNamesAreAuthored = computed(() =>
  [...displayedAgentNames.value].every(([name, drawn]) => name !== '' && drawn === name),
);

/**
 * The open detail once it is this path's: the fetched entry whose file is the
 * URL's own. The path check keeps a slow previous detail from rendering under
 * this route's heading.
 *
 * The variant is deliberately not checked, the same way the prompt route
 * leaves it unchecked: `get-file-detail` is addressed by the path alone and
 * answers with the first variant its fixed order reaches, which is that
 * function's business rather than this surface's (session.ts § fileDetail).
 */
const openDetail = computed(() => {
  const detail = entryDetail.value;
  return detail !== null && detail.file.sourceRelativePath === openPath.value ? detail : null;
});

/**
 * One adopted detail's own parse — the metadata and the instructions the
 * admitting rule split it into — or null exactly when extraction failed
 * all-or-nothing (FR-028).
 *
 * A plain function rather than a computed, because a computed here would be a
 * second cache: {@link openView} is the one derivation that releases with the
 * detail, and an inner computed its null branch never reads would hold the
 * previous file's parse until something read it again (FR-027).
 *
 * A variant of another kind is read too, and mapped rather than discarded: one
 * physical file can hold two recognitions, and `get-file-detail` is addressed
 * by the path alone and answers with the first variant its fixed order reaches
 * (session.ts § fileDetail). A `.claude/agents/CLAUDE.md` is the shipped case —
 * a Claude subagent by its directory and a Claude instruction file by its
 * name — and it arrives here as the instructions variant. Its
 * `MarkdownPresentationDto` holds the same two values this page draws, from
 * the same one parse: the frontmatter block is what a Markdown agent declares
 * and the body is the system prompt it runs with, which is exactly the split
 * `ClaudeCompiledAgentRule` performs. Requiring this route's own variant would
 * report a parsed file as unparsed.
 *
 * The mapping is unreachable for a Codex agent: a `.toml` is admitted by no
 * Markdown-kind rule, so nothing but an agent variant can arrive for one.
 */
function presentationOf(detail: FileDetailDto): AgentPresentationDto | null {
  if (detail.kind === 'rule' || detail.kind === 'settings/config' || detail.kind === 'file') {
    return null;
  }
  if (detail.kind === 'agent') {
    return detail.presentation;
  }
  return detail.presentation === null
    ? null
    : {
        metadata: detail.presentation.frontmatter,
        instructionsText: detail.presentation.bodyText,
      };
}

/**
 * The metadata as the YAML document the detail renders (FR-007,
 * frontmatter-yaml.ts): every declared key the file wrote, led by
 * {@link LEADING_AGENT_METADATA_KEYS} and otherwise in the file's own order, spelled in
 * the language the Markdown-writing products declare in, so one agent surface
 * reads the same whichever product's file is open. A Codex agent declares in
 * TOML and its complete authored source is one tab away, which is what keeps
 * this half about the resolved values rather than about a syntax.
 */
const metadataText = (metadata: readonly DeclaredEntryDto[]): string => {
  const rank = (entry: DeclaredEntryDto): number => {
    // Only a string key can be one of the leading keys: a numeric key
    // spelling `name` is a different key (api-types.ts § DeclaredKeyKind).
    const index = entry.keyKind === 'string' ? LEADING_AGENT_METADATA_KEYS.indexOf(entry.key) : -1;
    return index === -1 ? LEADING_AGENT_METADATA_KEYS.length : index;
  };
  // `toSorted` is stable, so the keys past the leaders keep authored order.
  return frontmatterYamlText(metadata.toSorted((left, right) => rank(left) - rank(right)));
};

/**
 * The whole open view as one derivation, null when this route holds no
 * detail: the adopted detail, the parse it carries, and the two documents the
 * two halves render.
 *
 * One computed rather than one per projection, because its release is its next
 * read: a dirty computed retains its previous value until then, so a
 * per-projection computed that only the detail branch reads would keep the
 * previous file's authored metadata and instructions cached behind whatever
 * replaced them — a dead file's credentials still reachable after the
 * generation that removed it (FR-027). Bundled here and read by the template's
 * branch condition on every render, the view re-derives to null on the first
 * render after the detail is dropped, in the same flush that takes the
 * rendered content out of the DOM. The comparison route's `readyView` is the
 * same arrangement for the same reason.
 */
const openView = computed(() => {
  const detail = openDetail.value;
  if (detail === null) {
    return null;
  }
  const presentation = presentationOf(detail);
  return {
    detail,
    presentation,
    metadataText: presentation === null ? '' : metadataText(presentation.metadata),
    // Only an empty string counts as no instructions: prose of whitespace is
    // what the file wrote, and calling it none would report a shortened value
    // as the whole (FR-025).
    instructionsAreEmpty: (presentation?.instructionsText ?? '') === '',
  };
});

/**
 * The diagnostics of the open file. The detail response states each record
 * once — a failed extraction is one (file, kind) record (FR-028) — so the list
 * renders as published.
 */
const openDiagnostics = computed(() => openDetail.value?.diagnostics ?? []);

/**
 * The two halves of this kind's detail, as the tab strip presents them: what
 * the parse read out of the file, and the complete file itself.
 */
const AGENT_DETAIL_TABS = ['agent', 'file'] as const;

/** Which half is in view; see {@link AGENT_DETAIL_TABS}. */
type AgentDetailTab = (typeof AGENT_DETAIL_TABS)[number];

/** The label each tab shows. */
const AGENT_DETAIL_TAB_TEXT: Readonly<Record<AgentDetailTab, string>> = {
  /** Label for the panel holding the file's declarations. */
  agent: 'Agent',
  /** Label for the panel holding the complete authored file. */
  file: 'File',
};

const activeTab = ref<AgentDetailTab>('agent');

/** The page's root, for the focus guards below. */
const pageRoot = ref<HTMLElement | null>(null);

/** The `id` of the panel a tab controls (WCAG 4.1.2). */
function agentTabPanelId(tab: AgentDetailTab): string {
  return `aci-agent-panel-${tab}`;
}

/** The `id` of the tab that controls {@link agentTabPanelId}'s panel. */
function agentTabId(tab: AgentDetailTab): string {
  return `aci-agent-tab-${tab}`;
}

/**
 * Arrow keys move the selection, matching the WAI-ARIA tabs pattern. Selection
 * follows focus because switching panels issues no request and loses no work:
 * both halves are already in hand.
 */
function onTabKeydown(event: KeyboardEvent, index: number): void {
  const next = nextTabForKey(event.key, AGENT_DETAIL_TABS, index);
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior; swallowing
    // it here would break Tab out of the strip.
    return;
  }
  event.preventDefault();
  activeTab.value = next;
  document.getElementById(agentTabId(next))?.focus();
}

/**
 * Opening a file starts on what it declares — unless its extraction failed,
 * where that panel has nothing parsed to show and the complete source is the
 * honest landing (FR-028): the failure's diagnostic stays visible on both.
 *
 * The detail's arrival is where that is decided, because it is the first
 * moment there is anything to decide between: the strip is rendered beside the
 * detail, so until one is in hand no tab is on screen to have been chosen.
 */
watch(openDetail, (detail) => {
  if (detail !== null) {
    activeTab.value = detail !== null && presentationOf(detail) !== null ? 'agent' : 'file';
  }
});

/**
 * What a screen reader announces the heading as. The accessible-name
 * computation collapses whitespace, so two paths differing only in consecutive
 * or edge spaces would announce as one heading; the inline label spells such a
 * run out instead, while the visible heading keeps the authored spelling
 * (FR-025).
 */
const headingAccessibleText = computed(() =>
  openPath.value === '' ? kindText : inlinePresentationLabel(openPath.value),
);

/**
 * What this route says when its own request failed, or null when none has: the
 * failing state's statement, then the failure's own message. One value, read by
 * both the visible paragraph and the live region, so what a reader hears is the
 * sentence that is on the screen.
 */
const detailFailure = computed<string | null>(() => {
  const statement =
    openDetail.value === null && detailState.value === 'idle'
      ? 'This file could not be loaded.'
      : null;
  if (statement === null) {
    return null;
  }
  return detailError.value === null ? statement : `${statement} ${detailError.value}`;
});

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus (WCAG 4.1.3): the stale state, the
 * in-flight load, and a request that failed. Each phrase matches the visible
 * copy; ready content is read as focus moves through it.
 */
const detailAnnouncement = computed(() => {
  if (detailState.value === 'stale' || owner.value.length === 0) {
    return 'Nothing in the current scan sits at this link’s path.';
  }
  if (detailFailure.value !== null) {
    return detailFailure.value;
  }
  if (detailState.value === 'loading') {
    return 'Loading this file…';
  }
  return '';
});

/** The page heading, focused on entry so a keyboard user starts at the top. */
const heading = ref<HTMLHeadingElement | null>(null);

/** Set as the route is left, so the focus guards yield to the next route. */
let leaving = false;

const pageOwnership = usePageOwnership();

/**
 * Requests the file the URL currently names. The route watcher below calls it
 * on every selection, and the failed-load branch calls it again as the retry.
 * The one file is both arguments: this kind has no companion to read from it.
 */
const requestOpen = (): void => {
  if (owner.value.length === 0) {
    return;
  }
  void pageOwnership.openFileDetail(openPath.value, openPath.value);
};

// One effect owns "which file should be open", so entering the route and a
// history step between files of this kind take the same path. The committed
// generations are part of what "open" means: adopting a newer one closes the
// open detail while the path stays identical, so their change is what
// re-requests the same path under the new snapshot.
watch(
  [
    openPath,
    (): boolean => owner.value.length > 0,
    (): number => snapshot.value?.repositoryGeneration ?? 0,
    (): number | null => snapshot.value?.globalGeneration ?? null,
  ],
  ([path, ownerPresent]) => {
    if (path === '' || !ownerPresent) {
      // The URL names nothing this generation holds. Dropping what is open is
      // the point: the page shows the recoverable state below, and holding
      // authored content the reader navigated away from would keep it in
      // memory for nothing.
      pageOwnership.close();
      return;
    }
    requestOpen();
  },
  { immediate: true },
);

// Focus moves to the heading when the page is entered or the open file
// changes: following a link in an SPA moves no focus by itself.
function focusHeading(): void {
  heading.value?.focus();
}

onMounted(focusHeading);
watch(openPath, () => void nextTick(focusHeading));

/**
 * What the document title says this page is showing (WCAG 2.4.2): the path the
 * heading shows while a file is open, and the state the page is in otherwise,
 * so a reader returning to a tab is never told it shows a file the link no
 * longer resolves. The raw path, not the escaped spelling: the shell escapes
 * its subject exactly once at the rendering boundary. Null when the escaped
 * spelling would draw nothing — the shell then titles the tab by this route's
 * surface name, because the spelled-out presentation the heading falls back to
 * contains backslashes the shell's escaping would double.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return 'Loading a custom-agent file';
  }
  if (detailState.value === 'stale' || owner.value.length === 0) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Custom-agent file could not be loaded';
  }
  return pathIsSpelledOut.value ? null : openPath.value;
});
watchEffect(() => {
  // Reported as this page instance's own, so an outgoing page's unmount cannot
  // erase what this page just titled the tab with
  // (`SessionViewState.reportPageSubject`).
  pageOwnership.reportSubject(titleSubject.value);
});

/**
 * The failed-load retry. Separate from {@link requestOpen} because the button
 * this click comes from vanishes with the failed branch the moment the state
 * returns to loading, and focus would drop to the document body (WCAG 2.4.3);
 * the heading is the landmark that survives the transition.
 */
const retryOpen = (): void => {
  focusHeading();
  requestOpen();
};

// A generation replacement drops a detail that was on screen — the tabs and
// the viewer unmount — without moving the URL, so if keyboard focus is inside
// that subtree it would drop to the document body (WCAG 2.4.3). Only an
// actually-departing detail moves focus: a request that fails before anything
// was shown unmounts nothing but the loading line, and the reader may be on
// the surviving back link — an error is announced through the live region,
// never by forcing focus. The path condition keeps this guard out of a history
// step to another file of this kind, whose own `openPath` watcher focuses the
// heading after the flush. Synchronous, because afterwards the focused element
// is already gone.
watch(
  openDetail,
  (detail, previous) => {
    if (
      detail === null &&
      previous !== null &&
      previous.file.sourceRelativePath === openPath.value &&
      !leaving &&
      pageRoot.value?.contains(document.activeElement) === true &&
      document.activeElement !== heading.value
    ) {
      focusHeading();
    }
  },
  { flush: 'sync' },
);

// The stale transition replaces the whole body of the page below the heading —
// the loading line or the detail alike — so its guard watches the state itself
// and considers the whole page root (WCAG 2.4.3).
watch(
  [detailState, owner],
  ([state, resolved]) => {
    if (
      (state === 'stale' || resolved.length === 0) &&
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
  // drop, after unmount, where the focus guards above are naturally inert and
  // a replacement page's own report or open stands.
});
</script>

<template>
  <div ref="pageRoot" class="aci-agent-detail">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the
         custom-agents list rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=agent">Back to the inventory</NuxtLink></p>

    <div class="aci-agent-detail__title">
      <h2 ref="heading" tabindex="-1" :aria-label="headingAccessibleText">
        <!-- The file's path heads the page — the row's own identity, in the
             same spelling the inventory lists: escaped for presentation, never
             a locator anything can open (FR-024, FR-030). A path whose escaped
             spelling draws nothing is spelled out in full instead — a spelled
             presentation, not the authored run, so it drops the authored-text
             treatment (data-model.md § SourceRelativePath) — and a URL with no
             path segments at all is headed by the kind, so the heading always
             describes the page (WCAG 2.4.6). -->
        <template v-if="openPath === ''">{{ kindText }}</template>
        <span v-else class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{
          pathText
        }}</span>
      </h2>
      <!-- Beside the path, because the path is what it opens. Outside the
           heading so it does not join the heading's accessible name: a reader
           hearing the page's landmarks should hear the file, not an action on
           it (WCAG 2.4.6). -->
      <OpenFileButton
        v-if="openView !== null"
        :source-relative-path="openView.detail.file.sourceRelativePath"
      />
    </div>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ detailAnnouncement }}
    </p>

    <template v-if="detailState === 'loading'">
      <p class="aci-empty">Loading this file…</p>
    </template>

    <template v-else-if="detailState === 'stale' || owner.length === 0">
      <p class="aci-error">
        Nothing in the current scan sits at this link's path. The inventory may have changed since
        the link was made; a rescan that brings the path back will make it resolve again.
      </p>
      <p>
        <NuxtLink to="/?kind=agent">Return to the inventory and open it again.</NuxtLink>
      </p>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request — the
         shell reports what happened to the session, so neither hides or
         repeats the other. -->
    <template v-else-if="openView === null">
      <p class="aci-error">{{ detailFailure }}</p>
      <p>
        <button type="button" @click="retryOpen">Try again</button>
      </p>
    </template>

    <template v-else>
      <div class="aci-agent-detail__overview">
        <!-- Which products recognize the file, restated from the row so the
             page and the list agree, beside the kind's own caption (FR-007).
             No product is quoted for what it would spawn or inherit: existence
             is what an admission proves (FR-009). -->
        <p class="aci-agent-detail__recognition">{{ toolsText }} · {{ kindText }}</p>

        <!-- The name each inventory row this file is listed under carries —
             the declared `name` where the product makes it the agent's
             identity, the configuration file's own name where the product
             deduplicates by that instead — so a file that publishes none says
             so rather than borrowing a fact its product does not use. Naming
             it is not a claim that a spawn would select this agent (FR-009). -->
        <p class="aci-agent-detail__agent-name aci-note">
          <template v-if="agentNamesText !== null"
            >{{ agentNamesLabel }}:
            <span :class="agentNamesAreAuthored ? 'aci-authored-text' : 'aci-muted'">{{
              agentNamesText
            }}</span></template
          >
          <template v-else>{{ noAgentNameText }}</template>
        </p>

        <!-- The comparison entry for this file (FR-011): present exactly when
             the current scan holds another readable file that resolves one of
             this file's names. The comparison surface's own pickers take over
             from there. -->
        <p v-for="pair in comparePairRoutes" :key="pair.key">
          <NuxtLink :to="pair.route" :aria-label="`Compare this file: ${pair.nameAccessibleText}`"
            >Compare this file</NuxtLink
          >
        </p>
      </div>

      <!-- Two subjects, two tabs: what the parse read out of the file, and
           the complete file itself. A real `tablist`, with the roving tabindex and
           arrow keys the WAI-ARIA tabs pattern specifies (QR-004,
           contracts/accessibility-acceptance.md). -->
      <div class="aci-kind-tabs" role="tablist" aria-label="Custom agent detail">
        <button
          v-for="(tab, index) in AGENT_DETAIL_TABS"
          :id="agentTabId(tab)"
          :key="tab"
          class="aci-kind-tab"
          type="button"
          role="tab"
          :aria-controls="agentTabPanelId(tab)"
          :aria-selected="tab === activeTab"
          :tabindex="tab === activeTab ? 0 : -1"
          @click="activeTab = tab"
          @keydown="onTabKeydown($event, index)"
        >
          {{ AGENT_DETAIL_TAB_TEXT[tab] }}
        </button>
      </div>

      <!-- Both panels stay in the document and the unselected one is hidden,
           so Monaco keeps its model and the reader's scroll position across a
           tab switch, and both `aria-controls` IDREFs resolve. -->
      <div
        v-show="activeTab === 'agent'"
        :id="agentTabPanelId('agent')"
        role="tabpanel"
        :aria-labelledby="agentTabId('agent')"
        tabindex="0"
      >
        <!-- A failed extraction leaves this panel with nothing parsed to show;
             its Diagnostic is what says so, and the complete source is one tab
             away (FR-028). -->
        <ul
          v-if="openView.presentation === null && openDiagnostics.length > 0"
          class="aci-list"
          role="list"
        >
          <li
            v-for="diagnostic in openDiagnostics"
            :key="diagnostic.diagnosticId"
            :class="
              DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'
            "
          >
            {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
          </li>
        </ul>

        <!-- The declarations lead the two halves, and the kind's comparison
             leads with the same half, so the two surfaces read alike
             (`components/custom-agent-comparison/`). -->
        <div v-if="openView.presentation" class="aci-agent-detail__metadata">
          <h3>Metadata</h3>
          <p v-if="openView.presentation.metadata.length === 0" class="aci-note">
            This file declares none.
          </p>
          <!-- The declared keys as one read-only YAML document in the file's
               own order (FR-007), through the same viewer the instructions
               use — sized to the block, because an agent's metadata is short
               (SourceViewer § fitContent). Every value stays the characters
               the file wrote: a credential is not masked and an environment
               reference is not resolved (FR-025, FR-026), and no key is
               captioned, classified, or explained. -->
          <SourceViewer
            v-else
            :source-text="openView.metadataText"
            :source-relative-path="openPath"
            content-label="Metadata of"
            content-language="yaml"
            fit-content
          />
        </div>
        <div v-if="openView.presentation" class="aci-agent-detail__instructions">
          <h3>Instructions</h3>
          <p v-if="openView.instructionsAreEmpty" class="aci-note">This file gives none.</p>
          <!-- The instructions as the Markdown they are written in. The
               language is named rather than resolved from the path, because a
               Codex agent's `.toml` suffix says TOML while the prose inside it
               is Markdown (SourceViewer § contentLanguage). Highlighting is
               tokenizing, not rendering: no heading becomes large, no link
               becomes clickable, and no image loads (FR-033). A name the
               instructions mention stays text: nothing is resolved to a skill,
               an MCP server, or another agent (FR-019). -->
          <SourceViewer
            v-else
            :source-text="openView.presentation.instructionsText"
            :source-relative-path="openPath"
            content-label="Instructions of"
            content-language="markdown"
          />
        </div>
      </div>

      <div
        v-show="activeTab === 'file'"
        :id="agentTabPanelId('file')"
        role="tabpanel"
        :aria-labelledby="agentTabId('file')"
        tabindex="0"
      >
        <!-- What the read produced, and nothing else. The file below is the
             file; a viewer that narrated what a file might contain would be
             telling the reader about their own repository (FR-027). -->
        <p class="aci-note">
          {{ FILE_ENCODING_TEXT[openView.detail.file.encoding]
          }}<template v-if="openView.detail.file.encoding !== 'unknown'">
            · {{ openView.detail.file.sizeBytes }} bytes</template
          ><template
            v-if="isReadableFile(openView.detail.file) && openView.detail.file.hadLeadingBom"
          >
            · byte-order mark removed before decoding</template
          >
        </p>

        <ul v-if="openDiagnostics.length > 0" class="aci-list" role="list">
          <li
            v-for="diagnostic in openDiagnostics"
            :key="diagnostic.diagnosticId"
            :class="
              DIAGNOSTIC_REGISTRY[diagnostic.code].severity === 'error' ? 'aci-error' : 'aci-note'
            "
          >
            {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
          </li>
        </ul>

        <!-- Only the readable variants carry text. An unreadable file has no
             source to show and its diagnostic above says why. -->
        <SourceViewer
          v-if="isReadableFile(openView.detail.file)"
          :source-text="openView.detail.file.sourceText"
          :source-relative-path="openView.detail.file.sourceRelativePath"
        />
        <p v-else class="aci-note">This file has no source text to show.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The detail reads top to bottom: what the file is, what it declares, what it
   instructs, then the complete file. It scrolls as a page rather than fitting
   the viewport, the same trade the instruction detail makes. */
.aci-agent-detail {
  display: flex;
  flex-direction: column;
}

/* The heading block is chrome, and every line of it is a line the file does
   not get, so it is tighter here than the shell's default heading spacing. */
.aci-agent-detail > p:first-child {
  margin: 0;
}

/* The recognition caption line, weighted like a heading within the overview:
   it says which products' recognition the page restates. */
.aci-agent-detail__recognition {
  font-weight: 600;
  margin: 0;
}

.aci-agent-detail__overview {
  border-bottom: 1px solid var(--aci-border);
  padding-bottom: 0.5rem;
}

/* The two halves of the parse, inside the tab that holds them. */
.aci-agent-detail__metadata,
.aci-agent-detail__instructions {
  padding-block-start: 0.75rem;
}

.aci-agent-detail__metadata > h3,
.aci-agent-detail__instructions > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* The path and the link that opens it on one line, wrapping together when the
   path is long: the authored path may have no break opportunities of its own,
   and without the wrap a long one forces sideways scrolling at narrow widths
   and 200% zoom (WCAG 1.4.10). */
.aci-agent-detail__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-block-end: 0.5rem;
}

/* Tighter than the shell's section-heading baseline, because the heading block
   is chrome. */
.aci-agent-detail h2 {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}
</style>
