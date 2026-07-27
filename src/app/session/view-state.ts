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
// There is no session-liveness probe (plan.md § Structure Decision). Two facts made one unnecessary. A dead host closes
// the loopback socket, and devframe reports that as a connection-status
// change this module adopts directly — it does not have to be asked. And a
// Global-disable fence or a greater `globalContentEpoch` is rechecked on
// every inspection-data response by the API client, so a stale view cannot
// render even though nothing polls for it. What a probe uniquely added was
// observing *another tab's* disable proactively, which the product no
// longer models (spec.md FR-042).
//
// Nothing purges on a page-lifecycle event. FR-027
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
import { shallowRef, type InjectionKey, type ShallowRef } from 'vue';
import { createSessionApiClient, type SessionRpcChannel } from './api-client';
import { createClientDataPurge } from './client-data';
import type { RejectionCode, SessionSnapshot } from '../../shared/api-types';

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

/**
 * The lifecycle of the one explicit Repository rescan command this page can
 * have in flight (FR-030 request correlation):
 *  - 'idle'       no command issued since the last successful adoption
 *  - 'requesting' the command was sent and has not settled
 *  - 'accepted'   the host admitted it and issued {@link SessionViewState.activeScanRequestId}
 *  - 'rejected'   a declared closed rejection came back, e.g. `scan-in-progress`
 */
export type RescanState =
  /** No command has been issued since the last successful adoption. */
  | 'idle'
  /** The command was sent and has not settled yet. */
  | 'requesting'
  /** The host admitted the command and issued its request ID. */
  | 'accepted'
  /** The host returned a declared closed rejection for the command. */
  | 'rejected';

/** Construction inputs for {@link createSessionViewState}. */
export interface SessionViewStateOptions {
  /** The devframe RPC channel every request is issued on. */
  readonly channel: SessionRpcChannel;
}

/**
 * The reactive values and commands `App.vue` binds to. Every member here has
 * a render site or a caller in that component; nothing is exposed only so a
 * test can read it, because this module's behavior is observable through the
 * state it publishes and the requests it issues.
 */
export interface SessionViewState {
  /** Which surface to render; see {@link SessionView}. */
  readonly view: ShallowRef<SessionView>;
  /** The adopted snapshot; null in every non-'inspection' view. */
  readonly snapshot: ShallowRef<SessionSnapshot | null>;
  /** The real error message of a failed request; null while none is retained. */
  readonly errorMessage: ShallowRef<string | null>;
  /** Where the one explicit rescan command stands; see {@link RescanState}. */
  readonly rescanState: ShallowRef<RescanState>;
  /**
   * The `scanRequestId` of the currently admitted rescan command, or null.
   * Progress and status are shown only while they carry this exact ID, so
   * older status or inventory can never satisfy a newer command (FR-030).
   */
  readonly activeScanRequestId: ShallowRef<string | null>;
  /** The closed rejection code of a refused rescan command; null otherwise. */
  readonly rescanRejection: ShallowRef<RejectionCode | null>;
  /** Adopts the initial snapshot. */
  readonly start: () => Promise<void>;
  /**
   * Refetches and adopts the snapshot on demand. This is the only way status
   * advances: the product defines no timer, filesystem watcher, or
   * server-initiated push (contracts/http-api.md § get-session), so nothing
   * on this page updates by itself and there is no automatic update to pause.
   */
  readonly refresh: () => Promise<void>;
  /**
   * Dispatches one explicit Repository rescan and adopts the resulting
   * status. The host resolves the command with its acceptance, so the
   * committed generation arrives through a later {@link refresh}.
   */
  readonly requestRescan: () => Promise<void>;
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
  const rescanState = shallowRef<RescanState>('idle');
  const activeScanRequestId = shallowRef<string | null>(null);
  const rescanRejection = shallowRef<RejectionCode | null>(null);
  /**
   * Increments on every rescan the user issues. A refresh captures it when it
   * starts and only clears command state it still matches, so a refresh that
   * began before a rescan cannot erase that rescan's outcome.
   */
  let commandVersion = 0;

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
    // The rescan command belongs to the purged session too: its request ID
    // is meaningless against a different host session, and leaving it set
    // would let a post-purge status be mistaken for that command's result.
    rescanState.value = 'idle';
    activeScanRequestId.value = null;
    rescanRejection.value = null;
    // 'ended' is set by its own reporter and must survive the purge it runs:
    // a dead channel is not something a refetch recovers from.
    if (view.value !== 'ended') {
      view.value = 'booting';
    }
  });

  /** Fetches and adopts the snapshot, or leaves the current view intact. */
  async function refresh(): Promise<void> {
    // The client guards its own settlement against a purge, but that guard and
    // this assignment are in different microtasks: a purge running in the gap
    // clears the view, and the assignment below would then repopulate it with
    // data captured before it. Re-reading the epoch here puts the check and the
    // commit in one synchronous step (FR-027, FR-042).
    const capturedEpoch = clientData.epoch();
    const capturedCommandVersion = commandVersion;
    const outcome = await client.fetchSession();
    // Every branch below writes state the purge owns, so the check belongs
    // ahead of all of them. A fatal failure is the one exception: it purges on
    // its way here, so its own purge must not silence its report.
    const purged = clientData.epoch() !== capturedEpoch;
    switch (outcome.kind) {
      case 'adopted':
        if (purged) {
          return;
        }
        snapshot.value = outcome.snapshot;
        errorMessage.value = null;
        view.value = 'inspection';
        // A rejection describes a command that is now history. The snapshot
        // just adopted is the state the user asked about, so a stale
        // `scan-in-progress` must not outlive it and sit beside a Ready source.
        // `accepted` is different: it names a scan still running. A refresh
        // that started before a later rescan clears nothing: the rejection it
        // would erase belongs to a command it never saw.
        if (rescanState.value === 'rejected' && commandVersion === capturedCommandVersion) {
          rescanState.value = 'idle';
          rescanRejection.value = null;
        }
        return;
      case 'failed':
        // A non-fatal failure describes a request against the purged session,
        // so its error must not be written over the fresh one. A fatal failure
        // is what caused the purge and still has to be reported.
        if (purged && !outcome.fatal) {
          return;
        }
        errorMessage.value = outcome.error.message;
        // Only a lost channel or an unsupported protocol ends the session. A
        // handler or delivery failure is this request's error alone, so the
        // committed snapshot the user is reading stays on screen and another
        // refresh can still succeed (contracts/http-api.md § Concurrency and
        // lifecycle).
        if (outcome.fatal) {
          view.value = 'ended';
        }
        return;
      case 'purged':
        // The disposer already cleared the view.
        return;
      case 'rejected':
      case 'discarded':
        return;
    }
  }

  /**
   * Dispatches the explicit rescan, then adopts the status it produced. Only
   * an acceptance sets the active request ID; a rejection is a declared
   * functional outcome shown as such, and every other variant has already
   * been handled by the client's own guards (a purge cleared the view, a
   * failure ended the session, a discard means a newer command superseded
   * this one).
   */
  async function requestRescan(): Promise<void> {
    // One command at a time. A second dispatch while one is in flight would
    // supersede the first's token and lose the request ID it was admitted
    // with — work the host is already doing, which nothing would then name.
    if (rescanState.value === 'requesting') {
      return;
    }
    commandVersion += 1;
    rescanState.value = 'requesting';
    rescanRejection.value = null;
    // The previous command's ID stops naming "this scan" the moment a new one
    // is asked for. Keeping it until admission would let the progress of a
    // finished scan render as the progress of the one the user just started.
    activeScanRequestId.value = null;
    // Same boundary as `refresh`: a purge between the client's guard and this
    // commit must not be overwritten by a command state captured before it.
    const capturedEpoch = clientData.epoch();
    const outcome = await client.rescanRepository();
    // As in `refresh`: every branch writes state the purge owns.
    const purged = clientData.epoch() !== capturedEpoch;
    switch (outcome.kind) {
      case 'accepted':
        if (purged) {
          return;
        }
        rescanState.value = 'accepted';
        activeScanRequestId.value = outcome.scanRequestId;
        // The admission's own `SourceDto` is the Source as of acceptance, so
        // the row shows `scanning` even if the refresh below is slow or fails.
        // Waiting for the refresh alone would leave a Ready row beside an
        // accepted scan.
        if (snapshot.value !== null) {
          snapshot.value = {
            ...snapshot.value,
            sources: snapshot.value.sources.map((source) =>
              source.sourceId === outcome.source.sourceId ? outcome.source : source,
            ),
          };
        }
        // The committed generation arrives on this refresh.
        await refresh();
        return;
      case 'rejected':
        // The rejection belongs to the purged session's command; writing it
        // back would put a stale `scan-in-progress` on a freshly booting view.
        if (purged) {
          return;
        }
        rescanState.value = 'rejected';
        rescanRejection.value = outcome.code;
        return;
      case 'failed':
        if (purged && !outcome.fatal) {
          return;
        }
        rescanState.value = 'idle';
        errorMessage.value = outcome.error.message;
        if (outcome.fatal) {
          view.value = 'ended';
        }
        return;
      case 'purged':
        // The disposer already cleared the command state along with the view.
        return;
      case 'discarded':
        rescanState.value = 'idle';
        return;
    }
  }

  return {
    view,
    snapshot,
    errorMessage,
    rescanState,
    activeScanRequestId,
    rescanRejection,
    start: refresh,
    refresh,
    requestRescan,
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

/**
 * The provide/inject key the shell publishes its one session view state under.
 * The inventory route reads it rather than constructing its own: the session
 * has exactly one connection and one adopted snapshot per page, and a second
 * view state would race the first for the same request tokens.
 */
export const SESSION_VIEW_STATE: InjectionKey<SessionViewState> = Symbol('session-view-state');
