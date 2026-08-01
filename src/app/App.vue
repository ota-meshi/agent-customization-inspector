<script setup lang="ts">
// The SPA shell (T049, extended by T071). The shell owns exactly three
// things: the one RPC connection, the session view state derived from it, and
// which of the three surfaces — booting, the inspection route, or the ended
// view — is on screen. Everything the inspection route renders lives in
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
import { useRoute, useRouter, type RouteLocationNormalized } from 'vue-router';
import { connectDevframe, isCallableStatus } from 'devframe/client';
import { SESSION_VIEW_STATE, SessionViewState, type SessionView } from './session/view-state';
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
    // the file ID it is asked about, and a bridge that passed only the name
    // would call it with none.
    call: (method, ...args) =>
      rpcCall === null
        ? Promise.reject(new Error('the local inspection session is not connected yet'))
        : rpcCall(method, ...args),
  },
});
provide(SESSION_VIEW_STATE, sessionViewState);

/** The active route, so the shell shows the introduction with the inventory it introduces. */
const route = useRoute();

// Following a link in an SPA moves no focus by itself, so a navigation leaves a
// keyboard or screen-reader user wherever the previous page had them. The shell
// places it at its own heading on every navigation, and a route that has a
// better target — a detail page's subject — moves it again when it mounts.
// Boot is deliberately not a navigation: content arriving asynchronously must
// not yank focus off the heading the user is already on.
useRouter().afterEach((to, from, failure) => {
  // Only when the page itself changes. `pageKey` is what decides that, so
  // selecting another file of one skill is not a navigation for this purpose:
  // moving focus there would pull the reader out of the tree they are using,
  // which is the whole reason the detail route does not move it either.
  if (failure === undefined && pageKey(to) !== pageKey(from)) {
    heading.value?.focus();
  }
});

/**
 * The identity a page keeps across parameter changes: its matched route path,
 * with the parameters left in place rather than interpolated. A route with no
 * match falls back to its full path, which keys nothing together — the same
 * outcome as having no key at all.
 */
const pageKey = (target: RouteLocationNormalized): string =>
  target.matched[0]?.path ?? target.fullPath;

/**
 * What the current route is, for the document title: the fallback surface
 * name when the active page reports no subject of its own through
 * {@link SessionViewState.pageSubject}.
 */
const routeTitle = computed(() => (route.path.startsWith('/skills/') ? 'Skill' : 'Inspection'));

const startupErrorMessage = shallowRef<string | null>(null);
const heading = ref<HTMLHeadingElement | null>(null);
// Unbinds the connection-status subscription; owned by this component,
// rather than the session view state, because the RPC client is created here.
let unbindConnection: (() => void) | null = null;

const view = computed<SessionView>(() =>
  startupErrorMessage.value === null ? sessionViewState.view.value : 'ended',
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
      return 'Connecting to the local inspection session.';
    case 'inspection':
      return 'Inspection session ready.';
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
      return `Connecting — ${APP_NAME}`;
    case 'inspection': {
      // The route is part of what the page is, and a title that never changed
      // would leave a screen-reader user on a detail page hearing the
      // inventory's (WCAG 2.4.2). A page that reports its subject — the skill
      // detail's declared or directory name — titles the tab by it, so two
      // tabs on two skills stay distinguishable.
      if (route.path === '/') {
        return APP_NAME;
      }
      const subject = sessionViewState.pageSubject.value ?? routeTitle.value;
      return `${subject} — ${APP_NAME}`;
    }
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
// shell heading is the one landmark every view keeps. Post-flush and conditional
// on the body, because before the patch the outgoing element still holds focus,
// and an element that survived the change keeps it.
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

onMounted(async () => {
  // The UI ships one language, so the document language is fixed rather than
  // negotiated: `lang` must state what the content actually is (WCAG 3.1.1),
  // never what the browser would have preferred.
  document.documentElement.lang = 'en';
  // Move keyboard focus to the top of the freshly rendered shell before any
  // asynchronous adoption can change what is on screen.
  heading.value?.focus();
  // The host runs unauthenticated behind its loopback binding, so no token
  // is exchanged and the native credential prompt is disabled: prompting
  // would ask the user for something that does not exist.
  //
  // `baseURL` is this page's own origin rather than devframe's default
  // `'./'`, which resolves against the current document path. This application
  // has nested routes — `/skills/<fileId>` — and a page loaded directly at one
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
  sessionViewState.dispose();
});
</script>

<template>
  <main class="aci-shell">
    <h1 ref="heading" tabindex="-1">{{ APP_NAME }}</h1>
    <!-- The inventory's own introduction, so it is shown with the inventory. A
         detail route does not repeat it: that screen's height belongs to the
         file it was opened for, and what applies to one recognition is stated
         per recognition inside its own disclosure rather than as a standing
         caveat over the page. -->
    <p v-if="route.path === '/'" class="aci-tagline">
      Browse the customization files AI coding agents look for in this repository. Being listed is
      not being loaded: whether a product actually uses one depends on runtime conditions this tool
      does not evaluate. Nothing is executed, connected to, or modified.
    </p>
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

    <template v-if="view === 'booting'">
      <p class="aci-empty">Connecting to the local inspection session…</p>
      <!-- The way out of this view, offered whenever the page is in it — the
           first connect included, where it is simply redundant beside the
           request already in flight. The inventory route owns the refresh
           control and is not rendered yet, so without this the only way forward
           is reloading the page, and the two states that need a retry look
           different: a non-fatal first `get-session` failure leaves an error
           beside this text, while a purge (a session identity the host no
           longer has) clears the error too. A control conditioned on the error
           would be absent for exactly the second one. -->
      <button type="button" @click="sessionViewState.refresh()">Retry connecting</button>
    </template>

    <!-- Keyed by the route's own path rather than its parameters, so selecting
         another file of one skill updates the page instead of replacing it.
         Nuxt's default key is the matched path with each parameter
         interpolated into it, so it changes on every parameter change and
         remounts the page: the editor would be torn down and rebuilt for each selection,
         and the outgoing instance's teardown would invalidate the request its
         replacement had already issued. -->
    <NuxtPage v-else-if="view === 'inspection'" :page-key="pageKey" />

    <template v-else>
      <h2>Session ended</h2>
      <p>
        The local inspection session is no longer reachable. Restart the inspector and reload this
        page.
      </p>
    </template>
  </main>
</template>
