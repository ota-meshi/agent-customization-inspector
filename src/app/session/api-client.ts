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
// (contracts/http-api.md § Concurrency and lifecycle).
//
// No inspected content is persisted anywhere: no browser storage, no service
// worker, and no response cache holds it (FR-027). The one value this
// application does store is the reader's choice of which application to open
// a file in, which is a preference about their own machine and carries
// nothing that was inspected (`components/inspection/open-target-preference.ts`).
// This client also calls nothing outside the closed function catalog below.
import type {
  CommandResult,
  FileDetailDto,
  FileOpenTarget,
  InspectionDataResult,
  McpCarrierDetailDto,
  PluginCarrierDetailDto,
  PluginCarrierDetailParams,
  PermissionPolicyDetailDto,
  ScanAdmission,
  SessionSnapshot,
  SourceDto,
} from '../../shared/api-types';
import { DevframeConnectionError } from 'devframe/client';
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
  /** One committed file's complete authored source and, for a Markdown customization — a skill or an instruction file — its parse. */
  getFileDetail: 'agent-customization-inspector:get-file-detail',
  /** One MCP-declaring file's declarations and file facts, never its source (FR-007). */
  getMcpCarrierDetail: 'agent-customization-inspector:get-mcp-carrier-detail',
  getPluginCarrierDetail: 'agent-customization-inspector:get-plugin-carrier-detail',
  /** One declared permission policy, addressed by the path of the file that declares it. */
  getPermissionPolicyDetail: 'agent-customization-inspector:get-permission-policy-detail',
  /** Accept one explicit Repository scan command. */
  rescanRepository: 'agent-customization-inspector:rescan-repository',
  /** Open one committed file in an application on the reader's own machine. */
  openFile: 'agent-customization-inspector:open-file',
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
  /**
   * Invokes one registered server function by its exact catalog name. The
   * variadic tail is the function's own parameters — only the two detail
   * functions take one — kept untyped here because the channel is a transport and the
   * per-function shapes are checked where each call is issued.
   */
  call: (method: SessionRpcFunctionName, ...args: readonly unknown[]) => Promise<unknown>;
}

/**
 * Exactly the two members of the shared purge this client needs, injected
 * rather than constructed here: `client-data.ts` owns the implementation,
 * and this client only observes the epoch and triggers the purge — it never
 * registers a disposer. Spelled as a `Pick` so the two shapes cannot drift.
 */
export type ClientDataGuard = Pick<ClientDataPurge, 'epoch' | 'purge'>;

/**
 * The two independent generation sequences (FR-030): a commit in one
 * invalidates only that sequence's views.
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
      /** The call failed; see {@link fatal} for whether the session survived. */
      readonly kind: 'failed';
      /** The real transport error, or the fixed actionable unsupported-protocol error. */
      readonly error: Error;
      /**
       * True when the channel itself is gone or the protocol was unsupported:
       * the shared purge has run and no refetch recovers. False for a handler
       * or delivery failure, which is this request's error alone and leaves the
       * committed view intact (contracts/http-api.md § Concurrency and
       * lifecycle).
       */
      readonly fatal: boolean;
    };

/**
 * The outcome of one guarded `get-file-detail` request — the only response
 * that carries authored content, and therefore the only one FR-027 is about.
 *
 * The contract's detail request token is
 * `(clientDataEpoch, sourceRelativePath)`. The epoch is the shared guard every
 * response passes: a commit that purges client data advances it, so a
 * response captured before the purge never repopulates state. The path is
 * the file's stable identity (FR-030), resolved by the host against whatever
 * generation is current — which is why a result bound under a generation
 * newer than this client's adopted one is withheld as `newer-generation`
 * instead of rendered under state resolved from the older snapshot. The path
 * is the request-token family below — a newer selection supersedes the older
 * request before it can render.
 */
export type DetailFetchOutcome<Detail> =
  | {
      /** Every guard passed; the detail may be rendered. */
      readonly kind: 'adopted';
      /** The committed detail the invoked function serves. */
      readonly detail: Detail;
    }
  | {
      /** No current generation holds a file at the path; see `stale-resource`. */
      readonly kind: 'rejected';
      /** The fixed contract code; see {@link RejectionCode}. */
      readonly code: RejectionCode;
    }
  | {
      /**
       * The response was read from a generation newer than the adopted
       * snapshot, which the path — the file's whole identity — can survive,
       * so its content would render under labels resolved from the older
       * one. Nothing is adopted; the caller refreshes and re-requests
       * (`SessionViewState.openFileDetail`).
       */
      readonly kind: 'newer-generation';
    }
  | {
      /** An ordinary staleness outcome; nothing rendered, nothing purged. */
      readonly kind: 'discarded';
      /** Which guard dropped the response; see {@link DiscardReason}. */
      readonly reason: DiscardReason;
    }
  | {
      /** The shared purge already ran; the page has no data to render. */
      readonly kind: 'purged';
      /** Which documented trigger ran the purge; see {@link PurgeReason}. */
      readonly reason: PurgeReason;
    }
  | {
      /** The call failed; see {@link fatal} for whether the session survived. */
      readonly kind: 'failed';
      /** The real transport error, or the fixed unsupported-protocol error. */
      readonly error: Error;
      /** True when the channel is gone or the protocol was unsupported. */
      readonly fatal: boolean;
    };

/**
 * The outcome of one guarded `get-file-detail` request: the shared detail
 * outcome carrying the committed file with its authored source and, for a
 * Markdown customization, its parse.
 */
export type FileDetailOutcome = DetailFetchOutcome<FileDetailDto>;

/**
 * The outcome of one guarded `get-mcp-carrier-detail` request: the shared
 * detail outcome carrying the carrier's declarations and content-free file
 * facts — the one detail response with no authored source in it (FR-007).
 */
export type McpCarrierDetailOutcome = DetailFetchOutcome<McpCarrierDetailDto>;

/**
 * What one guarded detail request sends: the file's own Source-relative Path
 * for the file-addressed functions, and the carrier's path with the plugin the
 * page is about for `get-plugin-carrier-detail`, whose answer is one inventory
 * row's rather than the whole carrier's
 * (contracts/http-api.md § get-plugin-carrier-detail).
 */
type DetailRequestPayload = string | PluginCarrierDetailParams;

/**
 * The outcome of one guarded `get-plugin-carrier-detail` request: the shared
 * detail outcome carrying one plugin carrier's declarations, with the complete
 * authored source when that carrier is the plugin's own manifest and without
 * it when the carrier is a catalog (FR-007).
 */
export type PluginCarrierDetailOutcome = DetailFetchOutcome<PluginCarrierDetailDto>;

/**
 * The outcome of one guarded `get-permission-policy-detail` request: the
 * shared detail outcome carrying one declared permission policy. Its own
 * outcome because a permissions row names a policy rather than a file
 * (data-model.md § Inventory unit), so the result is that function's own.
 */
export type PermissionPolicyDetailOutcome = DetailFetchOutcome<PermissionPolicyDetailDto>;

/**
 * The outcome of one guarded `rescan-repository` command. A rescan is a
 * command, not an inspection-data read: its success carries the admitted
 * request ID and the updated Source summary, and never a generation snapshot
 * (contracts/http-api.md § Common results and errors).
 */
export type RescanOutcome =
  | {
      /** The command was admitted; the accepted job runs on the host. */
      readonly kind: 'accepted';
      /** The opaque request ID every later status for this command carries. */
      readonly scanRequestId: string;
      /** The Source projection as of admission, carrying that same ID. */
      readonly source: SourceDto;
    }
  | {
      /** A declared closed functional rejection, such as `scan-in-progress`. */
      readonly kind: 'rejected';
      /** The fixed contract code; see {@link RejectionCode}. */
      readonly code: RejectionCode;
    }
  | {
      /** An ordinary staleness outcome; nothing was admitted or rendered. */
      readonly kind: 'discarded';
      /** Which guard dropped the response; see {@link DiscardReason}. */
      readonly reason: DiscardReason;
    }
  | {
      /** The shared purge already ran; the shell has no data to render. */
      readonly kind: 'purged';
      /** Which documented trigger ran the purge; see {@link PurgeReason}. */
      readonly reason: PurgeReason;
    }
  | {
      /** The call failed; see {@link fatal} for whether the session survived. */
      readonly kind: 'failed';
      /** The real transport error, or the fixed unsupported-protocol error. */
      readonly error: Error;
      /** True when the channel is gone or the protocol was unsupported. */
      readonly fatal: boolean;
    };

/**
 * The outcome of one `open-file` command. It carries no payload and no
 * generation fields: the host reports that the launch was requested, and what
 * the machine does with the file it was handed is that machine's business
 * (contracts/http-api.md § open-file).
 *
 * There is no `discarded` variant, because nothing here is superseded: an
 * open request is one reader action on one file, so a second one is a second
 * launch rather than a newer view of the same state.
 */
export type FileOpenOutcome =
  | {
      /** The host launched the chosen application for the file. */
      readonly kind: 'opened';
    }
  | {
      /** A declared closed functional rejection; `stale-resource` is the one this command can take. */
      readonly kind: 'rejected';
      /** The fixed contract code; see {@link RejectionCode}. */
      readonly code: RejectionCode;
    }
  | {
      /** The call failed; see {@link fatal} for whether the session survived. */
      readonly kind: 'failed';
      /** The real transport error, or the fixed unsupported-protocol error. */
      readonly error: Error;
      /** True when the channel is gone or the protocol was unsupported. */
      readonly fatal: boolean;
    };

/** Construction inputs for {@link SessionApiClient}. */
export interface SessionApiClientOptions {
  /** The devframe RPC channel the client issues its calls on. */
  readonly channel: SessionRpcChannel;
  /** The `clientDataEpoch` source and the shared central purge. */
  readonly clientData: ClientDataGuard;
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
 * The guarded session API client (T048). All request state is
 * instance-local: nothing is written to browser storage, and no response is
 * cached for reuse — a later render always comes from a freshly adopted
 * response.
 */
export class SessionApiClient {
  /** The devframe RPC channel every call is issued on. */
  readonly #channel: SessionRpcChannel;

  /** The `clientDataEpoch` source and the shared central purge. */
  readonly #clientData: ClientDataGuard;

  // The adopted baseline. `null` means "not adopted yet", which is what
  // makes the very first response establish the baseline rather than fail
  // an identity or epoch comparison against a fabricated zero.
  /** The adopted host session identity; the outermost adoption boundary. */
  #sessionId: string | null = null;
  /** The adopted server-owned Global content epoch (FR-042). */
  #globalContentEpoch: number | null = null;
  /** The adopted Repository sequence generation (FR-030). */
  #repositoryGeneration: number | null = null;
  /** The adopted Global sequence generation; null while disabled. */
  #globalGeneration: number | null = null;

  // The latest issued token per response family. A settlement whose token is
  // no longer the latest is a late response and is discarded (FR-029 has the
  // server-side counterpart; this is the client half). The rescan command has
  // its own family: a superseded snapshot fetch must not silently invalidate
  // an in-flight command, and vice versa.
  /** The latest `get-session` token. */
  #latestSessionToken: symbol | null = null;
  /** The latest `get-file-detail` token. */
  #latestDetailToken: symbol | null = null;
  /** The latest `rescan-repository` token. */
  #latestRescanToken: symbol | null = null;

  // Outstanding controllers, split by what a generation adoption may abort. A
  // newer generation invalidates that sequence's *data* — the snapshot a fetch
  // was going to deliver — but it says nothing about a command still waiting
  // for its admission response, and aborting one would lose work the user asked
  // for (contracts/http-api.md § Concurrency and lifecycle). A purge abandons
  // both. The product defines no request timeout, retry timer, or memory lease:
  // the browser/network/runtime owns settlement.
  /** Outstanding inspection-data requests, abortable by a generation adoption. */
  readonly #outstandingData = new Set<AbortController>();
  /** Outstanding commands; only a purge abandons these. */
  readonly #outstandingCommands = new Set<AbortController>();

  /** Binds the client to its channel and the shared purge. */
  public constructor(options: SessionApiClientOptions) {
    this.#channel = options.channel;
    this.#clientData = options.clientData;
  }

  /** Forgets the adopted baseline so the next response establishes a fresh one. */
  public resetBaseline(): void {
    this.#sessionId = null;
    this.#globalContentEpoch = null;
    this.#repositoryGeneration = null;
    this.#globalGeneration = null;
  }

  /**
   * Abandons the inspection-data requests a newer generation supersedes. A
   * detail request belongs to this family: it was read from the generation
   * that just moved on, so its result carries content the page must re-request
   * under the new generation rather than show.
   */
  #abortDataRequests(): void {
    this.#latestSessionToken = null;
    this.#latestDetailToken = null;
    for (const controller of this.#outstandingData) {
      controller.abort();
    }
    this.#outstandingData.clear();
  }

  /**
   * Aborts every outstanding request and supersedes every issued token, so a
   * settlement that arrives afterwards is discarded instead of rendered.
   * Invoked by the shared purge and before adopting a newer generation.
   */
  public abortOutstandingRequests(): void {
    this.#abortDataRequests();
    this.#latestRescanToken = null;
    for (const controller of this.#outstandingCommands) {
      controller.abort();
    }
    this.#outstandingCommands.clear();
  }

  /**
   * Classifies a rejected call. A lost channel is terminal: the host is gone,
   * no refetch recovers from it, and the client purges before rendering the
   * ended view. Anything else — a handler that threw, a serialization or
   * delivery failure after it returned — is that one request's ordinary error
   * (contracts/http-api.md § Concurrency and lifecycle). Purging for it would
   * discard a snapshot the user is still reading over a single failed call.
   */
  #failureOutcome(cause: unknown): { kind: 'failed'; error: Error; fatal: boolean } {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    const fatal = error instanceof DevframeConnectionError;
    if (fatal) {
      this.#clientData.purge('channel-failure');
    }
    return { kind: 'failed', error, fatal };
  }

  /**
   * Applies the guards every settled response shares: the request must still
   * be the latest of its family, its controller must not have been aborted,
   * and no purge may have advanced `clientDataEpoch` since capture.
   */
  #guardSettlement(
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
    if (this.#clientData.epoch() !== capturedClientDataEpoch) {
      return 'client-data-epoch-advanced';
    }
    return null;
  }

  /**
   * Issues one guarded `get-session` request and adopts what it returns:
   * baseline identity, epoch, and generations advance only here.
   */
  public async fetchSession(): Promise<SessionFetchOutcome> {
    const token = Symbol('get-session');
    const controller = new AbortController();
    this.#latestSessionToken = token;
    this.#outstandingData.add(controller);
    const capturedClientDataEpoch = this.#clientData.epoch();
    let settled: unknown;
    try {
      settled = await this.#channel.call(SESSION_RPC_FUNCTIONS.getSession);
    } catch (cause: unknown) {
      this.#outstandingData.delete(controller);
      // A rejected call is still a settlement: if its request was already
      // superseded, aborted, or captured before a purge, it has no authority
      // to purge the newer client state (T042/T049).
      const discarded = this.#guardSettlement(
        token,
        this.#latestSessionToken,
        controller,
        capturedClientDataEpoch,
      );
      if (discarded !== null) {
        return { kind: 'discarded', reason: discarded };
      }
      return this.#failureOutcome(cause);
    }
    this.#outstandingData.delete(controller);
    const discarded = this.#guardSettlement(
      token,
      this.#latestSessionToken,
      controller,
      capturedClientDataEpoch,
    );
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
      this.#clientData.purge('channel-failure');
      return { kind: 'failed', error, fatal: true };
    }
    const result = settled as InspectionDataResult<SessionSnapshot>;
    // Session identity is the outermost adoption boundary. Compare it before
    // either epoch ordering or the fence: epochs are meaningful only within
    // one host session, so a restarted host's lower epoch must purge the old
    // session rather than look like an ordinary stale response.
    if (this.#sessionId !== null && result.data.sessionId !== this.#sessionId) {
      this.#clientData.purge('session-identity-lost');
      return { kind: 'purged', reason: 'session-identity-lost' };
    }
    // The final response gate: an inspection-data success renders only while
    // the epoch it was bound under is still the adopted one and the fence is
    // null. A result bound before disable acceptance is a bounded
    // pre-fence-authorized response the client must purge, never render.
    if (result.data.globalDisableInProgress !== null) {
      this.#clientData.purge('global-disable-fence');
      return { kind: 'purged', reason: 'global-disable-fence' };
    }
    if (this.#globalContentEpoch !== null && result.globalContentEpoch > this.#globalContentEpoch) {
      this.#clientData.purge('global-content-epoch-advanced');
      return { kind: 'purged', reason: 'global-content-epoch-advanced' };
    }
    if (this.#globalContentEpoch !== null && result.globalContentEpoch < this.#globalContentEpoch) {
      return { kind: 'discarded', reason: 'older-global-content-epoch' };
    }
    // Generation guards, applied per sequence because the two sequences are
    // independent (FR-030). An older generation for an already-adopted
    // sequence is ignored outright; a newer one aborts that sequence's
    // outstanding data requests before the new snapshot is adopted.
    if (
      this.#repositoryGeneration !== null &&
      result.repositoryGeneration < this.#repositoryGeneration
    ) {
      return { kind: 'discarded', reason: 'older-generation' };
    }
    if (
      this.#globalGeneration !== null &&
      result.globalGeneration !== null &&
      result.globalGeneration < this.#globalGeneration
    ) {
      return { kind: 'discarded', reason: 'older-generation' };
    }
    const advancedSequences: ScanSequence[] = [];
    if (
      this.#repositoryGeneration === null ||
      result.repositoryGeneration > this.#repositoryGeneration
    ) {
      advancedSequences.push('repository');
    }
    if (
      result.globalGeneration !== null &&
      (this.#globalGeneration === null || result.globalGeneration > this.#globalGeneration)
    ) {
      advancedSequences.push('global');
    }
    if (advancedSequences.length > 0) {
      // Only this sequence's generation-owned data requests are aborted; the
      // other sequence's committed views stay valid and are not refetched, and
      // a command awaiting its admission response is untouched. Phase 3 has
      // exactly one inspection-data request family, so that is all of them.
      this.#abortDataRequests();
    }
    this.#sessionId = result.data.sessionId;
    this.#globalContentEpoch = result.globalContentEpoch;
    this.#repositoryGeneration = result.repositoryGeneration;
    this.#globalGeneration = result.globalGeneration;
    return { kind: 'adopted', snapshot: result.data, advancedSequences };
  }

  /**
   * Issues the explicit Repository rescan command. It never adopts a
   * snapshot: the host resolves this invocation with its acceptance, and the
   * committed result arrives through the next `get-session`. The command's
   * own guards still run, so an acceptance that lands after a purge or after
   * a newer command was issued is discarded rather than shown as the active
   * request.
   */
  public async rescanRepository(): Promise<RescanOutcome> {
    const token = Symbol('rescan-repository');
    const controller = new AbortController();
    this.#latestRescanToken = token;
    this.#outstandingCommands.add(controller);
    const capturedClientDataEpoch = this.#clientData.epoch();
    let settled: unknown;
    try {
      settled = await this.#channel.call(SESSION_RPC_FUNCTIONS.rescanRepository);
    } catch (cause: unknown) {
      this.#outstandingCommands.delete(controller);
      const discarded = this.#guardSettlement(
        token,
        this.#latestRescanToken,
        controller,
        capturedClientDataEpoch,
      );
      if (discarded !== null) {
        return { kind: 'discarded', reason: discarded };
      }
      return this.#failureOutcome(cause);
    }
    this.#outstandingCommands.delete(controller);
    const discarded = this.#guardSettlement(
      token,
      this.#latestRescanToken,
      controller,
      capturedClientDataEpoch,
    );
    if (discarded !== null) {
      return { kind: 'discarded', reason: discarded };
    }
    const rejection = asRejectionCode(settled);
    if (rejection !== null) {
      return { kind: 'rejected', code: rejection };
    }
    if (hasErrorEnvelope(settled)) {
      const error = new Error(
        'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
      );
      this.#clientData.purge('channel-failure');
      return { kind: 'failed', error, fatal: true };
    }
    const result = settled as CommandResult<ScanAdmission>;
    // A command result carries no generation fields, so only the epoch guard
    // applies: a greater epoch means a Global purge happened while the
    // command was in flight and the admitted request belongs to state this
    // page must drop before rendering anything again.
    if (this.#globalContentEpoch !== null && result.globalContentEpoch > this.#globalContentEpoch) {
      this.#clientData.purge('global-content-epoch-advanced');
      return { kind: 'purged', reason: 'global-content-epoch-advanced' };
    }
    if (this.#globalContentEpoch !== null && result.globalContentEpoch < this.#globalContentEpoch) {
      return { kind: 'discarded', reason: 'older-global-content-epoch' };
    }
    return {
      kind: 'accepted',
      scanRequestId: result.data.scanRequestId,
      source: result.data.source,
    };
  }

  /**
   * Issues one guarded file-detail request. It never adopts a snapshot and
   * never advances the adopted baseline: a detail is a read of the
   * generations already adopted, so the epoch guard applies, and a result
   * bound under a newer generation than this client has adopted is withheld
   * as `newer-generation` — the caller refreshes and re-requests the same
   * path — rather than rendered under state resolved from the older one.
   */
  public fetchFileDetail(sourceRelativePath: string): Promise<FileDetailOutcome> {
    return this.#fetchDetail<FileDetailDto>(
      SESSION_RPC_FUNCTIONS.getFileDetail,
      sourceRelativePath,
    );
  }

  /**
   * Issues one guarded MCP-carrier-detail request through the same guards,
   * token family, and adoption rules as {@link fetchFileDetail}: the two
   * functions serve the one open detail, so a newer request of either kind
   * supersedes an older of the other (contracts/http-api.md
   * § get-mcp-carrier-detail).
   */
  public fetchMcpCarrierDetail(sourceRelativePath: string): Promise<McpCarrierDetailOutcome> {
    return this.#fetchDetail<McpCarrierDetailDto>(
      SESSION_RPC_FUNCTIONS.getMcpCarrierDetail,
      sourceRelativePath,
    );
  }

  /**
   * Issues one guarded plugin-carrier request through the same guards, token
   * family, and adoption rules as {@link fetchFileDetail}: the detail
   * functions serve the one open detail, so a newer request of any of them
   * supersedes an older of another (contracts/http-api.md
   * § get-plugin-carrier-detail).
   */
  public fetchPluginCarrierDetail(
    params: PluginCarrierDetailParams,
  ): Promise<PluginCarrierDetailOutcome> {
    return this.#fetchDetail<PluginCarrierDetailDto>(
      SESSION_RPC_FUNCTIONS.getPluginCarrierDetail,
      params,
    );
  }

  /**
   * Issues one guarded permission-policy request through the same guards,
   * token family, and adoption rules as {@link fetchFileDetail}: the detail
   * functions serve the one open detail, so a newer request of any of them
   * supersedes an older of another (contracts/http-api.md
   * § get-permission-policy-detail).
   */
  public fetchPermissionPolicyDetail(
    sourceRelativePath: string,
  ): Promise<PermissionPolicyDetailOutcome> {
    return this.#fetchDetail<PermissionPolicyDetailDto>(
      SESSION_RPC_FUNCTIONS.getPermissionPolicyDetail,
      sourceRelativePath,
    );
  }

  /**
   * The one guarded detail fetch every detail function shares. `Detail` is the
   * invoked function's declared result payload; the cast below is the same
   * wire-boundary typing every guarded fetch performs on its own settled
   * value, made once here so the public methods cannot drift in guard order or
   * outcome shape.
   */
  async #fetchDetail<Detail>(
    functionName: SessionRpcFunctionName,
    payload: DetailRequestPayload,
  ): Promise<DetailFetchOutcome<Detail>> {
    const token = Symbol(functionName);
    const controller = new AbortController();
    this.#latestDetailToken = token;
    this.#outstandingData.add(controller);
    const capturedClientDataEpoch = this.#clientData.epoch();
    let settled: unknown;
    try {
      settled = await this.#channel.call(functionName, payload);
    } catch (cause: unknown) {
      this.#outstandingData.delete(controller);
      const discarded = this.#guardSettlement(
        token,
        this.#latestDetailToken,
        controller,
        capturedClientDataEpoch,
      );
      if (discarded !== null) {
        return { kind: 'discarded', reason: discarded };
      }
      return this.#failureOutcome(cause);
    }
    this.#outstandingData.delete(controller);
    const discarded = this.#guardSettlement(
      token,
      this.#latestDetailToken,
      controller,
      capturedClientDataEpoch,
    );
    if (discarded !== null) {
      return { kind: 'discarded', reason: discarded };
    }
    const rejection = asRejectionCode(settled);
    if (rejection !== null) {
      return { kind: 'rejected', code: rejection };
    }
    if (hasErrorEnvelope(settled)) {
      const error = new Error(
        'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
      );
      this.#clientData.purge('channel-failure');
      return { kind: 'failed', error, fatal: true };
    }
    const result = settled as InspectionDataResult<Detail>;
    // The same epoch ordering every inspection-data success passes. A greater
    // epoch means a Global purge landed while this request was in flight, and
    // the content it carries belongs to state this page must drop before
    // rendering anything again (FR-042).
    if (this.#globalContentEpoch !== null && result.globalContentEpoch > this.#globalContentEpoch) {
      this.#clientData.purge('global-content-epoch-advanced');
      return { kind: 'purged', reason: 'global-content-epoch-advanced' };
    }
    if (this.#globalContentEpoch !== null && result.globalContentEpoch < this.#globalContentEpoch) {
      return { kind: 'discarded', reason: 'older-global-content-epoch' };
    }
    // A detail is a read of the adopted generations, and the path — the
    // file's whole identity — can survive a commit, so the host can answer a
    // generation-N page from its newer commit with no rejection at all.
    // Such a response is not adopted: rendering it would put the newer
    // generation's source and parse under the name and census this
    // page resolved from the older one. The caller refreshes, adopts the
    // newer snapshot, and re-requests (`SessionViewState.openFileDetail`). There
    // is no older branch to guard: the host serves every detail from its
    // current commit under one coordinator, so it cannot answer from a
    // generation behind one this client has already adopted.
    if (
      (this.#repositoryGeneration !== null &&
        result.repositoryGeneration > this.#repositoryGeneration) ||
      (result.globalGeneration !== null &&
        (this.#globalGeneration === null || result.globalGeneration > this.#globalGeneration))
    ) {
      return { kind: 'newer-generation' };
    }
    return { kind: 'adopted', detail: result.data };
  }

  /**
   * Asks the host to open one committed file in one of the applications the
   * snapshot published (contracts/http-api.md § open-file).
   *
   * None of the staleness guards the read paths carry apply: the command
   * renders nothing, so there is no state a late settlement could put on
   * screen, and no epoch or generation comparison can make a launch that
   * already happened un-happen. What remains is the failure handling every
   * call shares, so a lost channel still ends the session exactly once.
   */
  public async openFile(
    sourceRelativePath: string,
    target: FileOpenTarget,
  ): Promise<FileOpenOutcome> {
    let settled: unknown;
    try {
      settled = await this.#channel.call(
        SESSION_RPC_FUNCTIONS.openFile,
        sourceRelativePath,
        target,
      );
    } catch (cause: unknown) {
      return this.#failureOutcome(cause);
    }
    const rejection = asRejectionCode(settled);
    if (rejection !== null) {
      return { kind: 'rejected', code: rejection };
    }
    if (hasErrorEnvelope(settled)) {
      const error = new Error(
        'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
      );
      this.#clientData.purge('channel-failure');
      return { kind: 'failed', error, fatal: true };
    }
    return { kind: 'opened' };
  }
}
