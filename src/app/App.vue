<script setup lang="ts">
// The SPA shell (T049, extended by T071). The shell owns exactly three
// things: the one RPC connection, the session view state derived from it, and
// which of the four surfaces — booting, the inspection route, the fenced
// control-only recovery (FR-042), or the ended view — is on screen. Everything the inspection route renders lives in
// `pages/index.vue` and the inventory components it composes.
//
// The view state is provided rather than passed, because a Nuxt route takes
// no props: the shell publishes the one instance under
// {@link SESSION_VIEW_STATE} and the route injects it. There is deliberately
// only one — a second view state would open a second request-token space over
// the same connection and let two adoptions race.
//
// The shell still shows almost no product content of its own: no Repository
// picker, no ancestor discovery, and no inventory beyond what a committed
// generation actually contains.
//
// What this component authors is only the copy it alone renders; text a closed
// union fixes comes from beside that union — status and origin labels from
// `entities.ts`, diagnostic text from `DIAGNOSTIC_REGISTRY` (AGENTS.md
// User-visible copy policy).
//
// Every dependency is an explicit import: auto-imports and implicit
// components are disabled (nuxt.config.ts) so the client's dependency graph
// is reviewable by reading this file.
import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  watchEffect,
} from 'vue';
import { NuxtPage } from '#components';
import { useRoute, useRouter } from 'vue-router';
import { connectDevframe, isCallableStatus } from 'devframe/client';
import RescanIcon from '~icons/lucide/refresh-cw';
import SearchIcon from '~icons/lucide/search';
import ColorSchemeSwitch from './components/ColorSchemeSwitch.vue';
import { clearInventoryReturnPoint, pageKey } from './router.options';
import { detailRouteKindOf } from './components/detail-route';
import { provideInventoryFilterState } from './composables/inventory-filter-state';
import GlobalFenceRecovery from './components/consent/GlobalFenceRecovery.vue';
import { SESSION_VIEW_STATE, SessionViewState, type SessionView } from './session/view-state';
import { CUSTOMIZATION_KIND_TEXT, inlinePresentationLabel } from '../shared/entities';
import './styles/main.css';

/** The product name, used for both the page heading and the document title. */
const APP_NAME = 'Agent Customization Inspector';

// The RPC channel is bound after `connectDevframe` resolves, but `provide`
// must run synchronously during setup. The view state is therefore created
// now over a channel that defers to this holder — construction performs no
// I/O, so nothing is sent before the connection exists — and a call issued
// before binding fails ordinarily instead of silently resolving.
let rpcCall: ((method: string, ...args: readonly unknown[]) => Promise<unknown>) | null = null;
const sessionViewState = new SessionViewState({
  channel: {
    // The parameter tail is forwarded, not dropped: `get-file-detail` takes
    // the Source-relative Path it is asked about, and a bridge that passed
    // only the name would call it with none.
    call: (method, ...args) =>
      rpcCall === null
        ? Promise.reject(new Error('the local inspection session is not connected yet'))
        : rpcCall(method, ...args),
  },
});
provide(SESSION_VIEW_STATE, sessionViewState);

/**
 * The one inventory narrowing, provided here so the bar's search field and the
 * inventory route's own controls read and write the same four values
 * (`composables/inventory-filter-state.ts`).
 */
const inventoryFilters = provideInventoryFilterState();

// The narrowing is client data of the purged session: the search text is an
// authored path fragment the reader typed against that session's own files,
// and the recovery contract starts the next inventory at the default filters
// (data-model.md § RecoveryViewState). Registered here rather than inside the
// session state, because the shell is what constructs the value to clear —
// and cleared by the purge rather than by the inventory's unmount, which
// cannot run while the reader is on another route (FR-027).
sessionViewState.registerClientDataOwner(() => {
  inventoryFilters.clear();
});

/** The active route, so the shell shows the introduction with the inventory it introduces. */
const route = useRoute();

// Following a link in an SPA moves no focus by itself, so a navigation leaves a
// keyboard or screen-reader user wherever the previous page had them. The shell
// places it at its own heading on every navigation, and a route that has a
// better target — a detail page's subject — moves it again when it mounts. A
// return to the inventory has a better target too: the row the reader followed
// out of the list, which the router's scroll behavior focuses together with the
// viewport it restores (router.options.ts).
// Boot is deliberately not a navigation: content arriving asynchronously must
// not yank focus off the heading the user is already on.
// A post-purge adoption lands on the inventory (data-model.md
// § RecoveryViewState: the recovery restores no prior detail and starts at
// the default inventory). The route move is the shell's, because the router
// is: the view state only counts the requests.
const router = useRouter();

/**
 * True from a recovery's resume request until the inventory route has landed.
 * The routed page renders nothing while it is set, because the route is still
 * the purged world's and mounting that page again is what the recovery
 * contract says does not happen (data-model.md § RecoveryViewState).
 */
const resumingToInventory = ref(false);
watch(
  () => sessionViewState.inventoryResumeRequests.value,
  async () => {
    resumingToInventory.value = true;
    try {
      await router.replace({ path: '/' });
    } finally {
      resumingToInventory.value = false;
    }
  },
);

router.afterEach((to, from, failure) => {
  // Only when the page itself changes. `pageKey` — shared with the router's
  // scroll behavior (router.options.ts), so scroll and focus decide "did the
  // page change" once and can never part ways — is what decides that, so
  // selecting another file of one skill is not a navigation for this
  // purpose: moving focus there would pull the reader out of the tree they
  // are using, which is the whole reason the detail route does not move it
  // either.
  // Not while the reader is typing in the bar's search. That field is on every
  // route and survives the navigation it causes (FR-006, T1151): typing one
  // character from a detail moves to the inventory, and moving focus to the
  // heading then took the field away after the first keystroke — the second
  // reached the heading, and the search could not be typed at all.
  const typing = searchField.value !== null && document.activeElement === searchField.value;
  if (failure === undefined && !typing && pageKey(to) !== pageKey(from)) {
    heading.value?.focus();
  }
});

/**
 * What the current route is, for the document title: the fallback surface
 * name when the active page reports no subject of its own through
 * {@link SessionViewState.pageSubject}. A detail page falls back here when
 * its own subject draws nothing — a path of whitespace alone — so a route
 * whose kind this cannot name titles such a tab `Inspection` rather than by
 * its kind.
 *
 * The kind comes from the route's own first segment through the table that
 * roots each family there (`detail-route.ts` § detailRouteKindOf), so a family
 * added to that table is titled by this without a second edit — and a second
 * spelling of which segment a kind lives under cannot disagree with the first.
 * The branches below it are the two routes no kind owns, which no table names.
 */
const routeTitle = computed(() => {
  const kind = detailRouteKindOf(route.path);
  if (kind !== null) {
    return CUSTOMIZATION_KIND_TEXT[kind];
  }
  if (route.path.startsWith('/global-consent')) {
    // The consent page is no kind's, so no kind table names it; its title is
    // the decision it puts in front of the reader — the page's own heading.
    return 'Personal setup consent';
  }
  if (route.path.startsWith('/repository')) {
    // The Repository Source's own state surface, no kind's either: its title
    // is its heading, so a tab left open on it says which Source it is about
    // (WCAG 2.4.2).
    return 'Repository';
  }
  return 'Inspection';
});

/**
 * The one search over names and paths (FR-006). The bar offers it; the
 * inventory route owns what it means and is the only writer of the query it
 * rides in (`composables/inventory-filter-state.ts` records why there is one).
 *
 * Typing from anywhere but the inventory goes there, because a search is a
 * question about the list. It pushes rather than replaces in that one case, so
 * Back returns to the page the reader was reading rather than skipping past it.
 */
const searchText = computed<string>({
  get: () => inventoryFilters.searchQuery.value,
  set: (value: string) => {
    inventoryFilters.searchQuery.value = value;
    if (route.path !== '/') {
      // Typing is a new question about the list, not a return to the row the
      // reader left, so the recorded point goes: restoring it would move focus
      // off this field as the inventory arrives, and every character after the
      // first would land nowhere (`router.options.ts` § scrollBehavior).
      clearInventoryReturnPoint();
      // The query travels with the navigation rather than being written after
      // it: the inventory is not mounted yet, so this cannot race its own
      // writer, and the page it arrives at then reads the search from the URL
      // exactly as a pasted link does.
      void router.push({ path: '/', query: { q: value === '' ? undefined : value } });
    }
  },
});

/**
 * Whether the bar offers the two scan commands: on the inventory, which is the
 * one surface with no panel of its own to carry them. Each Source's own state
 * surface states its scan and commands it there, so a bar command on those
 * routes would be the same control twice on one screen (FR-030).
 */
const commandsOffered = computed(() => view.value === 'inspection' && route.path === '/');

/** True while a rescan command is in flight, so a second press cannot stack one. */
const rescanning = computed(() => sessionViewState.rescanState.value === 'requesting');

/**
 * Dispatches the rescan unless one is already in flight. The guard is here
 * rather than in a `disabled` attribute because disabling a focused button
 * drops keyboard focus to the document body (WCAG 2.4.3,
 * contracts/accessibility-acceptance.md § 2.4.3); `aria-disabled` on the
 * control keeps it focusable while this guard keeps the duplicate dispatch out.
 *
 * What the command reports — a rejection, a stale previous result — is the
 * Repository state surface's, which the rail links to beside the status this
 * press changes (`pages/repository.vue`). The bar offers the command; it does
 * not become a second place that answers for it.
 */
function requestRescan(): void {
  if (!rescanning.value) {
    void sessionViewState.requestRescan();
  }
}

const startupErrorMessage = shallowRef<string | null>(null);
const heading = ref<HTMLHeadingElement | null>(null);
/**
 * The bar's search field, so the focus guard can tell a navigation the reader
 * caused by typing in it from one they caused by following a link.
 */
const searchField = ref<HTMLInputElement | null>(null);
// Unbinds the connection-status subscription; owned by this component,
// rather than the session view state, because the RPC client is created here.
let unbindConnection: (() => void) | null = null;

const view = computed<SessionView>(() =>
  startupErrorMessage.value === null ? sessionViewState.view.value : 'ended',
);
/**
 * Whether the booting view is the disable command's own interlude: the
 * command purges and drops the view to 'booting' before its request settles
 * (`view-state.ts` § requestGlobalDisable), and presenting that as
 * "Connecting" would report a running destruction as a connection fault
 * (FR-042; WCAG 2.4.2 for the title below).
 */
const disabling = computed(
  () => view.value === 'booting' && sessionViewState.globalDisableState.value === 'submitting',
);
// The shell reports the session's own failures. A detail request's failure
// belongs to the route that made it, which shows it beside the retry that
// answers it — so neither can hide the other and neither is said twice.
const errorMessage = computed(
  () => startupErrorMessage.value ?? sessionViewState.sessionErrorMessage.value,
);
// These two regions stay mounted from the first render, so asynchronous
// session and error transitions are announced without moving keyboard focus
// (WCAG 4.1.3; contracts/accessibility-acceptance.md).
const statusAnnouncement = computed(() => {
  switch (view.value) {
    case 'booting':
      return disabling.value
        ? 'Personal inspection is being disabled. Inspection data is unavailable until it finishes.'
        : 'Connecting to the local inspection session.';
    case 'inspection':
      return 'Inspection session ready.';
    case 'fenced':
      // The failed barrier is its own state to a reader who cannot see the
      // page: announcing "being disabled" over a retained failure would
      // contradict the retry the body offers (FR-042).
      return sessionViewState.fenceRecovery.value?.globalDisableInProgress.state === 'failed'
        ? 'Disabling personal inspection failed. You can retry from this page.'
        : 'Personal inspection is being disabled. Inspection data is unavailable until it finishes.';
    case 'ended':
      return 'Session ended. The local inspection session is no longer reachable.';
    default: {
      const unhandledView: never = view.value;
      return unhandledView;
    }
  }
});
/**
 * The document title, which states the view the page is in (WCAG 2.4.2,
 * contracts/accessibility-acceptance.md). Setting it once would leave the
 * ordinary inventory title on a session that has ended.
 */
const documentTitle = computed(() => {
  switch (view.value) {
    case 'booting':
      return disabling.value
        ? `Disabling personal inspection — ${APP_NAME}`
        : `Connecting — ${APP_NAME}`;
    case 'inspection': {
      // The route is part of what the page is, and a title that never changed
      // would leave a screen-reader user on a detail page hearing the
      // inventory's (WCAG 2.4.2). A page that reports its subject — the skill
      // detail's resolved row name, or the state it is in when it is showing
      // no skill — titles the tab by it, so two tabs stay distinguishable.
      if (route.path === '/') {
        return APP_NAME;
      }
      const subject = sessionViewState.pageSubject.value ?? routeTitle.value;
      // The subject can be an authored skill name, and a tab title has no CSS
      // to isolate it with. The isolate pair alone would not be a boundary —
      // an authored PDI closes it from inside — so the subject's own bidi and
      // control characters are spelled out first, the way path labels spell
      // them, and the isolate pair then scopes ordinary right-to-left text.
      // The single-line rule too, and here rather than in each page: a title
      // collapses whitespace exactly as an inline label does, so a subject
      // held apart only by leading, trailing, or doubled whitespace is
      // spelled out whole — every page keeps handing the shell its raw
      // subject, so the escape-and-disambiguate still happens exactly once.
      return `\u{2068}${inlinePresentationLabel(subject)}\u{2069} — ${APP_NAME}`;
    }
    case 'fenced':
      return sessionViewState.fenceRecovery.value?.globalDisableInProgress.state === 'failed'
        ? `Disabling failed — ${APP_NAME}`
        : `Disabling personal inspection — ${APP_NAME}`;
    case 'ended':
      return `Session ended — ${APP_NAME}`;
    default: {
      const unhandledView: never = view.value;
      return unhandledView;
    }
  }
});
watchEffect(() => {
  document.title = documentTitle.value;
});

// A view change replaces the whole surface below the heading, so whatever had
// focus in the outgoing view is unmounted with it: the boot view's own "Retry
// connecting" button when the connection then succeeds, or anything at all when
// the session ends. Focus would drop to the document body (WCAG 2.4.3), and the
// shell heading is the one landmark every view keeps. Post-flush waits until the
// outgoing element has unmounted; the body check lets an element that survived
// the change keep its focus.
watch(
  view,
  () => {
    if (document.activeElement === document.body) {
      heading.value?.focus();
    }
  },
  { flush: 'post' },
);

const errorAnnouncement = computed(() =>
  errorMessage.value === null ? '' : `Error: ${errorMessage.value}`,
);

/** Set by teardown, so a connection that arrives afterwards is abandoned. */
let unmounted = false;

/** The bar itself, whose rendered height {@link barHeightObserver} publishes. */
const bar = ref<HTMLElement | null>(null);

/**
 * Keeps `--aci-sticky-bar` equal to the bar's own rendered height.
 *
 * The token is what a focused element is scrolled clear of (`main.css`
 * § --aci-sticky-bar), and the bar wraps: measured at 49.84px on one line and
 * 81.84px on two below 32rem, and it wraps at any width once the reader's text
 * is large enough. Held at the one-line value, `scrollIntoView` put a focused
 * link 31.79px under the opaque bar — a 13.5px row entirely hidden, which is
 * the failure the padding exists to prevent (WCAG 2.4.11).
 *
 * A `ResizeObserver` rather than a second measured constant behind a media
 * query: the wrap threshold moves with the text size a reader chose, so a
 * constant would be right only at the size it was measured at. Nothing the
 * token feeds changes the bar's own height — the scroll padding and the rail's
 * offset are both below it — so publishing it cannot re-trigger the
 * observation.
 */
let barHeightObserver: ResizeObserver | null = null;

onMounted(async () => {
  // The UI ships one language, so the document language is fixed rather than
  // negotiated: `lang` must state what the content actually is (WCAG 3.1.1),
  // never what the browser would have preferred.
  document.documentElement.lang = 'en';
  const barElement = bar.value;
  if (barElement !== null) {
    barHeightObserver = new ResizeObserver(([entry]) => {
      // `borderBoxSize` is what the bar occupies, which is what has to be
      // cleared; the fallback covers a browser that reports only the box.
      const height =
        entry?.borderBoxSize[0]?.blockSize ?? barElement.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--aci-sticky-bar', `${height}px`);
    });
    barHeightObserver.observe(barElement);
  }
  // Move keyboard focus to the top of the freshly rendered shell before any
  // asynchronous adoption can change what is on screen.
  heading.value?.focus();
  // The host runs unauthenticated behind its loopback binding, so no token
  // is exchanged and the native credential prompt is disabled: prompting
  // would ask the user for something that does not exist.
  //
  // `baseURL` is this page's own origin rather than devframe's default
  // `'./'`, which resolves against the current document path. This application
  // has nested routes — `/skills/detail/<source>/<source-relative path>` — and a page loaded at one
  // of them would look for the connection metadata under `/skills/` and fail to
  // connect at all. The origin is the right base because the host serves the
  // shell from the site root (`app.baseURL` in nuxt.config.ts); a bare `'/'`
  // does not work, because devframe treats it as "no base" and leaves the
  // metadata path relative again.
  const rpc = await connectDevframe({
    simpleAuth: false,
    baseURL: globalThis.location.origin,
  }).catch((cause: unknown) => {
    // Connection metadata/channel construction can fail before any request is
    // issued. Surface that real browser/network error as the same terminal
    // session view instead of leaving the shell indefinitely "Connecting".
    startupErrorMessage.value = cause instanceof Error ? cause.message : String(cause);
    return null;
  });
  if (rpc === null) {
    return;
  }
  // Teardown may have run while the connection was being established. Binding
  // a listener now would leave it bound forever — the unbind was already
  // called — and `start()` would adopt session data into a disposed view.
  if (unmounted) {
    return;
  }
  // devframe types `call` against its own built-in function map, so a
  // product-registered name is narrowed away. The by-name overload accepts
  // any string at runtime; this cast selects it without widening the
  // product's own closed catalog, which `SessionRpcChannel` still enforces.
  const call = rpc.call as (method: string, ...args: readonly unknown[]) => Promise<unknown>;
  rpcCall = (method, ...args) => call(method, ...args);
  // The transport reports a lost host without being asked, which is why the
  // product has no liveness probe: a closed loopback socket becomes the
  // ended view immediately rather than at the next interaction. `on` returns
  // its own unbind, kept for teardown.
  unbindConnection = rpc.events.on('connection:status', (status) => {
    if (!isCallableStatus(status)) {
      sessionViewState.reportChannelLost(rpc.connectionError);
    }
  });
  await sessionViewState.start();
});

onBeforeUnmount(() => {
  unmounted = true;
  unbindConnection?.();
  unbindConnection = null;
  // The observer and the value it published both go: the property was written
  // onto the document, which outlives this component.
  barHeightObserver?.disconnect();
  barHeightObserver = null;
  document.documentElement.style.removeProperty('--aci-sticky-bar');
  sessionViewState.dispose();
});
</script>

<template>
  <main class="aci-app">
    <!-- The way past the bar and the rail. The 2.4.1 row is Applicable and its
         acceptance names keyboard users as well as assistive-technology ones
         (contracts/accessibility-acceptance.md): landmarks let a screen reader
         jump the repeated block, and a reader using the keyboard alone cannot,
         so the landmarks are not the whole of it. It is the first focusable
         thing on the page and shows itself only while focused — a control
         nobody looking at the page has to see, and the first one anybody
         stepping through it meets. A plain anchor rather than a router link,
         because the destination is a position on this page and the browser's
         own fragment handling is what moves focus to it. -->
    <a class="aci-app__skip" href="#aci-app-content">Skip to the content</a>
    <!-- The bar: the product's name, the one search over names and paths, the
         scan commands of the surface below it, and the scheme the reader wants
         the page drawn in. The search and the scheme are on every route — a
         reader who starts typing a name is asking for the list wherever they
         are (FR-006), and a reader may want the page drawn their way whatever
         it is showing (FR-044) — while the commands belong to the inventory,
         which is the surface with no panel of its own to carry them. Each
         Source's own surface states and commands its own scan, so a bar
         command there would be the same control twice on one screen. A plain
         element rather than a `header`, because a `header` inside `main` is a
         landmark question this row has no reason to raise. -->
    <div ref="bar" class="aci-app__bar">
      <h1 ref="heading" tabindex="-1">{{ APP_NAME }}</h1>
      <!-- Offered only once there is an inventory to search. A field over a
           session that has not arrived — or one that has ended or is being
           disabled — is a control that does nothing, and text typed into it
           would be adopted by the first inventory to mount and then dropped by
           that page reading its own URL.
           The mark is inside the field rather than beside it: it says what the
           field is without a word, which is what lets the field carry the whole
           of the bar's remaining width. -->
      <p v-if="view === 'inspection'" class="aci-app__search">
        <SearchIcon class="aci-app__search-icon" aria-hidden="true" />
        <label class="aci-visually-hidden" for="aci-app-search">Search names and paths</label>
        <!-- The placeholder says what the field searches, because it is the
             only place a reader who is looking at the page is told: the label
             beside it is for assistive technology and is not drawn. It is the
             label's own words, so the two cannot drift. -->
        <input
          id="aci-app-search"
          ref="searchField"
          :value="searchText"
          type="search"
          autocomplete="off"
          placeholder="Search names and paths"
          @input="searchText = ($event.target as HTMLInputElement).value"
        />
      </p>
      <!-- The two scan commands, and the scheme control. The commands are the
           inventory's: FR-030 requires the rescan to stay reachable from the
           inventory — rescanning is repeated and must not cost a page — and
           because nothing updates by itself, the command that adopts a scan's
           result is reachable from the same place. What that clause forbids
           stating twice is the Source's own facts, and none of those is here:
           the rail states each family's status, and the Source surfaces state
           the rest — along with their own rescan, which is why the bar's
           commands stop at the inventory.
           The scheme control has no such condition: a reader may want the page
           drawn their way whatever it is showing (FR-044). -->
      <div class="aci-app__bar-end">
        <!-- Where a routed page puts the moves it owns: a detail's way back to
             its list and the rows either side of it belong to that page, which
             is the only surface that knows which list it came from, but they
             belong on the bar, which is where every route's own moves are
             (`DetailNavigation.vue`). Rendered before the commands so the bar
             reads left to right as the page's moves and then the session's. -->
        <div id="aci-app-bar-moves" class="aci-app__bar-moves" />
        <button
          v-if="commandsOffered"
          type="button"
          class="aci-app__command"
          :aria-disabled="rescanning || undefined"
          @click="requestRescan"
        >
          <RescanIcon aria-hidden="true" />
          <!-- The bar holds no panel to state a running scan in, so the
               command's own label says it while the command is out — the
               same family as the Repository panel's `Retry scan` relabel
               (`ScanProgress.vue`). -->
          {{ rescanning ? 'Rescanning…' : 'Rescan repository' }}
        </button>
        <button
          v-if="commandsOffered"
          type="button"
          class="aci-app__command"
          @click="sessionViewState.refresh()"
        >
          Refresh status
        </button>
        <ColorSchemeSwitch />
      </div>
    </div>
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ statusAnnouncement }}
    </p>
    <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
      {{ errorAnnouncement }}
    </p>

    <!-- Above the routed content, not after it: appended below a long
         inventory the error would sit off-screen, reporting a failure nobody
         scrolls down to discover. The retry controls live beside it — the
         boot view's own button, or the inventory's "Refresh status". -->
    <p v-if="errorMessage" class="aci-error">Error: {{ errorMessage }}</p>

    <!-- Where the skip link lands, and what every route renders into.
         `tabindex="-1"` is what makes it a focus target: without it the
         fragment moves the scroll position but leaves focus behind in the bar,
         so the next Tab would go back to the controls the reader just skipped
         (WCAG 2.4.3). -->
    <div id="aci-app-content" tabindex="-1" class="aci-app__content">
      <div v-if="view === 'booting'" class="aci-route">
        <div class="aci-session-state">
          <!-- The disable command's own interlude reads as what it is; the retry
             control stays, because a refresh while the barrier runs simply
             joins it (contracts/http-api.md § disable-global). -->
          <p v-if="disabling" class="aci-session-state__title">Disabling personal inspection…</p>
          <p v-else class="aci-session-state__title">Connecting to the local inspection session…</p>
          <!-- The way out of this view, offered whenever the page is in it — the
             first connect included, where it is simply redundant beside the
             request already in flight. The inventory route owns the refresh
             control and is not rendered yet, so without this the only way forward
             is reloading the page, and the two states that need a retry look
             different: a non-fatal first `get-session` failure leaves an error
             beside this text, while a purge (a session identity the host no
             longer has) clears the error too. A control conditioned on the error
             would be absent for exactly the second one. -->
          <p class="aci-session-state__action">
            <button type="button" @click="sessionViewState.refresh()">
              {{ disabling ? 'Refresh status' : 'Retry connecting' }}
            </button>
          </p>
        </div>
      </div>

      <!-- Nothing while a recovery is moving to the inventory. The adoption
           that ends a Global purge restores the inspection view and asks for
           the inventory in one step, and the route move is asynchronous: the
           purged world's route was still current for those renders, so a detail
           the reader had open remounted, issued its request, and moved focus,
           before being replaced. The recovery contract restores no prior detail
           (data-model.md § RecoveryViewState), so the page waits for the route
           rather than showing one it is about to leave. -->
      <template v-else-if="view === 'inspection'">
        <!-- Keyed by the route's own path rather than its parameters, so
           selecting another file of one skill updates the page instead of
           replacing it. Nuxt's default key is the matched path with each
           parameter interpolated into it, so it changes on every parameter
           change and remounts the page: the editor would be torn down and
           rebuilt for each selection, and the outgoing instance's teardown
           would invalidate the request its replacement had already issued. -->
        <NuxtPage v-if="!resumingToInventory" :page-key="pageKey" />
      </template>

      <!-- The fenced recovery: the whole surface while a disable barrier is
         non-complete, because everything else was purged (FR-042). -->
      <GlobalFenceRecovery v-else-if="view === 'fenced'" />

      <div v-else class="aci-route">
        <div class="aci-session-state">
          <h2 class="aci-session-state__title">Session ended</h2>
          <p class="aci-session-state__note">
            The local inspection session is no longer reachable. Restart the inspector and reload
            this page.
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* The three states that have no URL — connecting, disabling, and a session
   that has ended — in one card rather than as a sentence in the top-left of a
   full-width column. They are the whole of what the page has to say, and a
   line of text against 1100px of nothing reads as a page that failed to
   render. Nothing about what they say, offer, announce, or focus changes with
   the card. */
.aci-session-state {
  border: 1px solid var(--aci-line);
  border-radius: 0.625rem;
  margin: 1.625rem auto 0;
  max-inline-size: 28.75rem;
  padding: 1.375rem 1.375rem 1.25rem;
  text-align: center;
}

.aci-session-state__title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0 0 0.375rem;
}

.aci-session-state__note {
  color: var(--aci-muted);
  font-size: 0.71875rem;
  margin: 0 auto;
  max-inline-size: 46ch;
}

.aci-session-state__action {
  margin: 0.875rem 0 0;
}

/* A centered reading column in a document that scrolls itself. The shell is
   deliberately not a viewport-tall inner scroller: the document is the one
   scroll container, so there is exactly one scrollbar and it sits at the
   window edge, a wheel turned anywhere — the side gutters included — reaches
   it, and an absolutely positioned one-pixel live region extends nothing a
   reader can see. An inner scroller gets each of those wrong: its own second
   scrollbar beside the document's, gutters over a document with nothing to
   scroll, and a below-the-fold live region sizing the document behind it. */
.aci-app {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  max-width: 72rem;
  /* No padding above the bar. The bar sticks to the top of the document, so
     padding there is space it has to travel through before it pins — the bar
     slides up by exactly that much on the first scroll, which reads as the
     header shifting. The bar carries its own top padding instead, so it is
     drawn the same whether it is pinned or not.
     No horizontal padding either: the bar and the inventory's rail are panels
     that reach this column's edges, and a padded frame would inset them into
     floating boxes. What is inset is each surface's own content — the bar's
     through its `padding-inline` below, a routed page's through `.aci-route`
     (main.css).
     No bottom padding either, and for a reason the sides do not share: the
     inventory's rail is a sticky column, and a sticky box cannot leave its
     own containing block. Space below that column is space the document
     scrolls through while the rail is already held at its end — over those
     last pixels the list slides up under the bar, taking its first entries
     with it. The surfaces carry their own bottom space instead, so the
     rail's column runs to where the document does. */
  padding: 0;
}

/* The name at the start, the controls at the end, and the search taking what
   is left between them. Centred on the cross axis rather than baseline-aligned:
   the switch is a control with no text of its own, so a baseline would put it
   below the title it sits beside. It wraps rather than scrolling sideways, so a
   narrow viewport or a large text size never hides a control (WCAG 1.4.10). */
.aci-app__bar {
  align-items: center;
  /* Stays at the top of the document as it scrolls, so the search and the
     inventory's scan commands are reachable sixty rows down without going back
     up for them. `sticky` rather than `fixed`: a fixed bar is out of flow, and
     the document would stop being the one scroll container it is (`.aci-app`
     above). It is opaque because rows pass underneath it, and it is the raised
     surface rather than the ground: the bar and the rail below it are one
     continuous panel, and the rows are what sits on the ground beside them.
     Its lower edge is the identifying boundary rather than a hairline — a
     hairline separates rows inside a box, and this is where one surface ends
     (main.css § --aci-line). */
  background: var(--aci-surface-raised);
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  border-block-end: 1px solid var(--aci-line);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.875rem;
  /* No margin below it: the space under the bar is the content's, because the
     inventory wants none — its rail continues this surface downward, and a
     margin here would put a stripe of page ground between two halves of one
     panel. Every other surface takes it through `.aci-route` (main.css). */
  padding-inline: 1.25rem;
  /* Its own spacing, even on both sides: a pinned bar has to look the same as
     an unpinned one, and page padding above it would have been the distance it
     jumped on the first scroll (`.aci-app`). */
  padding-block: 0.5625rem;
}

/* One box holding the mark and the field, so the two read as one control. It
   takes the width the bar has left, up to a point: past that the field is wider
   than any query anyone types and the space is better left to the bar. */
.aci-app__search {
  align-items: center;
  background: var(--aci-surface-sunken);
  border: 1px solid var(--aci-hairline);
  border-radius: var(--aci-radius-sm);
  color: var(--aci-muted);
  /* The box is what decides whether its own placeholder fits, so the box is
     what the query below asks. A viewport width cannot answer it: the brand
     name and the commands beside it take a share of the bar that no viewport
     width predicts. */
  container-type: inline-size;
  display: flex;
  flex: 1;
  gap: 0.5rem;
  margin: 0;
  max-width: 26.25rem;
  min-width: 0;
  padding: 0.3125rem 0.625rem;
}

/* Below the width that holds the whole placeholder, the words go rather than
   truncate. A clipped one says something else — "Search names and pat…", and
   then "Search name", which is a narrower promise than the field keeps — and a
   fragment is worse than the mark alone, which already says what the box is.

   Measured on the pinned revisions at the shell's own 0.8125rem: the text is
   149.2px, the mark 14px, and the gap 8px, so the content box needs 171.2px.
   The threshold is in `rem` because the text is: both scale with the reader's
   own base size, where a pixel threshold would stop matching it. A container
   size query reads the content box, which is what these numbers are
   (WCAG 1.4.10). The field's own label goes on naming it for assistive
   technology, which never reads the placeholder for that (WCAG 3.3.2). */
@container (width < 10.75rem) {
  .aci-app__search input::placeholder {
    color: transparent;
  }
}

.aci-app__search-icon {
  block-size: 0.875rem;
  flex: none;
  inline-size: 0.875rem;
}

/* The field itself draws nothing: the box around it is the control's edge, so
   a second border inside it would be a box in a box. */
.aci-app__search input {
  background: none;
  border: 0;
  border-radius: 0;
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
}

.aci-app__search input:focus-visible {
  outline: none;
}

/* The box takes the ring, because the box is what a reader sees as the
   control (WCAG 2.4.7). */
.aci-app__search:focus-within {
  outline: 2px solid var(--aci-accent);
  outline-offset: 2px;
}

/* The controls sit together at the far end, which is where a reader looks for
   them once the search has taken the middle. */
/* Wraps rather than pushing the page past the WCAG reference width of 320 CSS
   pixels: the two commands and the switch are fixed-size, so at that width they
   have to drop to a line of their own (WCAG 1.4.10). */
.aci-app__bar-end {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-inline-start: auto;
}

/* The teleport target for a routed page's own moves. `display: contents` so an
   empty target adds no gap and a filled one lays its controls out as the bar's
   own children rather than as a box inside it. */
.aci-app__bar-moves {
  display: contents;
}

.aci-app__command {
  flex: none;
}

.aci-app__command svg {
  block-size: 0.8125rem;
  inline-size: 0.8125rem;
}

/* Off-screen until it has focus, then a real control in the top corner. It
   keeps its own colours rather than the button baseline's, because it is drawn
   over whatever the page has scrolled to. */
.aci-app__skip {
  background: var(--aci-surface-raised);
  border: 1px solid var(--aci-line);
  border-radius: var(--aci-radius-sm);
  inset-block-start: 0.5rem;
  inset-inline-start: 0.5rem;
  padding: 0.35rem 0.75rem;
  position: absolute;
  transform: translateY(-200%);
  /* Above the bar, which is opaque and stacks at 1: at the same level the bar
     wins on document order and covered the link completely, so the first Tab
     revealed something nobody could see (WCAG 2.4.1, 2.4.11). */
  z-index: 2;
}

.aci-app__skip:focus-visible {
  transform: none;
}

/* The routed content takes the focus the skip link sends it, and its ring is
   explicit for the same reason the heading's is: it receives focus
   programmatically rather than from a pointer. `:focus-visible` rather than
   `:focus`, because `tabindex="-1"` also makes it a click target: a pointer
   press on the blank space beside a row drew a two-pixel ring around the whole
   column, on every page. */
.aci-app__content:focus-visible {
  outline: 2px solid var(--aci-accent);
  outline-offset: 2px;
}

/* The product name is the first thing the bar says, at the bar's own size: it
   names the application rather than titling a document, and a heading three
   times the size of everything beside it would make the bar a masthead. It
   shortens when the viewport cannot hold it — `min-width: 0` is also what keeps
   the bar from forcing the page past the WCAG reference width of 320 CSS pixels
   (WCAG 1.4.10). */
.aci-app h1 {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The heading receives programmatic focus after mount, so its ring is
 * explicit rather than dependent on a browser's :focus-visible heuristic. */
.aci-app h1:focus {
  outline: 2px solid var(--aci-accent);
  outline-offset: 2px;
}
</style>
