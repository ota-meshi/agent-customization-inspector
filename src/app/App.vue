<script setup lang="ts">
// The SPA shell (T049). Phase 3 renders the first user-visible increment:
// one enabled Repository Source and its escaped, non-authorizing selected-
// root label, the inventory committed by the automatic first scan, and the
// ended view for a host that is gone. It deliberately shows almost no
// product content — no Repository picker, no ancestor discovery, and no
// inventory beyond what a committed generation actually contains.
//
// User-visible copy is written where it renders (amended 2026-07-24). The
// message catalog this component used to read from existed to hold English
// and Japanese in lockstep through one shared interface; the product now
// ships one UI language, so the catalog was pure indirection between a key
// and its only string.
//
// Text that a closed union fixes is the exception: it belongs beside that
// union, not here, so a new member cannot compile without its label. Status
// and origin labels come from `entities.ts` and diagnostic text from
// `DIAGNOSTIC_REGISTRY`, each declared next to the vocabulary it names. What
// this component authors is only the copy it alone renders.
//
// Every dependency is an explicit import: auto-imports and implicit
// components are disabled (nuxt.config.ts) so the client's dependency graph
// is reviewable by reading this file.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { connectDevframe, isCallableStatus } from 'devframe/client';
import { createSessionViewState, type SessionViewState } from './session/view-state';
import { DIAGNOSTIC_REGISTRY } from '../shared/diagnostics';
import { SOURCE_BOUNDARY_ORIGIN_TEXT, SOURCE_STATUS_TEXT } from '../shared/entities';
import './styles/main.css';

/** The product name, used for both the page heading and the document title. */
const APP_NAME = 'Agent Customization Inspector';

const sessionViewState = shallowRef<SessionViewState | null>(null);
const startupErrorMessage = shallowRef<string | null>(null);
const heading = ref<HTMLHeadingElement | null>(null);
// Unbinds the connection-status subscription; owned by this component,
// rather than the session view state, because the RPC client is created here.
let unbindConnection: (() => void) | null = null;

const view = computed(() =>
  startupErrorMessage.value === null
    ? (sessionViewState.value?.view.value ?? 'booting')
    : 'ended',
);
const snapshot = computed(() => sessionViewState.value?.snapshot.value ?? null);
const errorMessage = computed(
  () => startupErrorMessage.value ?? sessionViewState.value?.errorMessage.value ?? null,
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
const errorAnnouncement = computed(() =>
  errorMessage.value === null ? '' : `Error: ${errorMessage.value}`,
);

onMounted(async () => {
  // The UI ships one language, so the document language is fixed rather than
  // negotiated: `lang` must state what the content actually is (WCAG 3.1.1),
  // never what the browser would have preferred.
  document.documentElement.lang = 'en';
  document.title = APP_NAME;
  // Move keyboard focus to the top of the freshly rendered shell before any
  // asynchronous adoption can change what is on screen.
  heading.value?.focus();
  // The host runs unauthenticated behind its loopback binding, so no token
  // is exchanged and the native credential prompt is disabled: prompting
  // would ask the user for something that does not exist.
  const rpc = await connectDevframe({ simpleAuth: false }).catch((cause: unknown) => {
    // Connection metadata/channel construction can fail before view state
    // exists. Surface that real browser/network error as the same terminal
    // session view instead of leaving the shell indefinitely "Connecting".
    startupErrorMessage.value = cause instanceof Error ? cause.message : String(cause);
    return null;
  });
  if (rpc === null) {
    return;
  }
  // devframe types `call` against its own built-in function map, so a
  // product-registered name is narrowed away. The by-name overload accepts
  // any string at runtime; this cast selects it without widening the
  // product's own closed catalog, which `SessionRpcChannel` still enforces.
  const call = rpc.call as (method: string) => Promise<unknown>;
  const created = createSessionViewState({
    channel: { call: (method) => call(method) },
  });
  sessionViewState.value = created;
  // The transport reports a lost host without being asked, which is why the
  // product has no liveness probe: a closed loopback socket becomes the
  // ended view immediately rather than at the next interaction. `on` returns
  // its own unbind, kept for teardown.
  unbindConnection = rpc.events.on('connection:status', (status) => {
    if (!isCallableStatus(status)) {
      created.reportChannelLost(rpc.connectionError);
    }
  });
  await created.start();
});

onBeforeUnmount(() => {
  unbindConnection?.();
  unbindConnection = null;
  sessionViewState.value?.dispose();
});
</script>

<template>
  <main class="aci-shell">
    <h1 ref="heading" tabindex="-1">{{ APP_NAME }}</h1>
    <p class="aci-tagline">
      Browse the customization files AI coding agents would read in this repository. Nothing is
      executed, connected to, or modified.
    </p>
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ statusAnnouncement }}
    </p>
    <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
      {{ errorAnnouncement }}
    </p>

    <p v-if="view === 'booting'" class="aci-empty">
      Connecting to the local inspection session…
    </p>

    <template v-else-if="view === 'inspection' && snapshot">
      <h2>Sources</h2>
      <ul class="aci-list">
        <li v-for="source in snapshot.sources" :key="source.sourceId" class="aci-source">
          <strong>{{ source.tool ?? 'Repository' }}</strong>
          <dl>
            <dt>Status</dt>
            <dd>{{ SOURCE_STATUS_TEXT[source.status] }}</dd>
            <dt>Selected root</dt>
            <dd class="aci-display-root">
              {{ source.boundary.displayRoot }} ({{ SOURCE_BOUNDARY_ORIGIN_TEXT[source.boundary.origin] }})
            </dd>
          </dl>
        </li>
      </ul>
      <p class="aci-note">
        This label is an escaped presentation of the selected root. It is not a path you can open
        and grants no read access.
      </p>

      <h2>Customization files</h2>
      <p v-if="snapshot.files.length === 0" class="aci-empty">
        No customization files have been committed yet.
      </p>
      <ul v-else class="aci-list">
        <li v-for="file in snapshot.files" :key="file.fileId" class="aci-path">
          {{ file.sourceRelativePath }}
        </li>
      </ul>

      <h2>Diagnostics</h2>
      <p v-if="snapshot.diagnostics.length === 0" class="aci-empty">No diagnostics.</p>
      <ul v-else class="aci-list">
        <li v-for="diagnostic in snapshot.diagnostics" :key="diagnostic.diagnosticId">
          {{ DIAGNOSTIC_REGISTRY[diagnostic.code].message }}
          <span v-if="diagnostic.sourceRelativePath" class="aci-path">
            {{ diagnostic.sourceRelativePath }}
          </span>
        </li>
      </ul>
    </template>

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
