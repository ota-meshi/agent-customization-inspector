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
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef, watchEffect } from 'vue';
import { NuxtPage } from '#components';
import { connectDevframe, isCallableStatus } from 'devframe/client';
import {
  SESSION_VIEW_STATE,
  createSessionViewState,
  type SessionView,
} from './session/view-state';
import './styles/main.css';

/** The product name, used for both the page heading and the document title. */
const APP_NAME = 'Agent Customization Inspector';

// The RPC channel is bound after `connectDevframe` resolves, but `provide`
// must run synchronously during setup. The view state is therefore created
// now over a channel that defers to this holder — construction performs no
// I/O, so nothing is sent before the connection exists — and a call issued
// before binding fails ordinarily instead of silently resolving.
let rpcCall: ((method: string) => Promise<unknown>) | null = null;
const sessionViewState = createSessionViewState({
  channel: {
    call: (method) =>
      rpcCall === null
        ? Promise.reject(new Error('the local inspection session is not connected yet'))
        : rpcCall(method),
  },
});
provide(SESSION_VIEW_STATE, sessionViewState);

const startupErrorMessage = shallowRef<string | null>(null);
const heading = ref<HTMLHeadingElement | null>(null);
// Unbinds the connection-status subscription; owned by this component,
// rather than the session view state, because the RPC client is created here.
let unbindConnection: (() => void) | null = null;

const view = computed<SessionView>(() =>
  startupErrorMessage.value === null ? sessionViewState.view.value : 'ended',
);
const errorMessage = computed(
  () => startupErrorMessage.value ?? sessionViewState.errorMessage.value,
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
    case 'inspection':
      return APP_NAME;
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
  const rpc = await connectDevframe({ simpleAuth: false }).catch((cause: unknown) => {
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
  const call = rpc.call as (method: string) => Promise<unknown>;
  rpcCall = (method) => call(method);
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
    <p class="aci-tagline">
      Browse the customization files AI coding agents look for in this repository. Being listed
      is not being loaded: whether a product actually uses one depends on runtime conditions
      this tool does not evaluate. Nothing is executed, connected to, or modified.
    </p>
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ statusAnnouncement }}
    </p>
    <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
      {{ errorAnnouncement }}
    </p>

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

    <NuxtPage v-else-if="view === 'inspection'" />

    <template v-else>
      <h2>Session ended</h2>
      <p>
        The local inspection session is no longer reachable. Restart the inspector and reload this
        page.
      </p>
    </template>

    <p v-if="errorMessage" class="aci-error">Error: {{ errorMessage }}</p>
  </main>
</template>
