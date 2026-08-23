<script setup lang="ts">
// The prompt and command detail route (T455):
// `/prompts-and-commands/<source-relative path>` — what one file of the kind
// declares, the prompt that follows, and the complete file those were read
// from.
//
// The file is the subject, and the page is headed by its Source-relative
// Path. The inventory unit is the name a reader invokes (data-model.md
// § Inventory unit), and this page states it under the heading — the answer of
// the rule that admitted the file, derived from the path for a command file
// and declared by a VS Code prompt file — but the file is what the page shows,
// so the path is what heads it. The URL carries no tool segment, so
// the path alone is the link's identity, stable across rescans and server
// launches (FR-030).
//
// The parse and the file are two tabs, not one column, exactly as the
// instruction detail splits them: the declarations and the prompt answer what
// the file tells a product, while the complete authored source is where every
// authored spelling stays readable — and stacking them would show the same
// text twice for a file with no frontmatter block.
//
// This surface shows file contents exactly as authored — credentials
// included, with nothing masked and no control that would uncover a masked
// value — and resolves no environment reference: the files are the reader's
// own, over a loopback-bound session (FR-025, FR-026, FR-027). A name the
// prompt mentions — an agent, a skill, another command — is text on this page
// like every other line: nothing is resolved, opened, imported, or run, and
// no target is read (FR-019, FR-033). Whether typing the name reaches this
// file at all turns on a same-name skill outranking a command, on which of two
// files declaring one prompt name the editor picks, and on runtime this tool
// never observes — so the name here is the one the vendor's own rule resolves
// and never a claim that it leads back here (FR-009).
//
// Leaving the route, a client-data purge, and a commit that replaces the
// generation all drop the open detail through the same cleanup the
// instruction route uses; only the URL survives a commit, and the page
// refetches the same path under the new generation.
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
import type { DeclaredEntryDto } from '../../../shared/api-types';
import { LEADING_PROMPT_FRONTMATTER_KEYS } from '../../components/inspection/declaration-order';
import { decodeDetailRoutePath } from '../../components/detail-route';
import { nextTabForKey } from '../../components/tab-navigation';
import { usePageOwnership } from '../../composables/page-ownership';
import { promptComparisonRouteFor } from '../../composables/prompt-comparison';
import { SESSION_VIEW_STATE } from '../../session/view-state';
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
  const parameter = route.params['path'];
  // Each segment arrives percent-decoded but still spelled as the well-formed
  // text the link carried, so the escape the encoder applied is undone here:
  // a lone surrogate in an authored entry name round-trips to the path the
  // inventory published (`detail-route.ts`).
  return decodeDetailRoutePath(typeof parameter === 'string' ? [parameter] : (parameter ?? []));
});

const entryDetail = sessionViewState.entryDetail;
const detailState = sessionViewState.fileDetailState;
/** This route's own failed request, which this page reports and announces. */
const detailError = sessionViewState.detailErrorMessage;
const snapshot = sessionViewState.snapshot;

/**
 * The commands inventory definitions the URL's path names — empty when the
 * committed inventory holds none there. Resolved from the snapshot rather
 * than from a fetched detail because they have to be known before anything is
 * requested: they carry the recognizing products and the names this page
 * states, and a path the inventory does not list is the same dead link the
 * host would answer, reportable without a doomed request.
 *
 * Gathered across rows rather than found in one, because a row is one name
 * and this page is one file: a file two products invoke by different names is
 * a definition on each of those names' rows, and the page is about the file
 * either way (data-model.md § Inventory unit).
 */
const owner = computed(() =>
  (snapshot.value?.prompts ?? []).flatMap((entry) =>
    entry.definitions
      .filter((definition) => definition.sourceRelativePath === openPath.value)
      .map((definition) => ({ name: entry.name, definition })),
  ),
);

/** The kind's own caption, for the heading and the recognition line. */
const kindText = CUSTOMIZATION_KIND_TEXT['prompt/command'];

/**
 * The comparison entry for this file (FR-011, T505): this file beside
 * another file of one of the rows it is listed under — the rows that own
 * every pair this file can be part of, exactly as a skill's entry link stays
 * inside its name's row. Null when this file is not readable or no row of
 * its own holds a readable counterpart; the compare route's own pickers take
 * over from there, so any other pair of the row is one pick away rather than
 * composed here.
 */
const comparePairRoute = computed(() => {
  const readable = new Set(
    (snapshot.value?.files ?? []).filter(isReadableFile).map((file) => file.sourceRelativePath),
  );
  if (!readable.has(openPath.value)) {
    return null;
  }
  for (const entry of snapshot.value?.prompts ?? []) {
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
      return promptComparisonRouteFor(openPath.value, counterpart);
    }
  }
  return null;
});

/** The inventory link that lands on the commands tab rather than the default. */
const inventoryRoute = '/?kind=prompt%2Fcommand';

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
 * The products that recognize this file and the surfaces they recognize it
 * on, restated from the row so the page and the list agree (FR-007). The
 * row's recognitions are already in the closed tool order and each one's
 * surfaces in the closed surface order.
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
 * The names this file is invoked by, restated from the rows it is listed
 * under so the page and the list agree (FR-007). One name while one product
 * recognizes the file, and the distinct names in row order when two products
 * derive different ones from the same path.
 *
 * Escaped like a path, because a derived one is made of path segments and a
 * declared one is authored text: both are the reader's own characters, and
 * both are shown as what they are (data-model.md § Inventory unit).
 */
const invocationNamesText = computed(() =>
  [...new Set(owner.value.map(({ name }) => escapeControlCharacters(name)))].join(', '),
);

/**
 * The open detail once it is this path's: the fetched entry whose file is the
 * URL's own. The path check keeps a slow previous detail from rendering under
 * this route's heading.
 *
 * The variant is deliberately not checked, the same way the rule route leaves
 * it unchecked: one file can hold recognitions of two kinds — a
 * `.claude/commands/CLAUDE.md` is a Claude command by its directory and a
 * Claude instruction file by its name, so it is a row in both inventories —
 * while `get-file-detail` is addressed by the path alone and answers with the
 * first variant its fixed order reaches.
 */
const openDetail = computed(() => {
  const detail = entryDetail.value;
  return detail !== null && detail.file.sourceRelativePath === openPath.value ? detail : null;
});

/**
 * The file's own presentation — the one scan-time parse, published on every
 * variant that carries one. Null when extraction failed all-or-nothing, and
 * null for a variant that publishes none: a rule file is served whole and a
 * custom agent publishes declarations without a body, so a file two kinds own
 * shows its complete source under the file tab either way (FR-028).
 */
const presentation = computed(() => {
  const detail = openDetail.value;
  if (
    detail === null ||
    detail.kind === 'rule' ||
    detail.kind === 'agent' ||
    detail.kind === 'settings/config' ||
    detail.kind === 'file'
  ) {
    return null;
  }
  return detail.presentation;
});

/**
 * The frontmatter as the YAML document the detail renders (FR-007,
 * frontmatter-yaml.ts): every declared key the file wrote, led by
 * {@link LEADING_PROMPT_FRONTMATTER_KEYS} and otherwise in the file's own
 * order, spelled back in the block's own language, so a reader compares it
 * against their file without translating and pastes from it without
 * converting.
 */
const frontmatterText = computed(() => {
  const rank = (entry: DeclaredEntryDto): number => {
    // Only a string key can be one of the leading keys: a numeric key spelling
    // `name` is a different key (api-types.ts § DeclaredKeyKind).
    const index =
      entry.keyKind === 'string' ? LEADING_PROMPT_FRONTMATTER_KEYS.indexOf(entry.key) : -1;
    return index === -1 ? LEADING_PROMPT_FRONTMATTER_KEYS.length : index;
  };
  // `toSorted` is stable, so the keys past the leaders keep authored order.
  return frontmatterYamlText(
    (presentation.value?.frontmatter ?? []).toSorted((left, right) => rank(left) - rank(right)),
  );
});

/**
 * Whether the file left no prompt at all. Only an empty string counts: a body
 * of whitespace is what the file wrote after its frontmatter, and calling it
 * none would report a shortened value as the whole (FR-025).
 */
const bodyIsEmpty = computed(() => (presentation.value?.bodyText ?? '') === '');

/**
 * The diagnostics of the open file. The detail response states each record
 * once — a failed extraction is one (file, kind) record (FR-028) — so the
 * list renders as published.
 */
const openDiagnostics = computed(() => openDetail.value?.diagnostics ?? []);

/**
 * The two halves of this kind's detail, as the tab strip presents them: what the
 * parse read out of the file, and the complete file itself. The same split the
 * instruction detail uses, for the same reason: two subjects, and stacked they
 * would show one text twice for a file with no frontmatter block.
 */
const PROMPT_DETAIL_TABS = ['prompt', 'file'] as const;

/** Which half is in view; see {@link PROMPT_DETAIL_TABS}. */
type PromptDetailTab = (typeof PROMPT_DETAIL_TABS)[number];

/** The label each tab shows. */
const PROMPT_DETAIL_TAB_TEXT: Readonly<Record<PromptDetailTab, string>> = {
  /** Label for the panel holding the file's declarations and prompt. */
  prompt: 'Prompt',
  /** Label for the panel holding the complete authored file. */
  file: 'File',
};

const activeTab = ref<PromptDetailTab>('prompt');

/** The page's root, for the focus guards below. */
const pageRoot = ref<HTMLElement | null>(null);

/** The `id` of the panel a tab controls (WCAG 4.1.2). */
function promptTabPanelId(tab: PromptDetailTab): string {
  return `aci-prompt-panel-${tab}`;
}

/** The `id` of the tab that controls {@link promptTabPanelId}'s panel. */
function promptTabId(tab: PromptDetailTab): string {
  return `aci-prompt-tab-${tab}`;
}

/**
 * Arrow keys move the selection, matching the WAI-ARIA tabs pattern.
 * Selection follows focus because switching panels issues no request and
 * loses no work: both halves are already in hand.
 */
function onTabKeydown(event: KeyboardEvent, index: number): void {
  const next = nextTabForKey(event.key, PROMPT_DETAIL_TABS, index);
  if (next === null) {
    // A key the pattern does not handle keeps its default behavior; swallowing
    // it here would break Tab out of the strip.
    return;
  }
  event.preventDefault();
  activeTab.value = next;
  document.getElementById(promptTabId(next))?.focus();
}

/**
 * Opening a file starts on what it declares and prompts — unless its
 * extraction failed, where that panel has nothing parsed to show and the
 * complete source is the honest landing (FR-028): the failure's diagnostic
 * stays visible on both.
 *
 * The detail's arrival is where that is decided, because it is the first
 * moment there is anything to decide between: the strip is rendered beside
 * the detail, so until one is in hand no tab is on screen to have been
 * chosen.
 */
watch(openDetail, (detail) => {
  if (detail !== null) {
    activeTab.value = presentation.value !== null ? 'prompt' : 'file';
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
 * What this route says when its own request failed, or null when none has:
 * the failing state's statement, then the failure's own message. One value,
 * read by both the visible paragraph and the live region, so what a reader
 * hears is the sentence that is on the screen.
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
 * What the document title says this page is showing (WCAG 2.4.2): the path
 * the heading shows while a file is open, and the state the page is in
 * otherwise, so a reader returning to a tab is never told it shows a file the
 * link no longer resolves. The raw path, not the escaped spelling: the shell
 * escapes its subject exactly once at the rendering boundary. Null when the
 * escaped spelling would draw nothing — the shell then titles the tab by this
 * route's surface name, because the spelled-out presentation the heading falls
 * back to contains backslashes the shell's escaping would double.
 */
const titleSubject = computed<string | null>(() => {
  if (detailState.value === 'loading') {
    return 'Loading a prompt or command file';
  }
  if (detailState.value === 'stale' || owner.value.length === 0) {
    return 'Link not in this scan';
  }
  if (detailFailure.value !== null) {
    return 'Prompt or command file could not be loaded';
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
 * returns to loading, and focus would drop to the document body
 * (WCAG 2.4.3); the heading is the landmark that survives the transition.
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

// The stale transition replaces the whole body of the page below the heading
// — the loading line or the detail alike — so its guard watches the state
// itself and considers the whole page root (WCAG 2.4.3).
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
  // drop, after unmount, where the focus guards above are naturally inert
  // and a replacement page's own report or open stands.
});
</script>

<template>
  <div ref="pageRoot" class="aci-prompt-detail">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the commands
         list rather than the kind order's default tab. -->
    <p><NuxtLink :to="inventoryRoute">Back to the inventory</NuxtLink></p>

    <div class="aci-prompt-detail__title">
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
        v-if="openDetail !== null"
        :source-relative-path="openDetail.file.sourceRelativePath"
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
        <NuxtLink :to="inventoryRoute">Return to the inventory and open it again.</NuxtLink>
      </p>
    </template>

    <!-- A failed detail request: the state fell back to idle with nothing
         held. This route reports it, because this route made the request —
         the shell reports what happened to the session, so neither hides or
         repeats the other. -->
    <template v-else-if="openDetail === null">
      <p class="aci-error">{{ detailFailure }}</p>
      <p>
        <button type="button" @click="retryOpen">Try again</button>
      </p>
    </template>

    <template v-else>
      <div class="aci-prompt-detail__overview">
        <!-- Which products recognize the file, restated from the row so the
             page and the list agree, beside the kind's own caption (FR-007).
             No product is quoted for what it would select or run: existence
             is what an admission proves (FR-009). -->
        <p class="aci-prompt-detail__recognition">{{ toolsText }} · {{ kindText }}</p>

        <!-- The name the inventory row this page was opened from is listed
             under: the answer of the rule that admitted the file, derived from
             the path for a command file and declared by a prompt file, and
             never a claim that typing it would reach this file — a same-name
             skill outranks a command (FR-009). -->
        <p class="aci-prompt-detail__invocation-name aci-note">
          Invocation name: <span class="aci-authored-text">{{ invocationNamesText }}</span>
        </p>

        <!-- The comparison entry for this file (FR-011): present exactly
             when the current scan holds another readable file that resolves
             one of this file's names. The comparison surface's own pickers
             take over from there. -->
        <p v-if="comparePairRoute !== null">
          <NuxtLink :to="comparePairRoute">Compare this file</NuxtLink>
        </p>
      </div>

      <!-- Two subjects, two tabs: what the parse read out of the file, and
           the complete file itself. A real `tablist`, with the roving
           tabindex and arrow keys the WAI-ARIA tabs pattern specifies
           (QR-004, contracts/accessibility-acceptance.md). -->
      <div class="aci-kind-tabs" role="tablist" aria-label="Prompt and command detail">
        <button
          v-for="(tab, index) in PROMPT_DETAIL_TABS"
          :id="promptTabId(tab)"
          :key="tab"
          class="aci-kind-tab"
          type="button"
          role="tab"
          :aria-controls="promptTabPanelId(tab)"
          :aria-selected="tab === activeTab"
          :tabindex="tab === activeTab ? 0 : -1"
          @click="activeTab = tab"
          @keydown="onTabKeydown($event, index)"
        >
          {{ PROMPT_DETAIL_TAB_TEXT[tab] }}
        </button>
      </div>

      <!-- Both panels stay in the document and the unselected one is hidden,
           so Monaco keeps its model and the reader's scroll position across a
           tab switch, and both `aria-controls` IDREFs resolve. -->
      <div
        v-show="activeTab === 'prompt'"
        :id="promptTabPanelId('prompt')"
        role="tabpanel"
        :aria-labelledby="promptTabId('prompt')"
        tabindex="0"
      >
        <!-- A failed extraction leaves this panel with nothing parsed to
             show; its Diagnostic is what says so, and the complete source is
             one tab away (FR-028). -->
        <ul v-if="presentation === null && openDiagnostics.length > 0" class="aci-list" role="list">
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

        <div v-if="presentation" class="aci-prompt-detail__declarations">
          <h3>Frontmatter</h3>
          <p v-if="presentation.frontmatter.length === 0" class="aci-note">
            This file declares none.
          </p>
          <!-- The declared keys as one read-only YAML document in the file's
               own order (FR-007), through the same viewer the prompt uses —
               sized to the block, because a frontmatter is short
               (SourceViewer § fitContent). YAML because the block is YAML:
               nothing here is markup, a link, or a resolved reference
               (FR-025, FR-026, FR-033). -->
          <SourceViewer
            v-else
            :source-text="frontmatterText"
            :source-relative-path="openPath"
            content-label="Frontmatter of"
            content-language="yaml"
            fit-content
          />
        </div>

        <div v-if="presentation" class="aci-prompt-detail__prompt">
          <h3>Prompt</h3>
          <p v-if="bodyIsEmpty" class="aci-note">This file has none.</p>
          <!-- The same read-only viewer the file tab uses, given the file's
               own path so the body is highlighted as the Markdown it is.
               Highlighting is tokenizing, not rendering: no heading becomes
               large, no link becomes clickable, and no image loads (FR-033).
               A name the prompt mentions stays text: nothing is resolved to
               an agent, a skill, or another command (FR-019). -->
          <SourceViewer
            v-else
            :source-text="presentation.bodyText"
            :source-relative-path="openPath"
            content-label="Prompt of"
          />
        </div>
      </div>

      <div
        v-show="activeTab === 'file'"
        :id="promptTabPanelId('file')"
        role="tabpanel"
        :aria-labelledby="promptTabId('file')"
        tabindex="0"
      >
        <!-- What the read produced, and nothing else. The file below is the
             file; a viewer that narrated what a file might contain would be
             telling the reader about their own repository (FR-027). -->
        <p class="aci-note">
          {{ FILE_ENCODING_TEXT[openDetail.file.encoding]
          }}<template v-if="openDetail.file.encoding !== 'unknown'">
            · {{ openDetail.file.sizeBytes }} bytes</template
          ><template v-if="isReadableFile(openDetail.file) && openDetail.file.hadLeadingBom">
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
          v-if="isReadableFile(openDetail.file)"
          :source-text="openDetail.file.sourceText"
          :source-relative-path="openDetail.file.sourceRelativePath"
        />
        <p v-else class="aci-note">This file has no source text to show.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The detail reads top to bottom: what the file is, what it declares,
   what it prompts, then the complete file. It scrolls as a page rather than
   fitting the viewport, the same trade the instruction detail makes. */
.aci-prompt-detail {
  display: flex;
  flex-direction: column;
}

/* The heading block is chrome, and every line of it is a line the file does
   not get, so it is tighter here than the shell's default heading spacing. */
.aci-prompt-detail > p:first-child {
  margin: 0;
}

/* The recognition caption line, weighted like a heading within the overview:
   it says which products' recognition the page restates. */
.aci-prompt-detail__recognition {
  font-weight: 600;
  margin: 0;
}

.aci-prompt-detail__overview {
  border-bottom: 1px solid var(--aci-border);
  padding-bottom: 0.5rem;
}

/* The two halves of the parse, inside the tab that holds them. */
.aci-prompt-detail__declarations,
.aci-prompt-detail__prompt {
  padding-block-start: 0.75rem;
}

.aci-prompt-detail__declarations > h3,
.aci-prompt-detail__prompt > h3 {
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

/* The path and the link that opens it on one line, wrapping together when the
   path is long: the authored path may have no break opportunities of its own,
   and without the wrap a long one forces sideways scrolling at narrow widths
   and 200% zoom (WCAG 1.4.10). */
.aci-prompt-detail__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-block-end: 0.5rem;
}

/* Tighter than the shell's section-heading baseline, because the heading
   block is chrome. */
.aci-prompt-detail h2 {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}
</style>
