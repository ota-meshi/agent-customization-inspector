<script setup lang="ts">
// The MCP detail route (T302), in two views. With `?server=<name>` the page
// is one declaration record's own detail — the kind's row unit — headed by
// the declared server name and showing that declaration's fields by the keys
// the carrier wrote. Without the query it is the carrier's file-unit view:
// the file facts and every declaration the file makes, which is where a
// declarationless carrier's record lands. Both resolve the same wire detail:
// the declaration set is the carrier's own — one parse, one response — and
// the path is the wire identity (FR-030).
//
// Unlike every other detail this page has no file tab and no viewer of the
// file's own bytes: a file admitted so its declarations can be published
// shows those declarations and never its source, and the wire backs that
// structurally — the carrier detail is `get-mcp-carrier-detail`'s own
// result, whose shape carries no `sourceText` field (FR-007). The only
// editors on the page show each declaration serialized as the JSON document
// a reader can paste into their own carrier (declared-entries-json.ts).
//
// The declared values render exactly as authored — credentials included, with
// nothing masked and no control that would uncover a masked value — and no
// environment reference is resolved: the files are the reader's own, over a
// loopback-bound session (FR-026, FR-027). Nothing here connects to, starts,
// or probes a declared server, and nothing projects trust, precedence, or a
// selected winner: what the vendor documents stays in its maintained contract
// (FR-009).
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
import { declaredEntriesJsonText } from '../../components/declared-entries-json';
import {
  decodeDetailRoutePath,
  detailRoute,
  fromJsonStringBody,
} from '../../components/detail-route';
import { usePageOwnership } from '../../composables/page-ownership';
import { VENDOR_SURFACE_TEXT } from '../../../shared/registries/behavior-text';
import { SESSION_VIEW_STATE } from '../../session/view-state';
import { mcpComparisonRouteFor } from '../../composables/mcp-comparison';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import {
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
  isReadableFile,
  pathPresentationLabel,
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
 * The Source-relative path from the URL's catch-all segments — the carrier's
 * identity and the whole route identity (FR-030). The router hands the
 * segments over individually and decoded, so joining them with `/` restores
 * the published spelling exactly.
 */
const openPath = computed((): string => {
  const parameter = route.params['path'];
  // Each segment arrives percent-decoded but still spelled as the well-formed
  // text the link carried, so the escape the encoder applied is undone here:
  // a lone surrogate in an authored entry name round-trips to the path the
  // inventory published (`detail-route.ts`).
  return decodeDetailRoutePath(typeof parameter === 'string' ? [parameter] : (parameter ?? []));
});

/**
 * The declared server name the URL selects, or null for the carrier view.
 * `?server=<name>` addresses one declaration record — the inventory's row
 * unit — the same way the inventory's own kind selection lives in the query;
 * an array value (a repeated parameter) selects nothing rather than guessing
 * which repetition was meant.
 */
const openServerName = computed((): string | null => {
  const parameter = route.query['server'];
  // The query spelling is `toJsonStringBody`'s: decoding it here is
  // what lets a name the URL cannot carry raw — a lone surrogate strict JSON
  // resolves from an authored escape — select its own declaration.
  return typeof parameter === 'string' ? fromJsonStringBody(parameter) : null;
});

const carrierDetail = sessionViewState.carrierDetail;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
const snapshot = sessionViewState.snapshot;

/**
 * The MCP inventory entry the URL's path names, or null when the committed
 * inventory holds none there. Resolved from the snapshot rather than from a
 * fetched detail because the entry has to be known before anything is
 * requested: it carries the recognizing product this page states, and a path
 * the inventory does not list is the same dead link the host would answer,
 * reportable without a doomed request.
 */
const owner = computed(() => {
  const entries = snapshot.value?.mcp ?? [];
  if (openServerName.value !== null) {
    // The declaration view resolves through its name's own row: the selected
    // name must be a published row, and the URL's carrier one of the
    // declarations resolving it. A failed carrier publishes no named
    // declaration, so a link into one reports the dead-link state below
    // rather than a page about rows the scan could not read.
    return (
      entries
        .find((entry) => entry.name === openServerName.value)
        ?.declarations.find((declaration) => declaration.sourceRelativePath === openPath.value) ??
      null
    );
  }
  // The carrier view resolves through any row listing the path — a named row
  // or the no-name row a declarationless carrier sits on.
  for (const entry of entries) {
    const declaration = entry.declarations.find(
      (candidate) => candidate.sourceRelativePath === openPath.value,
    );
    if (declaration !== undefined) {
      return declaration;
    }
  }
  return null;
});

/**
 * Whether any committed MCP row lists a declaration at the URL's path — what
 * separates the two dead links below: a name the carrier no longer publishes,
 * against a path the inventory does not hold at all.
 */
const carrierListed = computed(() =>
  (snapshot.value?.mcp ?? []).some((entry) =>
    entry.declarations.some((declaration) => declaration.sourceRelativePath === openPath.value),
  ),
);

/**
 * The comparison entry for one of this carrier's declared names (FR-011):
 * that name's declaration here beside the same name's declaration in the
 * first other carrier of its row — the comparison never leaves the name's
 * row, exactly as a skill's entry link stays inside its name's row
 * (data-model.md § Inventory unit), and every carrier of a named row is
 * comparison-eligible (FR-025) because its declarations are parsed
 * (api-types.ts § McpDeclarationDto.parseStatus). Null when the name's row
 * holds no second carrier; the comparison surface's own pickers take over
 * from there.
 */
function compareRouteForName(name: string): ReturnType<typeof mcpComparisonRouteFor> | null {
  const row = (snapshot.value?.mcp ?? []).find((entry) => entry.name === name);
  let counterpart: string | null = null;
  for (const declaration of row?.declarations ?? []) {
    if (declaration.sourceRelativePath !== openPath.value) {
      counterpart = declaration.sourceRelativePath;
      break;
    }
  }
  return counterpart === null ? null : mcpComparisonRouteFor(name, openPath.value, counterpart);
}

/**
 * The declaration view's own comparison entry: the open server name's, or
 * null on the carrier view — where each server block carries its own link —
 * and when the name's row holds no counterpart.
 */
const openServerCompareRoute = computed(() =>
  openServerName.value === null ? null : compareRouteForName(openServerName.value),
);

/** Whether the URL resolves in the committed inventory; see {@link owner}. */
const linkResolved = computed(() => owner.value !== null);

/**
 * The path as the heading shows it, through the one label rule every surface
 * that draws a path uses ({@link pathPresentationLabel}).
 */
const pathText = computed(() => pathPresentationLabel(openPath.value));

/**
 * Whether {@link pathText} is the spelled-out form rather than the file's own
 * spelling. The label then draws this product's characters instead of the
 * reader's, so it is not authored text and does not title the tab.
 */
const pathIsSpelledOut = computed(() => pathText.value !== escapeControlCharacters(openPath.value));

/**
 * The carrier's file-unit route, which the declaration view's owner line
 * links to — the same destination the record's carrier line offers.
 */
const carrierRoute = computed(() => detailRoute('MCP', openPath.value));

/**
 * The selected declaration's name as the heading shows it, through the same
 * label rule the record uses, or null for the carrier view. The empty name —
 * strict JSON accepts `""` as a server name — gets the same note its
 * inventory row shows, because the label rule has no characters to spell out.
 */
const serverNameText = computed(() =>
  openServerName.value === null
    ? null
    : openServerName.value === ''
      ? '(empty name)'
      : pathPresentationLabel(openServerName.value),
);

/**
 * The heading's accessible name, through the single-line label rule: an
 * accessible name collapses whitespace, so two invisibly different authored
 * names — `"db"` and `" db"` — would otherwise announce as one heading
 * (FR-025). The visible heading keeps the authored spelling.
 */
const headingAccessibleText = computed(() =>
  openPath.value === ''
    ? CUSTOMIZATION_KIND_TEXT.MCP
    : openServerName.value !== null
      ? openServerName.value === ''
        ? '(empty name)'
        : inlinePresentationLabel(openServerName.value)
      : inlinePresentationLabel(openPath.value),
);

/**
 * Whether {@link serverNameText} is the spelled-out form rather than the
 * authored key; the spelled form is this product's characters and does not
 * title the tab.
 */
const serverNameIsSpelledOut = computed(
  () =>
    openServerName.value !== null &&
    serverNameText.value !== escapeControlCharacters(openServerName.value),
);

/**
 * The recognizing products beside the kind's own caption, restated from the
 * inventory entry so the page and the list agree (FR-007) — every product
 * whose declaration at this path the URL's view covers, each with the
 * surfaces its admission rests on, because one physical carrier can be two
 * products' declaration file at once (the root `.mcp.json` is Claude's
 * project file and a Copilot CLI workspace file). No product is quoted for
 * what it would enable, trust, or connect to: existence is what an admission
 * proves (FR-009).
 */
const ownerText = computed(() => {
  const entries = snapshot.value?.mcp ?? [];
  const declarations = entries
    .filter((entry) => openServerName.value === null || entry.name === openServerName.value)
    .flatMap((entry) => entry.declarations)
    .filter((declaration) => declaration.sourceRelativePath === openPath.value);
  const byTool = new Map<string, string>();
  for (const declaration of declarations) {
    const surfaces = declaration.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', ');
    byTool.set(declaration.tool, `${SUPPORTED_TOOL_TEXT[declaration.tool]} (${surfaces})`);
  }
  return [...byTool.values()].join(', ');
});

/**
 * The open carrier detail once it is this path's: the carrier slot is typed
 * as this route's own result — the shape with no `sourceText` field (FR-007)
 * — so no kind narrowing exists here, and the path check keeps a slow
 * previous detail from rendering under this route's heading.
 */
const openDetail = computed(() => {
  const detail = carrierDetail.value;
  return detail !== null && detail.file.sourceRelativePath === openPath.value ? detail : null;
});

/**
 * The declarations with the rendering each one's block needs: the server name
 * heads its section — through the shared label rule, so a name of invisible
 * code points still identifies it — and the fields render through the same
 * recursive block every declaration surface uses.
 */
const serverBlocks = computed(() =>
  (openDetail.value?.servers ?? [])
    .filter((server) => openServerName.value === null || server.name === openServerName.value)
    .map((server) => ({
      key: server.name,
      // The empty name gets the same note its inventory row and this page's
      // heading show; every other name is the authored spelling.
      nameText: server.name === '' ? '(empty name)' : pathPresentationLabel(server.name),
      nameIsAuthored: server.name !== '',
      // The single-line label rule for the heading's accessible name: an
      // accessible name collapses whitespace, so two invisibly different
      // authored names would otherwise announce identically (FR-025).
      nameAccessibleText:
        server.name === '' ? '(empty name)' : inlinePresentationLabel(server.name),
      // Which products read this declaration, from the committed inventory —
      // the carrier detail serves the union of the readings, and since the
      // CLI's bare schema exists the readings of one shared file can differ,
      // so each block states its own readers the way the inventory row does
      // (FR-009 names no winner; this names the documented readers).
      toolsText: (snapshot.value?.mcp ?? [])
        .filter((entry) => entry.name === server.name)
        .flatMap((entry) => entry.declarations)
        .filter((declaration) => declaration.sourceRelativePath === openPath.value)
        .map(
          (declaration) =>
            `${SUPPORTED_TOOL_TEXT[declaration.tool]} (${declaration.surfaces
              .map((surface) => VENDOR_SURFACE_TEXT[surface])
              .join(', ')})`,
        )
        .join(', '),
      // The declaration as the pretty-printed JSON a reader can paste into
      // their own carrier (declared-entries-json.ts): the keys the file
      // wrote, in the file's own order, every value as resolved (FR-007). A
      // fieldless declaration is the empty object `{}`, an authored fact
      // shown rather than a blank panel.
      jsonText: declaredEntriesJsonText(server.fields),
      // The carrier view's per-server comparison entry (FR-011): each name
      // compares within its own row, so the link is the block's rather than
      // the page's. The declaration view leaves it null — its one link is
      // the overview's ({@link openServerCompareRoute}).
      compareRoute: openServerName.value === null ? compareRouteForName(server.name) : null,
    })),
);

/** Whether extraction failed: the rows are unknown rather than absent (FR-028). */
const declarationsFailed = computed(
  () => openDetail.value !== null && openDetail.value.servers === null,
);

/**
 * The diagnostics of the open carrier. The detail response states each record
 * once — a failed extraction is one (file, kind) record (FR-028) — so the
 * list renders as published.
 */
const openDiagnostics = computed(() => openDetail.value?.diagnostics ?? []);

/**
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
 */
const detailFailure = computed<string | null>(() => {
  const statement =
    openDetail.value === null && detailState.value === 'idle'
      ? openServerName.value === null
        ? 'This MCP carrier could not be loaded.'
        : 'This MCP server declaration could not be loaded.'
      : null;
  if (statement === null) {
    return null;
  }
  return detailError.value === null ? statement : `${statement} ${detailError.value}`;
});

/**
 * What this page's polite live region announces — the states that change the
 * page without moving keyboard focus (WCAG 4.1.3). Each phrase matches the
 * visible copy; ready content is read as focus moves through it.
 */
const detailAnnouncement = computed(() => {
  if (detailState.value === 'stale' || !linkResolved.value) {
    return 'Nothing in the current scan matches this link.';
  }
  if (detailFailure.value !== null) {
    return detailFailure.value;
  }
  if (detailState.value === 'loading') {
    return openServerName.value === null
      ? 'Loading this MCP carrier…'
      : 'Loading this MCP server declaration…';
  }
  return '';
});

/** The page heading, focused on entry so a keyboard user starts at the top. */
const heading = ref<HTMLHeadingElement | null>(null);

/** The page's root, for the focus guards below. */
const pageRoot = ref<HTMLElement | null>(null);

/** Set as the route is left, so the focus guards yield to the next route. */
let leaving = false;

/**
 * Requests the carrier the URL currently names, through the carrier's own
 * function. The route watcher below calls it on every selection, and the
 * failed-load branch calls it again as the retry.
 */
const pageOwnership = usePageOwnership();

const requestOpen = (): void => {
  if (!linkResolved.value) {
    return;
  }
  void pageOwnership.openCarrierDetail(openPath.value);
};

// One effect owns "which carrier should be open", so entering the route and a
// history step between carriers take the same path; a committed generation is
// part of what "open" means, exactly as on the other detail routes.
watch(
  [
    openPath,
    openServerName,
    (): boolean => linkResolved.value,
    (): number => snapshot.value?.repositoryGeneration ?? 0,
    (): number | null => snapshot.value?.globalGeneration ?? null,
  ],
  ([path, , resolved]) => {
    if (path === '' || !resolved) {
      // The URL names nothing this generation holds; the page shows the
      // recoverable state below.
      pageOwnership.close();
      return;
    }
    // A step between two declarations of one carrier re-requests the same
    // path; the view state answers a held same-path detail without a second
    // fetch, so the step costs nothing.
    requestOpen();
  },
  { immediate: true },
);

// Focus moves to the heading when the page is entered or the open carrier
// changes: following a link in an SPA moves no focus by itself.
function focusHeading(): void {
  heading.value?.focus();
}

onMounted(focusHeading);
watch([openPath, openServerName], () => void nextTick(focusHeading));

/**
 * What the document title says this page is showing (WCAG 2.4.2); the same
 * subject rules the other detail routes follow.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return openServerName.value === null ? 'Loading an MCP carrier' : 'Loading an MCP server';
  }
  if (detailState.value === 'stale' || !linkResolved.value) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return openServerName.value === null
      ? 'MCP carrier could not be loaded'
      : 'MCP server declaration could not be loaded';
  }
  if (openServerName.value !== null) {
    return serverNameIsSpelledOut.value ? null : openServerName.value;
  }
  return pathIsSpelledOut.value ? null : openPath.value;
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
 * returns to loading, and focus would drop to the document body (WCAG 2.4.3).
 */
const retryOpen = (): void => {
  focusHeading();
  requestOpen();
};

// A generation replacement drops a detail that was on screen without moving
// the URL; if keyboard focus was inside that subtree it would fall to the
// document body (WCAG 2.4.3) — the same guards the other detail routes use.
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

watch(
  [detailState, linkResolved],
  ([state, resolved]) => {
    if (
      (state === 'stale' || !resolved) &&
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
  <div ref="pageRoot" class="aci-mcp-detail">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the MCP list
         rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=MCP">Back to the inventory</NuxtLink></p>

    <div class="aci-mcp-detail__title">
      <h2 ref="heading" tabindex="-1" :aria-label="headingAccessibleText">
        <!-- The record's own identity heads the page: the declared server name
             for a declaration view — the same spelling its inventory record
             shows — and the carrier's path for the file-unit view; either is
             escaped for presentation, never a locator anything can open
             (FR-024, FR-030). -->
        <template v-if="openPath === ''">{{ CUSTOMIZATION_KIND_TEXT.MCP }}</template>
        <span
          v-else-if="serverNameText !== null"
          :class="{ 'aci-authored-text': !serverNameIsSpelledOut }"
          >{{ serverNameText }}</span
        >
        <span v-else class="aci-path" :class="{ 'aci-authored-text': !pathIsSpelledOut }">{{
          pathText
        }}</span>
      </h2>
      <!-- The carrier view heads itself with the carrier's path, so the link
           that opens it belongs on that line. A declaration view is headed by
           a server name and carries the link beside its "Declared in" path
           below instead. -->
      <OpenFileButton
        v-if="openDetail !== null && openServerName === null"
        :source-relative-path="openDetail.file.sourceRelativePath"
      />
    </div>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ detailAnnouncement }}
    </p>

    <template v-if="detailState === 'loading'">
      <p v-if="openServerName === null" class="aci-empty">Loading this MCP carrier…</p>
      <p v-else class="aci-empty">Loading this MCP server declaration…</p>
    </template>

    <template v-else-if="detailState === 'stale' || !linkResolved">
      <!-- Two dead links, two sentences: a path the scan does not hold, and a
           held carrier that currently publishes no declaration by this name —
           which covers a carrier whose declarations could not be read, whose
           rows are unknown rather than absent (FR-028). -->
      <p v-if="carrierListed && openServerName !== null" class="aci-error">
        No declaration named this way is published for this file in the current scan. The carrier
        may have changed since the link was made — its declarations may even be unreadable right now
        — and a rescan that brings the name back will make it resolve again.
      </p>
      <p v-else class="aci-error">
        Nothing in the current scan sits at this link's path. The inventory may have changed since
        the link was made; a rescan that brings the path back will make it resolve again.
      </p>
      <p>
        <NuxtLink to="/?kind=MCP">Return to the inventory and open it again.</NuxtLink>
      </p>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request. -->
    <template v-else-if="openDetail === null">
      <p class="aci-error">{{ detailFailure }}</p>
      <p>
        <button type="button" @click="retryOpen">Try again</button>
      </p>
    </template>

    <template v-else>
      <div class="aci-mcp-detail__overview">
        <!-- Which product recognizes the carrier, restated from the inventory
             entry so the page and the list agree, beside the kind's own
             caption (FR-007). -->
        <p class="aci-mcp-detail__recognition">
          {{ ownerText }} · {{ CUSTOMIZATION_KIND_TEXT.MCP }}
        </p>
        <!-- The declaration view's comparison entry (FR-011): present
             exactly when this name's row holds another readable carrier to
             stand opposite this one. The comparison surface's own pickers
             take over from there. -->
        <p v-if="openServerCompareRoute !== null" class="aci-mcp-detail__compare">
          <NuxtLink :to="openServerCompareRoute">Compare this server's declarations</NuxtLink>
        </p>
        <!-- The declaration view states its owner-carrier identity — the
             record's own second line, linking to the carrier's file-unit
             view. -->
        <p v-if="openServerName !== null">
          Declared in
          <NuxtLink :to="carrierRoute" class="aci-path aci-authored-text">{{ pathText }}</NuxtLink>
          <!-- Beside the carrier's path, because that is the file it opens —
               the declaration this page is about lives inside it. -->
          <OpenFileButton :source-relative-path="openDetail.file.sourceRelativePath" />
        </p>
        <!-- Both views add what the read produced, and nothing else: the
             carrier's own file facts. Its source text is deliberately not on
             this page — or on the wire at all: a file admitted so its
             declarations can be published shows the declarations, never its
             bytes (FR-007). -->
        <p class="aci-note">
          {{ FILE_ENCODING_TEXT[openDetail.file.encoding]
          }}<template v-if="openDetail.file.encoding !== 'unknown'">
            · {{ openDetail.file.sizeBytes }} bytes</template
          ><template v-if="isReadableFile(openDetail.file) && openDetail.file.hadLeadingBom">
            · byte-order mark removed before decoding</template
          >
        </p>
      </div>

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

      <!-- An unreadable declaration block leaves the rows unknown rather than
           absent (FR-028): the diagnostic above says what happened, and no
           source panel stands in for the declarations. -->
      <p v-if="declarationsFailed" class="aci-muted">
        The declarations in this file could not be read.
      </p>
      <p v-else-if="serverBlocks.length === 0" class="aci-muted">
        This file declares no MCP servers.
      </p>

      <!-- The declarations: every one for the file-unit view, the selected
           one alone for a declaration view. Each section shows its fields as
           one JSON document in the parser's resolved order — commands, URLs,
           headers, environment values, exactly as authored, resolved against
           nothing (FR-026).
           The declaration view's name already heads the page, so its one
           section repeats no heading. -->
      <section v-for="server in serverBlocks" :key="server.key" class="aci-mcp-detail__server">
        <h3
          v-if="openServerName === null"
          :class="server.nameIsAuthored ? 'aci-authored-text' : 'aci-muted'"
          :aria-label="server.nameAccessibleText"
        >
          {{ server.nameText }}
        </h3>
        <!-- The products whose documented reading includes this declaration:
             the readings of one shared carrier can differ by schema, so the
             carrier view states each server's own readers rather than letting
             the page caption answer for every block (T353). -->
        <p v-if="openServerName === null" class="aci-muted">{{ server.toolsText }}</p>
        <!-- The carrier view's per-server comparison entry: the accessible
             name carries the server's name after the visible phrase, because
             a carrier view lists one such link per declared name and they
             would otherwise announce identically (WCAG 2.4.6; label-in-name
             keeps the visible phrase as the prefix). -->
        <p v-if="server.compareRoute !== null">
          <NuxtLink
            :to="server.compareRoute"
            :aria-label="`Compare this server's declarations: ${server.nameAccessibleText}`"
            >Compare this server's declarations</NuxtLink
          >
        </p>
        <!-- The declaration's fields as one read-only JSON document in the
             Monaco viewer — coloured by the `json` tokenizer a `.json`
             file's model gets (monaco-languages.ts, tokens-only) — in the
             spelling a reader pastes into their own carrier. JSON's own escaping is what keeps every
             character visible and transportable: a control character or
             lone surrogate is its escape, a newline is `\n` (FR-025,
             FR-026). The accessible name says which declaration of the
             carrier is showing, because a carrier view mounts one viewer
             per declared server (WCAG 2.4.6). -->
        <SourceViewer
          :source-text="server.jsonText"
          :source-relative-path="openPath"
          :content-label="`Declaration ${server.nameAccessibleText} of`"
          content-language="json"
          fit-content
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
/* The MCP detail reads top to bottom: what the carrier is, then one section
   per declaration. It scrolls as a page rather than fitting the viewport,
   the same trade the other detail routes make. */
.aci-mcp-detail {
  display: flex;
  flex-direction: column;
}

/* The heading block is chrome, and every line of it is a line the
   declarations do not get, so it is tighter here than the shell's default
   heading spacing. */
.aci-mcp-detail > p:first-child {
  margin: 0;
}

/* The recognition caption line, weighted like a heading within the overview:
   it says whose recognition the page restates. */
.aci-mcp-detail__recognition {
  font-weight: 600;
  margin: 0;
}

.aci-mcp-detail__overview {
  border-bottom: 1px solid var(--aci-border);
  padding-bottom: 0.5rem;
}

/* One block per declaration, separated by spacing alone: the declaration
   document draws its own frame (SourceViewer), and a panel border around it
   would draw a second one. */
.aci-mcp-detail__server {
  margin-block-start: 1.25rem;
}

.aci-mcp-detail__server > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* Tighter than the shell's section-heading baseline, because the heading
   block is chrome; the authored path may have no break opportunities of its
   own, and without the wrap a long one forces sideways scrolling at narrow
   widths and 200% zoom (WCAG 1.4.10). */
/* The heading and the link that opens the file it names on one line, wrapping
   together when the path is long. */
.aci-mcp-detail__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-block-end: 0.5rem;
}

.aci-mcp-detail h2 {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}
</style>
