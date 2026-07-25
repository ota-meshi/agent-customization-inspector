// Session API client for the browser SPA over the devframe RPC channel
// (T048, contracts/http-api.md § Common results and errors, § get-session).
// This module owns every adoption guard that stands between a settled RPC
// response and rendered state: the per-request opaque token, the
// client-owned `clientDataEpoch`, the server-owned `globalContentEpoch`,
// and the two independent generation sequences.
//
// An inspection-data success is adopted only while the fence is null and
// the epoch it was bound under is unchanged, so graph state can never
// render behind a Global disable. That check runs on every response rather
// than being probed for: the product has no separate liveness function, so
// a fence or epoch change is discovered by the next request either way
// (contracts/http-api.md § Concurrency and lifecycle, amended 2026-07-24).
//
// The client performs no persistence of any kind: no browser storage, no
// service worker, and no response cache holds inspected content. It also
// calls nothing outside the closed function catalog below.
import type { InspectionDataResult, SessionSnapshot } from '../../shared/api-types';
import { isRejectionCode, type RejectionCode } from '../../shared/rejection-codes';
import type { ClientDataPurge, PurgeReason } from './client-data';

/**
 * The session RPC functions this client invokes, spelled exactly as the
 * host registers them under the `agent-customization-inspector:` namespace
 * (contracts/http-api.md § RPC function catalog). The client issues no
 * request outside this set; the remaining catalog entries arrive with the
 * phases that use them.
 */
export const SESSION_RPC_FUNCTIONS = {
  /** Full `InspectionSession` snapshot, or the fenced control DTO. */
  getSession: 'agent-customization-inspector:get-session',
} as const;

/** One member of the closed {@link SESSION_RPC_FUNCTIONS} catalog. */
export type SessionRpcFunctionName =
  (typeof SESSION_RPC_FUNCTIONS)[keyof typeof SESSION_RPC_FUNCTIONS];

/**
 * The minimal request/response surface this client needs from the devframe
 * RPC channel. Declared structurally rather than imported so the guards can
 * be exercised without a live WebSocket, and so the client never reaches
 * for a channel capability outside plain request/response (the product
 * defines no server-initiated push of inspection data).
 */
export interface SessionRpcChannel {
  /** Invokes one registered server function by its exact catalog name. */
  call: (method: SessionRpcFunctionName) => Promise<unknown>;
}

/**
 * Exactly the two members of the shared purge this client needs, injected
 * rather than constructed here: `client-data.ts` owns the implementation,
 * and this client only observes the epoch and triggers the purge — it never
 * registers a disposer. Spelled as a `Pick` so the two shapes cannot drift.
 */
export type ClientDataGuard = Pick<ClientDataPurge, 'epoch' | 'purge'>;

/**
 * The two independent generation sequences (FR-030): a commit in one rekeys
 * and invalidates only that sequence's generation-owned IDs and views.
 */
export type ScanSequence =
  /** The Repository Source and its independently committed generations. */
  | 'repository'
  /** The consent-gated Global Sources and their independently committed generations. */
  | 'global';

/**
 * Why a settled response was dropped without rendering. Every member is an
 * ordinary staleness outcome, not an error.
 */
export type DiscardReason =
  /** A newer request token for the same family was issued before this one settled. */
  | 'superseded-request'
  /** The request was abandoned by a purge or newer-generation adoption. */
  | 'aborted'
  /** A purge advanced `clientDataEpoch` after this request captured it. */
  | 'client-data-epoch-advanced'
  /** The result belongs to an older generation of its independent scan sequence. */
  | 'older-generation'
  /** The result predates the Global content epoch already adopted in this session. */
  | 'older-global-content-epoch';

/**
 * The outcome of one guarded `get-session` request. Only `adopted` may
 * reach rendered inspection state; every other variant leaves the current
 * view untouched or has already purged it.
 */
export type SessionFetchOutcome =
  | {
      /** Every guard passed; the snapshot may be rendered. */
      readonly kind: 'adopted';
      /** The complete snapshot bound by the host under its coordinator lock. */
      readonly snapshot: SessionSnapshot;
      /** Sequences whose generation advanced with this adoption (FR-030). */
      readonly advancedSequences: readonly ScanSequence[];
    }
  | {
      /** An ordinary staleness outcome; nothing rendered, nothing purged. */
      readonly kind: 'discarded';
      /** Which guard dropped the response; see {@link DiscardReason}. */
      readonly reason: DiscardReason;
    }
  | {
      /** A declared closed functional rejection, not an error. */
      readonly kind: 'rejected';
      /** The fixed contract code; see {@link RejectionCode}. */
      readonly code: RejectionCode;
    }
  | {
      /** The shared purge already ran; the shell has no data to render. */
      readonly kind: 'purged';
      /** Which documented trigger ran the purge; see {@link PurgeReason}. */
      readonly reason: PurgeReason;
    }
  | {
      /** The channel or session protocol failed; the shared purge already ran. */
      readonly kind: 'failed';
      /** The real transport error, or the fixed actionable unsupported-protocol error. */
      readonly error: Error;
    };

/** Construction inputs for {@link createSessionApiClient}. */
export interface SessionApiClientOptions {
  /** The devframe RPC channel the client issues its calls on. */
  readonly channel: SessionRpcChannel;
  /** The `clientDataEpoch` source and the shared central purge. */
  readonly clientData: ClientDataGuard;
}

/** The guarded session API surface consumed by the session shell. */
export interface SessionApiClient {
  /** Issues one guarded `get-session` request. */
  readonly fetchSession: () => Promise<SessionFetchOutcome>;
  /**
   * Aborts every outstanding request and supersedes every issued token, so
   * a settlement that arrives afterwards is discarded instead of rendered.
   * Invoked by the shared purge and before adopting a newer generation.
   */
  readonly abortOutstandingRequests: () => void;
  /** Forgets the adopted baseline so the next response establishes a fresh one. */
  readonly resetBaseline: () => void;
}

/**
 * Narrows an unknown settled value to the deterministic rejection envelope.
 * A rejection is a declared closed functional outcome with a fixed code, so
 * it is matched structurally rather than by message text
 * (contracts/http-api.md § Common results and errors).
 */
function asRejectionCode(value: unknown): RejectionCode | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return null;
  }
  const error: unknown = (value as { error: unknown }).error;
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  const code: unknown = (error as { code: unknown }).code;
  return isRejectionCode(code) ? code : null;
}

/**
 * Detects a response shaped as a rejection envelope even when its payload
 * falls outside the closed rejection contract.
 */
function hasErrorEnvelope(value: unknown): value is { readonly error: unknown } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

/**
 * Creates the guarded session API client (T048). All request state is
 * closure-local: nothing is written to browser storage, and no response is
 * cached for reuse — a later render always comes from a freshly adopted
 * response.
 */
export function createSessionApiClient(options: SessionApiClientOptions): SessionApiClient {
  const { channel, clientData } = options;

  // The adopted baseline. `null` means "not adopted yet", which is what
  // makes the very first response establish the baseline rather than fail
  // an identity or epoch comparison against a fabricated zero.
  let sessionId: string | null = null;
  let globalContentEpoch: number | null = null;
  let repositoryGeneration: number | null = null;
  let globalGeneration: number | null = null;

  // The latest issued token per response family. A settlement whose token is
  // no longer the latest is a late response and is discarded (FR-029 has the
  // server-side counterpart; this is the client half).
  let latestSessionToken: symbol | null = null;

  // Every outstanding request's controller, so a purge or a newer-generation
  // adoption can abort them. The product defines no request timeout, retry
  // timer, or memory lease: the browser/network/runtime owns settlement.
  const outstanding = new Set<AbortController>();

  function abortOutstandingRequests(): void {
    latestSessionToken = null;
    for (const controller of outstanding) {
      controller.abort();
    }
    outstanding.clear();
  }

  /**
   * Applies the guards every settled response shares: the request must still
   * be the latest of its family, its controller must not have been aborted,
   * and no purge may have advanced `clientDataEpoch` since capture.
   */
  function guardSettlement(
    token: symbol,
    latest: symbol | null,
    controller: AbortController,
    capturedClientDataEpoch: number,
  ): DiscardReason | null {
    if (controller.signal.aborted) {
      return 'aborted';
    }
    if (token !== latest) {
      return 'superseded-request';
    }
    if (clientData.epoch() !== capturedClientDataEpoch) {
      return 'client-data-epoch-advanced';
    }
    return null;
  }

  async function fetchSession(): Promise<SessionFetchOutcome> {
    const token = Symbol('get-session');
    const controller = new AbortController();
    latestSessionToken = token;
    outstanding.add(controller);
    const capturedClientDataEpoch = clientData.epoch();
    let settled: unknown;
    try {
      settled = await channel.call(SESSION_RPC_FUNCTIONS.getSession);
    } catch (cause: unknown) {
      outstanding.delete(controller);
      // A rejected call is still a settlement: if its request was already
      // superseded, aborted, or captured before a purge, it has no authority
      // to purge the newer client state (T042/T049).
      const discarded = guardSettlement(
        token,
        latestSessionToken,
        controller,
        capturedClientDataEpoch,
      );
      if (discarded !== null) {
        return { kind: 'discarded', reason: discarded };
      }
      // A lost or failed channel connection purges before rendering the
      // ended view; the real error is surfaced ordinarily.
      clientData.purge('channel-failure');
      return { kind: 'failed', error: cause instanceof Error ? cause : new Error(String(cause)) };
    }
    outstanding.delete(controller);
    const discarded = guardSettlement(token, latestSessionToken, controller, capturedClientDataEpoch);
    if (discarded !== null) {
      return { kind: 'discarded', reason: discarded };
    }
    const rejection = asRejectionCode(settled);
    if (rejection !== null) {
      return { kind: 'rejected', code: rejection };
    }
    if (hasErrorEnvelope(settled)) {
      // A code outside the closed catalog is a protocol failure, never a
      // functional outcome the client may cast into existence. Purge the
      // current view before presenting the terminal failure.
      const error = new Error(
        'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
      );
      clientData.purge('channel-failure');
      return { kind: 'failed', error };
    }
    const result = settled as InspectionDataResult<SessionSnapshot>;
    // Session identity is the outermost adoption boundary. Compare it before
    // either epoch ordering or the fence: epochs are meaningful only within
    // one host session, so a restarted host's lower epoch must purge the old
    // session rather than look like an ordinary stale response.
    if (sessionId !== null && result.data.sessionId !== sessionId) {
      clientData.purge('session-identity-lost');
      return { kind: 'purged', reason: 'session-identity-lost' };
    }
    // The final response gate: an inspection-data success renders only while
    // the epoch it was bound under is still the adopted one and the fence is
    // null. A result bound before disable acceptance is a bounded
    // pre-fence-authorized response the client must purge, never render.
    if (result.data.globalDisableInProgress !== null) {
      clientData.purge('global-disable-fence');
      return { kind: 'purged', reason: 'global-disable-fence' };
    }
    if (globalContentEpoch !== null && result.globalContentEpoch > globalContentEpoch) {
      clientData.purge('global-content-epoch-advanced');
      return { kind: 'purged', reason: 'global-content-epoch-advanced' };
    }
    if (globalContentEpoch !== null && result.globalContentEpoch < globalContentEpoch) {
      return { kind: 'discarded', reason: 'older-global-content-epoch' };
    }
    // Generation guards, applied per sequence because the two sequences are
    // independent (FR-030). An older generation for an already-adopted
    // sequence is ignored outright; a newer one aborts that sequence's
    // outstanding data requests before the new snapshot is adopted.
    if (repositoryGeneration !== null && result.repositoryGeneration < repositoryGeneration) {
      return { kind: 'discarded', reason: 'older-generation' };
    }
    if (
      globalGeneration !== null &&
      result.globalGeneration !== null &&
      result.globalGeneration < globalGeneration
    ) {
      return { kind: 'discarded', reason: 'older-generation' };
    }
    const advancedSequences: ScanSequence[] = [];
    if (repositoryGeneration === null || result.repositoryGeneration > repositoryGeneration) {
      advancedSequences.push('repository');
    }
    if (
      result.globalGeneration !== null &&
      (globalGeneration === null || result.globalGeneration > globalGeneration)
    ) {
      advancedSequences.push('global');
    }
    if (advancedSequences.length > 0) {
      // Only this sequence's generation-owned requests are aborted; the
      // other sequence's committed views stay valid and are not refetched.
      // Phase 3 has exactly one inspection-data request family, so the
      // abort is the whole outstanding set.
      abortOutstandingRequests();
    }
    sessionId = result.data.sessionId;
    globalContentEpoch = result.globalContentEpoch;
    repositoryGeneration = result.repositoryGeneration;
    globalGeneration = result.globalGeneration;
    return { kind: 'adopted', snapshot: result.data, advancedSequences };
  }

  return {
    fetchSession,
    abortOutstandingRequests,
    resetBaseline: () => {
      sessionId = null;
      globalContentEpoch = null;
      repositoryGeneration = null;
      globalGeneration = null;
    },
  };
}
