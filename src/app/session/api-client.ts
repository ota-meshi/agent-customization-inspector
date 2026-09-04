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
  GlobalRescanParams,
  CommandResult,
  FileDetailDto,
  FileDetailParams,
  FileOpenTarget,
  GlobalConsentPreviewDto,
  GlobalDisableResultDto,
  GlobalFenceRecoverySnapshot,
  GlobalEnableResultDto,
  InspectionDataResult,
  HookCarrierDetailDto,
  McpCarrierDetailDto,
  PluginCarrierDetailDto,
  PluginCarrierDetailParams,
  PluginFileDetailDto,
  PluginFileDetailParams,
  PermissionPolicyDetailDto,
  ScanAdmission,
  SessionSnapshot,
  SourceDto,
  SourceSelector,
} from '../../shared/api-types';
import { DevframeConnectionError } from 'devframe/client';
import { isRejectionCode, type RejectionCode } from '../../shared/rejection-codes';
import type { ClientDataPurge, PurgeReason } from './client-data';

/**
 * The session RPC functions this client invokes, spelled exactly as the
 * host registers them under the `agent-customization-inspector:` namespace
 * (contracts/http-api.md § RPC function catalog). The client issues no
 * request outside this set, which is the product's whole catalog: every
 * function the host registers under that namespace is named here, so a
 * request this client cannot spell is a request the host does not answer.
 */
export const SESSION_RPC_FUNCTIONS = {
  /** Full `InspectionSession` snapshot, or the fenced control DTO. */
  getSession: 'agent-customization-inspector:get-session',
  /** One committed file's complete authored source and, for a Markdown customization — a skill or an instruction file — its parse. */
  getFileDetail: 'agent-customization-inspector:get-file-detail',
  /** One MCP-declaring file's declarations and file facts, never its source (FR-007). */
  getMcpCarrierDetail: 'agent-customization-inspector:get-mcp-carrier-detail',
  /** One hook-declaring file's lifecycle events and file facts, never its source (FR-007). */
  getHookCarrierDetail: 'agent-customization-inspector:get-hook-carrier-detail',
  getPluginCarrierDetail: 'agent-customization-inspector:get-plugin-carrier-detail',
  /** One file a plugin ships, read as that plugin's (contracts/http-api.md § get-plugin-file-detail). */
  getPluginFileDetail: 'agent-customization-inspector:get-plugin-file-detail',
  /** One declared permission policy, addressed by the path of the file that declares it. */
  getPermissionPolicyDetail: 'agent-customization-inspector:get-permission-policy-detail',
  /** Accept one explicit Repository scan command. */
  rescanRepository: 'agent-customization-inspector:rescan-repository',
  /** Accept one explicit scan command for one enabled Global Source. */
  rescanGlobal: 'agent-customization-inspector:rescan-global',
  /** The priority disable barrier for all inspection data (FR-042). */
  disableGlobal: 'agent-customization-inspector:disable-global',
  /** Open one committed file in an application on the reader's own machine. */
  openFile: 'agent-customization-inspector:open-file',
  /** The current Global consent preview, read without capturing anything. */
  getGlobalConsentPreview: 'agent-customization-inspector:get-global-consent-preview',
  /** Capture the four proposed Global roots and replace the unconsented preview. */
  createGlobalConsentPreview: 'agent-customization-inspector:create-global-consent-preview',
  /** Confirm the reviewed preview and admit every tool the server derives. */
  enableGlobal: 'agent-customization-inspector:enable-global',
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
      /**
       * The host is fenced by a non-complete disable barrier: the shared
       * purge has run and only the control-only recovery may render until a
       * later fetch returns the full snapshot again (FR-042).
       */
      readonly kind: 'fenced';
      /** The exact control-only recovery projection the host served. */
      readonly recovery: GlobalFenceRecoverySnapshot;
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
 * The outcome of one `disable-global` command
 * (contracts/http-api.md § disable-global): the terminal result — a no-op or
 * a disabled barrier — or the request's own failure. There is no discarded
 * variant, because a barrier is joined rather than superseded, and no purged
 * variant of its own: the caller purged before sending.
 */
export type GlobalDisableOutcome =
  | {
      /** The terminal result every joiner of the barrier shares. */
      readonly kind: 'completed';
      /** The documented result payload. */
      readonly result: GlobalDisableResultDto;
    }
  | {
      /** A declared closed functional rejection, not an error. */
      readonly kind: 'rejected';
      /** The fixed contract code; see {@link RejectionCode}. */
      readonly code: RejectionCode;
    }
  | {
      /** The call failed; a post-acceptance failure leaves the host fenced. */
      readonly kind: 'failed';
      /** The real transport or handler error. */
      readonly error: Error;
      /** True when the channel itself is gone or the protocol was unsupported. */
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
 * The outcome of one guarded `get-hook-carrier-detail` request: the shared
 * detail outcome over the hook carrier's own result
 * (contracts/http-api.md § get-hook-carrier-detail).
 */
export type HookCarrierDetailOutcome = DetailFetchOutcome<HookCarrierDetailDto>;

/**
 * What one guarded detail request sends: the file's own Source-relative Path
 * for the file-addressed functions, and the carrier's path with the plugin the
 * page is about for `get-plugin-carrier-detail`, whose answer is one inventory
 * row's rather than the whole carrier's
 * (contracts/http-api.md § get-plugin-carrier-detail).
 */
type DetailRequestPayload =
  string | FileDetailParams | PluginCarrierDetailParams | PluginFileDetailParams;

/**
 * The outcome of one guarded `get-plugin-carrier-detail` request: the shared
 * detail outcome carrying one plugin carrier's declarations, with the complete
 * authored source when that carrier is the plugin's own manifest and without
 * it when the carrier is a catalog (FR-007).
 */
export type PluginCarrierDetailOutcome = DetailFetchOutcome<PluginCarrierDetailDto>;

/**
 * The outcome of one guarded `get-plugin-file-detail` request: the shared
 * detail outcome carrying one file a plugin ships, with its complete authored
 * source (FR-025).
 */
export type PluginFileDetailOutcome = DetailFetchOutcome<PluginFileDetailDto>;

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
      /** The Source projection as the admitted scan left it, carrying that same ID. */
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
 * The outcome of one consent-preview call, read or capture
 * (contracts/http-api.md § get-global-consent-preview,
 * § create-global-consent-preview).
 *
 * There is no `discarded` variant, and no generation field to compare: a
 * preview is not inspection data, and the pair carries no staleness the client
 * could resolve — the read returns whatever is current, and a capture replaces
 * it. `missing` is the read's own declared rejection, kept as a variant of its
 * own because it is the ordinary state of a session nobody has asked for
 * consent in, not a failure to report.
 */
export type ConsentPreviewOutcome =
  | {
      /** The current preview, or the one this call captured. */
      readonly kind: 'ready';
      /** The frozen preview record's public projection. */
      readonly preview: GlobalConsentPreviewDto;
    }
  | {
      /**
       * The response observed a purge trigger — a greater Global content
       * epoch, or the disable fence's fixed conflict — so everything this
       * session held is purged before anything renders (FR-042).
       */
      readonly kind: 'purged';
      /** Which documented trigger ran the purge; see {@link PurgeReason}. */
      readonly reason: PurgeReason;
    }
  | {
      /**
       * The settlement outlived a purge: it belongs to the discarded world,
       * so nothing is adopted and — decisively — nothing is purged again, a
       * stale fence conflict included ({@link DiscardReason}).
       */
      readonly kind: 'discarded';
      /** Why the settlement was dropped; see {@link DiscardReason}. */
      readonly reason: DiscardReason;
    }
  | {
      /** No preview exists yet; the reader is asked to capture one. */
      readonly kind: 'missing';
    }
  | {
      /** A declared closed rejection other than `consent-preview-missing`. */
      readonly kind: 'rejected';
      /** The fixed contract code; see {@link RejectionCode}. */
      readonly code: RejectionCode;
    }
  | {
      /** The call failed; see {@link fatal} for whether the session survived. */
      readonly kind: 'failed';
      /** The real transport or handler error, reported as it arrived. */
      readonly error: Error;
      /** True only for a lost channel, which ends the session. */
      readonly fatal: boolean;
    };

/**
 * The outcome of one `enable-global` command
 * (contracts/http-api.md § enable-global).
 *
 * `rejected` covers every declared refusal — a stale preview, a moved read
 * scope, an unconfirmed body, a conflict — because each is a sentence the page
 * states rather than an error: the reader is told what to do next, which is
 * usually to take a fresh preview.
 */
export type GlobalEnableOutcome =
  | {
      /** The transaction was accepted; the result says what it admitted. */
      readonly kind: 'accepted';
      /** The acceptance result, including the shared batch request ID. */
      readonly result: GlobalEnableResultDto;
    }
  | {
      /**
       * The response observed a purge trigger — a greater Global content
       * epoch, or the disable fence's fixed conflict — so everything this
       * session held is purged before anything renders (FR-042).
       */
      readonly kind: 'purged';
      /** Which documented trigger ran the purge; see {@link PurgeReason}. */
      readonly reason: PurgeReason;
    }
  | {
      /**
       * The settlement outlived a purge: it belongs to the discarded world,
       * so nothing is adopted and — decisively — nothing is purged again, a
       * stale fence conflict included ({@link DiscardReason}).
       */
      readonly kind: 'discarded';
      /** Why the settlement was dropped; see {@link DiscardReason}. */
      readonly reason: DiscardReason;
    }
  | {
      /** A declared closed rejection. */
      readonly kind: 'rejected';
      /** The fixed contract code; see {@link RejectionCode}. */
      readonly code: RejectionCode;
    }
  | {
      /** The call failed; see {@link fatal} for whether the session survived. */
      readonly kind: 'failed';
      /** The real transport or handler error, reported as it arrived. */
      readonly error: Error;
      /** True only for a lost channel, which ends the session. */
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
 * launch rather than a newer view of the same state. An older-epoch response
 * is `opened` for the same reason — the launch happened, and the response
 * renders nothing a stale view could keep.
 */
export type FileOpenOutcome =
  | {
      /** The host launched the chosen application for the file. */
      readonly kind: 'opened';
    }
  | {
      /**
       * The response observed a purge trigger — a greater Global content
       * epoch on a launch that happened, or the disable fence's fixed
       * conflict — so the session state this page renders is purged
       * (FR-042).
       */
      readonly kind: 'purged';
      /** Which documented trigger ran the purge; see {@link PurgeReason}. */
      readonly reason: PurgeReason;
    }
  | {
      /**
       * The settlement outlived a purge: the launch may have happened, but
       * this response belongs to the discarded world, so nothing is adopted
       * and — decisively — nothing is purged again, a stale fence conflict
       * included ({@link DiscardReason}).
       */
      readonly kind: 'discarded';
      /** Why the settlement was dropped; see {@link DiscardReason}. */
      readonly reason: DiscardReason;
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
  // server-side counterpart; this is the client half). The rescan commands
  // have their own families: a superseded snapshot fetch must not silently
  // invalidate an in-flight command, and vice versa.
  /** The latest `get-session` token. */
  #latestSessionToken: symbol | null = null;
  /** The latest `get-file-detail` token. */
  #latestDetailToken: symbol | null = null;
  /**
   * The latest explicit-rescan token, one per sequence: the host admits a
   * Repository and a Global rescan side by side because they commit into
   * independent sequences (FR-030; contracts/http-api.md § rescan-global), so
   * a Global dispatch must not turn the Repository command's still-pending
   * admission into a superseded late response — that would leave its slot
   * showing `requesting` for a command the host accepted. Within one
   * sequence a newer dispatch still supersedes the older settlement.
   */
  readonly #latestRescanTokens: { repository: symbol | null; global: symbol | null } = {
    repository: null,
    global: null,
  };

  // Outstanding controllers, split by what a generation adoption may abort. A
  // newer generation invalidates that sequence's *data* — the snapshot a fetch
  // was going to deliver — but it says nothing about a command still waiting
  // for its admission response, and aborting one would lose work the user asked
  // for (contracts/http-api.md § Concurrency and lifecycle). A purge abandons
  // both. The product defines no request timeout, retry timer, or memory lease:
  // the browser/network/runtime owns settlement.
  /**
   * Outstanding inspection-data requests, each tagged with what invalidates
   * it: the requested Source's own sequence for a detail, `'both'` for a
   * bare-path detail nothing narrows, and `'session'` for a session fetch. A
   * generation adoption aborts only the entries the advanced sequences
   * invalidate — a commit invalidates only its own sequence's views (FR-030),
   * so a Global enable must not cut down a Repository comparison's in-flight
   * detail loads, which no route would ever re-request. The request's own
   * token rides along so the abort retires exactly the request it cancelled:
   * blanking the family's latest token outright would also discard a newer
   * request issued after the state the abort clears.
   */
  readonly #outstandingData = new Map<
    AbortController,
    { readonly sequence: ScanSequence | 'both' | 'session'; readonly token: symbol }
  >();
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
   *
   * `advanced` narrows the abort to what those sequences invalidate — the
   * other sequence's in-flight detail loads are that sequence's committed
   * reads and stay valid (FR-030). A session fetch is aborted either way: the
   * caller is about to adopt a newer snapshot than any in flight. Omitting
   * `advanced` aborts everything, which is the purge's shape.
   */
  #abortDataRequests(advanced?: ReadonlySet<ScanSequence>): void {
    for (const [controller, entry] of this.#outstandingData) {
      if (
        advanced !== undefined &&
        entry.sequence !== 'session' &&
        entry.sequence !== 'both' &&
        !advanced.has(entry.sequence)
      ) {
        continue;
      }
      controller.abort();
      this.#outstandingData.delete(controller);
      // Each family's latest token is retired only when the aborted request
      // is the one holding it: an invalidated Global detail abandoned
      // mid-load must not blank the token a Repository comparison's newer
      // request owns — that settlement would be discarded as superseded, and
      // the comparison would load forever on a page whose own sequence never
      // advanced.
      if (entry.sequence === 'session') {
        if (this.#latestSessionToken === entry.token) {
          this.#latestSessionToken = null;
        }
      } else if (this.#latestDetailToken === entry.token) {
        this.#latestDetailToken = null;
      }
    }
  }

  /**
   * Aborts every outstanding request and supersedes every issued token, so a
   * settlement that arrives afterwards is discarded instead of rendered.
   * Invoked by the shared purge and before adopting a newer generation.
   */
  public abortOutstandingRequests(): void {
    this.#abortDataRequests();
    this.#latestRescanTokens.repository = null;
    this.#latestRescanTokens.global = null;
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
    this.#outstandingData.set(controller, { sequence: 'session', token });
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
    if (typeof settled === 'object' && settled !== null && !('repositoryGeneration' in settled)) {
      // The control-only recovery snapshot a fenced host serves in place of
      // the full envelope (contracts/http-api.md § get-session
      // `GlobalFenceRecoverySnapshot`). Observing the non-null fence runs
      // the full purge before anything renders (FR-042); the recovery
      // projection itself is re-adopted after it, which is why the identity
      // and epoch are written below the purge.
      const fenced = settled as CommandResult<GlobalFenceRecoverySnapshot>;
      if (this.#sessionId !== null && fenced.data.sessionId !== this.#sessionId) {
        this.#clientData.purge('session-identity-lost');
        return { kind: 'purged', reason: 'session-identity-lost' };
      }
      this.#clientData.purge('global-disable-fence');
      this.#sessionId = fenced.data.sessionId;
      this.#globalContentEpoch = fenced.globalContentEpoch;
      return { kind: 'fenced', recovery: fenced.data };
    }
    const result = settled as InspectionDataResult<SessionSnapshot>;
    // Session identity is the outermost adoption boundary. Compare it before
    // epoch ordering: epochs are meaningful only within one host session, so
    // a restarted host's lower epoch must purge the old session rather than
    // look like an ordinary stale response. The disable fence needs no gate
    // of its own here: a fenced host answers this function with the recovery
    // snapshot above, never with a full envelope carrying a fence.
    if (this.#sessionId !== null && result.data.sessionId !== this.#sessionId) {
      this.#clientData.purge('session-identity-lost');
      return { kind: 'purged', reason: 'session-identity-lost' };
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
      // Only the advanced sequences' generation-owned data requests are
      // aborted; the other sequence's committed views — an in-flight detail
      // load among them — stay valid and are not refetched, and a command
      // awaiting its admission response is untouched.
      this.#abortDataRequests(new Set(advancedSequences));
    }
    this.#sessionId = result.data.sessionId;
    this.#globalContentEpoch = result.globalContentEpoch;
    this.#repositoryGeneration = result.repositoryGeneration;
    this.#globalGeneration = result.globalGeneration;
    return { kind: 'adopted', snapshot: result.data, advancedSequences };
  }

  /**
   * Issues the priority disable barrier command (contracts/http-api.md
   * § disable-global). The pre-request full purge is the caller's — the page
   * purges before sending (FR-042) — and this call carries no supersession
   * token: a barrier is joined, never replaced, and its settlement is the
   * terminal result every joiner shares. A post-acceptance failure arrives
   * as this request's real error and leaves the host fenced; the caller
   * refetches to observe the retained failed projection.
   */
  public async disableGlobal(): Promise<GlobalDisableOutcome> {
    let settled: unknown;
    try {
      settled = await this.#channel.call(SESSION_RPC_FUNCTIONS.disableGlobal);
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
    const result = settled as CommandResult<GlobalDisableResultDto>;
    // The barrier's epoch is adopted directly: the pre-request purge reset
    // the baseline, so this is the fresh era's first observation.
    this.#globalContentEpoch = result.globalContentEpoch;
    return { kind: 'completed', result: result.data };
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
    return this.#dispatchRescan('repository', SESSION_RPC_FUNCTIONS.rescanRepository);
  }

  /**
   * Issues one explicit Global rescan command for one published member
   * Source, through the same guards and outcome shape as
   * {@link SessionApiClient.rescanRepository} but in its own token family:
   * the two commands commit into independent sequences the host admits side
   * by side, so neither dispatch supersedes the other's settlement
   * (contracts/http-api.md § rescan-global).
   */
  public async rescanGlobal(sourceId: string): Promise<RescanOutcome> {
    return this.#dispatchRescan('global', SESSION_RPC_FUNCTIONS.rescanGlobal, { sourceId });
  }

  /**
   * The one guarded rescan dispatch both explicit-rescan commands share, so
   * the supersession, epoch, rejection, and acceptance handling cannot drift
   * between them (FR-030). `sequence` names the token family the dispatch
   * owns and supersedes within.
   */
  async #dispatchRescan(
    sequence: 'repository' | 'global',
    functionName: SessionRpcFunctionName,
    payload?: GlobalRescanParams,
  ): Promise<RescanOutcome> {
    const token = Symbol(functionName);
    const controller = new AbortController();
    this.#latestRescanTokens[sequence] = token;
    this.#outstandingCommands.add(controller);
    const capturedClientDataEpoch = this.#clientData.epoch();
    let settled: unknown;
    try {
      settled =
        payload === undefined
          ? await this.#channel.call(functionName)
          : await this.#channel.call(functionName, payload);
    } catch (cause: unknown) {
      this.#outstandingCommands.delete(controller);
      const discarded = this.#guardSettlement(
        token,
        this.#latestRescanTokens[sequence],
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
      this.#latestRescanTokens[sequence],
      controller,
      capturedClientDataEpoch,
    );
    if (discarded !== null) {
      return { kind: 'discarded', reason: discarded };
    }
    const rejection = asRejectionCode(settled);
    if (this.#observedFence(rejection)) {
      return { kind: 'purged', reason: 'global-disable-fence' };
    }
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
  public fetchFileDetail(
    sourceRelativePath: string,
    source: SourceSelector = 'repository',
  ): Promise<FileDetailOutcome> {
    // Both halves of the identity, because both are needed: a consented Global
    // home and the selected repository can hold the same Source-relative Path,
    // and asking by path alone answers with whichever the session lists first
    // (FR-030, contracts/http-api.md § get-file-detail).
    //
    // Every caller passes the Source its own address or side names; the
    // `repository` default only keeps a bare-path call spelling the ordinary
    // single-Source session's answer.
    return this.#fetchDetail<FileDetailDto>(SESSION_RPC_FUNCTIONS.getFileDetail, {
      sourceRelativePath,
      source,
    });
  }

  /**
   * Issues one guarded MCP-carrier-detail request through the same guards,
   * token family, and adoption rules as {@link fetchFileDetail}: the two
   * functions serve the one open detail, so a newer request of either kind
   * supersedes an older of the other (contracts/http-api.md
   * § get-mcp-carrier-detail).
   */
  public fetchMcpCarrierDetail(
    sourceRelativePath: string,
    source: SourceSelector = 'repository',
  ): Promise<McpCarrierDetailOutcome> {
    // Both halves of the carrier's identity, for the reason
    // {@link fetchFileDetail} sends both (FR-030).
    return this.#fetchDetail<McpCarrierDetailDto>(SESSION_RPC_FUNCTIONS.getMcpCarrierDetail, {
      sourceRelativePath,
      source,
    });
  }

  /**
   * Issues one guarded hook-carrier-detail request through the same guards,
   * token family, and adoption rules as {@link fetchFileDetail}: the detail
   * functions serve the one open detail, so a newer request of any of them
   * supersedes an older of another (contracts/http-api.md
   * § get-hook-carrier-detail).
   */
  public fetchHookCarrierDetail(
    sourceRelativePath: string,
    source: SourceSelector = 'repository',
  ): Promise<HookCarrierDetailOutcome> {
    return this.#fetchDetail<HookCarrierDetailDto>(SESSION_RPC_FUNCTIONS.getHookCarrierDetail, {
      sourceRelativePath,
      source,
    });
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
   * Issues one guarded plugin-file request through the same guards, token
   * family, and adoption rules as {@link fetchFileDetail}: the detail
   * functions serve the one open detail, so a newer request of any of them
   * supersedes an older of another (contracts/http-api.md
   * § get-plugin-file-detail).
   */
  public fetchPluginFileDetail(params: PluginFileDetailParams): Promise<PluginFileDetailOutcome> {
    return this.#fetchDetail<PluginFileDetailDto>(
      SESSION_RPC_FUNCTIONS.getPluginFileDetail,
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
    source: SourceSelector = 'repository',
  ): Promise<PermissionPolicyDetailOutcome> {
    return this.#fetchDetail<PermissionPolicyDetailDto>(
      SESSION_RPC_FUNCTIONS.getPermissionPolicyDetail,
      { sourceRelativePath, source },
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
    // The requested Source's own sequence, derived once for the abort tag
    // here and the freshness comparison below; a bare-path payload narrows
    // to neither, so either sequence's advance invalidates it.
    const requestedSource = typeof payload === 'string' ? null : payload.source;
    this.#outstandingData.set(controller, {
      sequence:
        requestedSource === null
          ? 'both'
          : requestedSource === 'repository'
            ? 'repository'
            : 'global',
      token,
    });
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
    if (this.#observedFence(rejection)) {
      return { kind: 'purged', reason: 'global-disable-fence' };
    }
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
    // Only the requested Source's own sequence decides freshness: a commit
    // invalidates only its own sequence's views (FR-030, spec.md
    // § Clarifications Session 2026-07-22), so a Global enable in another tab
    // must not turn a repository file's unchanged detail into a refresh that
    // drops the page's held editor state. A payload without a Source — the
    // bare-path spelling — is compared against both, because nothing narrows
    // it.
    const repositoryAdvanced =
      this.#repositoryGeneration !== null &&
      result.repositoryGeneration > this.#repositoryGeneration;
    const globalAdvanced =
      result.globalGeneration !== null &&
      (this.#globalGeneration === null || result.globalGeneration > this.#globalGeneration);
    if (
      requestedSource === null
        ? repositoryAdvanced || globalAdvanced
        : requestedSource === 'repository'
          ? repositoryAdvanced
          : globalAdvanced
    ) {
      return { kind: 'newer-generation' };
    }
    return { kind: 'adopted', detail: result.data };
  }

  /**
   * Asks the host to open one committed file in one of the applications the
   * snapshot published (contracts/http-api.md § open-file).
   *
   * The command renders nothing and no comparison can make a launch that
   * already happened un-happen, so there is no `discarded` path. The greater-
   * epoch guard still applies, exactly as it does to every other command
   * result (FR-042: a greater epoch on any response purges before rendering):
   * a disable landed while the request was in flight, and everything this
   * page still shows belongs to the purged world. A lost channel ends the
   * session exactly once, as every call's failure handling does.
   */
  public async openFile(
    sourceRelativePath: string,
    source: SourceSelector,
    target: FileOpenTarget,
  ): Promise<FileOpenOutcome> {
    const capturedClientDataEpoch = this.#clientData.epoch();
    let settled: unknown;
    try {
      // Both halves of the identity and the target as one object: the file the
      // reader clicked is the one that must open, and a consented home and the
      // selected repository can hold the same path under different roots
      // (FR-030, contracts/http-api.md § open-file).
      settled = await this.#channel.call(SESSION_RPC_FUNCTIONS.openFile, {
        sourceRelativePath,
        source,
        target,
      });
    } catch (cause: unknown) {
      return this.#failureOutcome(cause);
    }
    if (this.#clientData.epoch() !== capturedClientDataEpoch) {
      // Settled across a purge: this response — a stale fence conflict
      // included — describes the discarded world, and acting on it here
      // would purge the fresh state a newer request already adopted.
      return { kind: 'discarded', reason: 'client-data-epoch-advanced' };
    }
    const rejection = asRejectionCode(settled);
    if (this.#observedFence(rejection)) {
      return { kind: 'purged', reason: 'global-disable-fence' };
    }
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
    const result = settled as CommandResult<null>;
    if (this.#globalContentEpoch !== null && result.globalContentEpoch > this.#globalContentEpoch) {
      this.#clientData.purge('global-content-epoch-advanced');
      return { kind: 'purged', reason: 'global-content-epoch-advanced' };
    }
    return { kind: 'opened' };
  }

  /**
   * Reads the current consent preview without capturing anything
   * (contracts/http-api.md § get-global-consent-preview). A session nobody has
   * asked for consent in has none, which is the `missing` outcome rather than
   * an error: the page then offers to capture one.
   */
  public fetchGlobalConsentPreview(): Promise<ConsentPreviewOutcome> {
    return this.#consentPreviewCall(SESSION_RPC_FUNCTIONS.getGlobalConsentPreview);
  }

  /**
   * Captures the four proposed Global roots and replaces the unconsented
   * preview (contracts/http-api.md § create-global-consent-preview). It
   * submits no confirmation and grants no read authority: what comes back is
   * what the reader is about to be asked to confirm.
   */
  public createGlobalConsentPreview(): Promise<ConsentPreviewOutcome> {
    return this.#consentPreviewCall(SESSION_RPC_FUNCTIONS.createGlobalConsentPreview);
  }

  /**
   * Confirms the reviewed preview and asks the host to admit every tool it
   * derives (contracts/http-api.md § enable-global).
   *
   * The body carries the two identities the host validates against its own
   * stored record and nothing else: there is no tool list to send, so this
   * client cannot narrow, reorder, or extend what the confirmation covers.
   */
  public async enableGlobal(
    previewId: string,
    allowlistVersion: string,
  ): Promise<GlobalEnableOutcome> {
    const capturedClientDataEpoch = this.#clientData.epoch();
    let settled: unknown;
    try {
      settled = await this.#channel.call(SESSION_RPC_FUNCTIONS.enableGlobal, {
        confirmed: true,
        allowlistVersion,
        previewId,
      });
    } catch (cause: unknown) {
      return this.#failureOutcome(cause);
    }
    if (this.#clientData.epoch() !== capturedClientDataEpoch) {
      // Settled across a purge — a stale fence conflict included — so
      // nothing is adopted and nothing purges the fresh state again.
      return { kind: 'discarded', reason: 'client-data-epoch-advanced' };
    }
    const rejection = asRejectionCode(settled);
    if (this.#observedFence(rejection)) {
      return { kind: 'purged', reason: 'global-disable-fence' };
    }
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
    const result = settled as CommandResult<GlobalEnableResultDto>;
    // The same greater-epoch guard every command result passes (FR-042: a
    // greater epoch on any response purges before rendering): a disable
    // landed while this request was in flight, and the acceptance belongs
    // to the purged world. An older epoch is a response-order inversion over
    // the same record and adopts nothing stale, so it passes.
    if (this.#globalContentEpoch !== null && result.globalContentEpoch > this.#globalContentEpoch) {
      this.#clientData.purge('global-content-epoch-advanced');
      return { kind: 'purged', reason: 'global-content-epoch-advanced' };
    }
    return { kind: 'accepted', result: result.data };
  }

  /**
   * The fence observation an ordinary rejection can carry (FR-042): a
   * `global-disable-pending` code is the non-null fence, so the full purge
   * runs before anything renders — exactly as it does when the session
   * function answers with the recovery snapshot — and the caller reports
   * `purged` so its view enters control-only recovery instead of rendering
   * the conflict as a functional outcome. The session function itself never
   * takes this code (it answers a fence with the recovery snapshot), and
   * `disable-global` joins the barrier rather than being fenced by it.
   *
   * The open, enable, and preview commands deliberately carry no request
   * token or AbortController of their own: a settlement that outlives a
   * purge cannot mis-purge the fresh state, because a stale response only
   * ever carries the epoch its server held when it answered — never more
   * than the current one — and the reset baseline treats the first
   * post-purge observation as its own start. What a late settlement could
   * still write is owned by each caller's captured-epoch guard in the view
   * state, which drops it.
   */
  #observedFence(code: RejectionCode | null): boolean {
    if (code !== 'global-disable-pending') {
      return false;
    }
    this.#clientData.purge('global-disable-fence');
    return true;
  }

  /**
   * The call both preview functions share.
   *
   * The generation guards the read paths carry do not apply — a preview
   * carries no generation, a second read is a second look at whatever is
   * current, and a second capture is a new preview by design — but the
   * greater-epoch guard does, exactly as it does on every response (FR-042):
   * a disable that landed while this call was out purges before anything
   * renders. A lost channel still ends the session exactly once, through the
   * failure handling every call shares.
   */
  async #consentPreviewCall(method: SessionRpcFunctionName): Promise<ConsentPreviewOutcome> {
    const capturedClientDataEpoch = this.#clientData.epoch();
    let settled: unknown;
    try {
      settled = await this.#channel.call(method);
    } catch (cause: unknown) {
      return this.#failureOutcome(cause);
    }
    if (this.#clientData.epoch() !== capturedClientDataEpoch) {
      // Settled across a purge — a stale fence conflict included — so
      // nothing is adopted and nothing purges the fresh state again.
      return { kind: 'discarded', reason: 'client-data-epoch-advanced' };
    }
    const rejection = asRejectionCode(settled);
    if (this.#observedFence(rejection)) {
      return { kind: 'purged', reason: 'global-disable-fence' };
    }
    if (rejection !== null) {
      // The read's own declared outcome, which the page renders as an offer to
      // capture rather than as something that went wrong.
      return rejection === 'consent-preview-missing'
        ? { kind: 'missing' }
        : { kind: 'rejected', code: rejection };
    }
    if (hasErrorEnvelope(settled)) {
      const error = new Error(
        'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
      );
      this.#clientData.purge('channel-failure');
      return { kind: 'failed', error, fatal: true };
    }
    const result = settled as CommandResult<GlobalConsentPreviewDto>;
    // The same greater-epoch guard every result passes (FR-042: a greater
    // epoch on any response purges before rendering): a disable landed while
    // this read was out, and whatever else this session still holds belongs
    // to the purged world. An older epoch is a response-order inversion over
    // the one frozen preview record and adopts nothing stale, so it passes.
    if (this.#globalContentEpoch !== null && result.globalContentEpoch > this.#globalContentEpoch) {
      this.#clientData.purge('global-content-epoch-advanced');
      return { kind: 'purged', reason: 'global-content-epoch-advanced' };
    }
    return { kind: 'ready', preview: result.data };
  }
}
