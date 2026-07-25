// The session's view state for the browser SPA (T049): the reactive values
// `App.vue` renders and the commands that drive them. It also builds the
// shared client-data purge and the guarded API client the state is derived
// from.
//
// The session state that matters to a viewer is on the host; what this module
// holds is the browser's view of it — which surface is showing, the snapshot
// currently adopted, and any retained error. There are exactly three
// surfaces, and which one is active is derived from adoption outcomes rather
// than set ad hoc:
//  - 'booting'     nothing adopted yet, or the last purge cleared everything
//  - 'inspection'  a snapshot passed every guard and is rendered
//  - 'ended'       the channel is gone; the session is unreachable
//
// There is no session-liveness probe (amended 2026-07-24, plan.md
// § Structure Decision). Two facts made one unnecessary. A dead host closes
// the loopback socket, and devframe reports that as a connection-status
// change this module adopts directly — it does not have to be asked. And a
// Global-disable fence or a greater `globalContentEpoch` is rechecked on
// every inspection-data response by the API client, so a stale view cannot
// render even though nothing polls for it. What a probe uniquely added was
// observing *another tab's* disable proactively, which the product no
// longer models (spec.md FR-042).
//
// Nothing purges on a page-lifecycle event (amended 2026-07-24). FR-027
// mandates the purge "after document-liveness failure or an equivalent
// terminal reset", and neither switching tabs nor navigating away is either.
// A discarded document frees its own memory, and a bfcached one holds the
// same user's view of their own files on their own machine — which the
// trusted-workspace model does not treat as exposure (QR-003: loopback
// binding is the complete host-side protection). Purging there bought
// nothing and cost the view on every tab switch.
//
// This module registers its own clearing with the purge, so the central
// purge stays one call site: no caller enumerates what "client data" means.
// The FR-027 sensitive-value acknowledgement is not held here: Phase 3 has no
// detail surface to gate, so the state and its reset belong to the phase that
// builds one (T084/T100), registered with this same purge.
import { shallowRef, type ShallowRef } from 'vue';
import { createSessionApiClient, type SessionRpcChannel } from './api-client';
import { createClientDataPurge } from './client-data';
import type { SessionSnapshot } from '../../shared/api-types';

/**
 * Which surface is showing. Only 'inspection' may display inspection data.
 */
export type SessionView =
  /** Nothing has been adopted yet, or a recoverable purge cleared the prior view. */
  | 'booting'
  /** A complete snapshot passed every guard and is safe to render. */
  | 'inspection'
  /** The local channel is gone and this page cannot recover it. */
  | 'ended';

/** Construction inputs for {@link createSessionViewState}. */
export interface SessionViewStateOptions {
  /** The devframe RPC channel every request is issued on. */
  readonly channel: SessionRpcChannel;
}

/**
 * The reactive values and commands `App.vue` binds to. Every member here has
 * a render site or a caller in that component; nothing is exposed only so a
 * test can read it, because this module's behavior is observable through the
 * state it publishes and the requests it issues (amended 2026-07-24).
 */
export interface SessionViewState {
  /** Which surface to render; see {@link SessionView}. */
  readonly view: ShallowRef<SessionView>;
  /** The adopted snapshot; null in every non-'inspection' view. */
  readonly snapshot: ShallowRef<SessionSnapshot | null>;
  /** The real error message of a failed request; null while none is retained. */
  readonly errorMessage: ShallowRef<string | null>;
  /** Adopts the initial snapshot. */
  readonly start: () => Promise<void>;
  /**
   * Adopts a channel loss reported by the transport (devframe's
   * `connection:status`). Purges and shows the ended view without waiting
   * for a request to fail, so a dead host is visible immediately rather
   * than at the next interaction.
   */
  readonly reportChannelLost: (error: Error | null) => void;
  /** Abandons every outstanding request. */
  readonly dispose: () => void;
}

/**
 * Creates the session view state. Construction performs no I/O;
 * {@link SessionViewState.start} issues the first request, so a caller can
 * assert the exact request sequence from a quiescent starting point.
 */
export function createSessionViewState(options: SessionViewStateOptions): SessionViewState {
  const clientData = createClientDataPurge();
  const client = createSessionApiClient({
    channel: options.channel,
    clientData: { epoch: clientData.epoch, purge: clientData.purge },
  });
  const view = shallowRef<SessionView>('booting');
  const snapshot = shallowRef<SessionSnapshot | null>(null);
  const errorMessage = shallowRef<string | null>(null);

  // Requests are superseded before the state they would populate is cleared,
  // so a settlement that lands mid-purge cannot repopulate anything.
  clientData.register(() => {
    client.abortOutstandingRequests();
    // Session identity, Global epoch, and sequence generations belong to the
    // purged client model too. Reset them after aborting old requests so the
    // first post-purge response establishes one coherent fresh baseline
    // instead of being compared across different host sessions.
    client.resetBaseline();
  });
  clientData.register(() => {
    // Everything this module holds from the purged session: the snapshot and
    // its inventory/Source/file/diagnostic graph, and any retained error.
    // Later phases register their own owners (detail, comparison, editor
    // models, filters, and the FR-027 acknowledgement) with this same purge
    // rather than extending this callback.
    snapshot.value = null;
    errorMessage.value = null;
    // 'ended' is set by its own reporter and must survive the purge it runs:
    // a dead channel is not something a refetch recovers from.
    if (view.value !== 'ended') {
      view.value = 'booting';
    }
  });

  /** Fetches and adopts the snapshot, or leaves the current view intact. */
  async function refresh(): Promise<void> {
    const outcome = await client.fetchSession();
    switch (outcome.kind) {
      case 'adopted':
        snapshot.value = outcome.snapshot;
        errorMessage.value = null;
        view.value = 'inspection';
        return;
      case 'failed':
        errorMessage.value = outcome.error.message;
        view.value = 'ended';
        return;
      case 'purged':
        // The disposer already cleared the view.
        return;
      case 'rejected':
      case 'discarded':
        return;
    }
  }

  return {
    view,
    snapshot,
    errorMessage,
    start: refresh,
    reportChannelLost(error) {
      // Purge first: the disposer clears the retained error along with
      // everything else, so the reported message is set afterwards or it
      // would be wiped by its own purge.
      clientData.purge('channel-failure');
      view.value = 'ended';
      errorMessage.value = error === null ? null : error.message;
    },
    dispose: client.abortOutstandingRequests,
  };
}
