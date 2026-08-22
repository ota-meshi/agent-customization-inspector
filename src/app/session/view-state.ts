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
//
// There is no acknowledgement gate in front of authored content (FR-027). It
// would protect nothing: the session API is reachable
// only through the loopback bind, which FR-027 itself named as the whole
// boundary, and the files being shown are the viewer's own. What the gate did
// do was make every file take two interactions to read. The detail route says
// what it is showing instead.
import { computed, shallowRef, type InjectionKey } from 'vue';
import { SessionApiClient, type FileOpenOutcome, type SessionRpcChannel } from './api-client';
import { ClientDataPurge } from './client-data';
import { clearInventoryReturnPoint } from '../router.options';
import { InstructionComparisonState } from '../composables/instruction-comparison';
import { McpComparisonState } from '../composables/mcp-comparison';
import { SkillComparisonState } from '../composables/skill-comparison';
import type {
  FileDetailDto,
  FileOpenTarget,
  McpCarrierDetailDto,
  PermissionPolicyDetailDto,
  RejectionCode,
  SessionSnapshot,
} from '../../shared/api-types';

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

/**
 * Where the one open file detail stands (contracts/http-api.md
 * § get-file-detail):
 *  - 'idle'             no file is open, or the open one was cleaned up
 *  - 'loading'          a detail request is in flight
 *  - 'ready'            a detail passed every guard and may be rendered
 *  - 'companion-failed' the held entry stays shown; only the selected
 *                       companion's request failed
 *  - 'stale'            the host answered `stale-resource`: no current
 *                       generation holds a file at the requested path — a
 *                       link from a snapshot whose file a commit removed
 */
export type FileDetailState =
  /** No file is open. */
  | 'idle'
  /** A detail request is in flight. */
  | 'loading'
  /** A detail passed every guard and is rendered. */
  | 'ready'
  /**
   * The held entry point is still shown, but the selected companion's own
   * request failed ordinarily. Only the pane is failed: the recognition and
   * the file tree describe the skill rather than the file that did not load,
   * and dropping them would discard good state over one file's error.
   */
  | 'companion-failed'
  /** The requested file belongs to no current generation. */
  | 'stale';

/** Construction inputs for {@link SessionViewState}. */
export interface SessionViewStateOptions {
  /** The devframe RPC channel every request is issued on. */
  readonly channel: SessionRpcChannel;
}

/**
 * The reactive values and commands `App.vue` binds to — the browser's view of
 * the one host session. Every public member has a render site or a caller in
 * that component; nothing is exposed only so a test can read it, because this
 * module's behavior is observable through the state it publishes and the
 * requests it issues.
 *
 * Construction performs no I/O; {@link SessionViewState.start} issues the
 * first request, so a caller can assert the exact request sequence from a
 * quiescent starting point.
 */
export class SessionViewState {
  /** The shared client-data purge; every owner below registers with it. */
  readonly #clientData: ClientDataPurge;

  /** The guarded API client every request goes through. */
  readonly #client: SessionApiClient;

  /**
   * The skill comparison view state (FR-011). Owned here because it shares
   * this state's client, purge, and generation lifecycle: the same adoption
   * that closes the open detail drops the open comparison, and the same purge
   * clears both. The skill compare route opens and switches its view; the
   * pair itself is the route's query, not standing state. Skill-scoped by
   * design — a later family's comparison surface arrives as its own state,
   * not by widening this one.
   */
  public readonly skillComparison: SkillComparisonState;

  /**
   * The instruction comparison view state (FR-011), owned here for the same
   * reasons {@link skillComparison} is. Its own state rather than a widening
   * of the skill one, because comparison is kind-specific with no shared
   * module (spec.md § Clarifications Session 2026-08-14): this kind's model
   * is two committed instruction files compared whole, with no copy or
   * corresponding-file coordinate.
   */
  public readonly instructionComparison: InstructionComparisonState;

  /**
   * The MCP comparison view state (FR-011), owned here for the same reasons
   * {@link skillComparison} is. Its own state rather than a widening of the
   * others, because comparison is kind-specific with no shared module
   * (spec.md § Clarifications Session 2026-08-14): this kind's model is two
   * explicit carriers compared by the declarations each wrote, with no
   * source half at all (FR-007).
   */
  public readonly mcpComparison: McpComparisonState;

  /** Which surface to render; see {@link SessionView}. */
  public readonly view = shallowRef<SessionView>('booting');

  /** The adopted snapshot; null in every non-'inspection' view. */
  public readonly snapshot = shallowRef<SessionSnapshot | null>(null);

  /**
   * The real error message of a failed session-level request — a refresh, a
   * rescan command, a lost channel — or null while none is retained. Held
   * apart from {@link #detailError} because the two describe different things
   * and can be true at once: one slot would let a companion's failure erase a
   * refresh failure nobody has resolved, and clearing it with the route would
   * take both.
   */
  readonly #sessionError = shallowRef<string | null>(null);

  /**
   * The real error message of the open detail's own failed request, or
   * null while none is retained. Cleared with the route that owns it: left
   * behind it would sit on the inventory with no file context and no retry
   * control.
   */
  readonly #detailError = shallowRef<string | null>(null);

  /**
   * The session's own failure, shown and announced by the shell.
   *
   * One surface owns each kind of error, so no precedence rule is needed and no
   * failure can be hidden behind another: the shell reports what happened to the
   * session, and the route that made a detail request reports what happened to
   * it. A single message with a priority between them meant a detail failure
   * arriving while a session error stood changed nothing on screen.
   */
  public readonly sessionErrorMessage = computed<string | null>(() => this.#sessionError.value);

  /**
   * The open detail's own failed request, shown and announced by the
   * detail route beside its retry; see {@link sessionErrorMessage}.
   */
  public readonly detailErrorMessage = computed<string | null>(() => this.#detailError.value);

  /** Where the one explicit rescan command stands; see {@link RescanState}. */
  public readonly rescanState = shallowRef<RescanState>('idle');

  /**
   * The `scanRequestId` of the currently admitted rescan command, or null.
   * Progress and status are shown only while they carry this exact ID, so
   * older status or inventory can never satisfy a newer command (FR-030).
   */
  public readonly activeScanRequestId = shallowRef<string | null>(null);

  /** The closed rejection code of a refused rescan command; null otherwise. */
  public readonly rescanRejection = shallowRef<RejectionCode | null>(null);

  /**
   * The open customization's own file — a skill's `SKILL.md` entry point, or
   * a file that is itself the customization, an instruction file or a rule
   * file — whose recognitions say what the open customization is.
   *
   * Set as soon as {@link openFileDetail} owns it, which is before the page is
   * 'ready': a direct link to a skill's companion fetches the entry first, and
   * holding it from that moment is what leaves 'companion-failed' a skill to
   * keep showing instead of an empty page. The detail route renders its
   * loading state until 'ready' or 'companion-failed', so an entry set during
   * 'loading' is state no surface has shown yet. Null in 'idle', in 'stale',
   * and until the entry answers.
   */
  public readonly entryDetail = shallowRef<FileDetailDto | null>(null);

  /**
   * The companion file being read, or null when the entry point itself is.
   * The entry point is already held above, so opening it again would be one
   * detail under two names.
   */
  public readonly openCompanion = shallowRef<FileDetailDto | null>(null);

  /**
   * The open MCP carrier detail, or null while none is. Its own slot beside
   * {@link entryDetail} because it is another function's result with another
   * shape — the one detail response with no authored source in it (FR-007;
   * contracts/http-api.md § get-mcp-carrier-detail) — while the request
   * version, state machine, and purge path below are shared: the two slots
   * are one open detail, so at most one is non-null.
   */
  public readonly carrierDetail = shallowRef<McpCarrierDetailDto | null>(null);

  /**
   * The open permission policy, or null while none is. Its own slot beside
   * {@link entryDetail} for the reason {@link carrierDetail} has one: it is
   * another function's result about another subject — a permissions row names
   * a policy rather than a file (contracts/http-api.md
   * § get-permission-policy-detail) — while the request version, state
   * machine, and purge path below are shared, so at most one slot is non-null.
   */
  public readonly policyDetail = shallowRef<PermissionPolicyDetailDto | null>(null);

  /** Where the open detail stands; see {@link FileDetailState}. */
  public readonly fileDetailState = shallowRef<FileDetailState>('idle');

  /**
   * The subject the active route reports for the document title — a detail
   * page writes its heading's subject here, so the title says which
   * customization a tab shows rather than only which surface (WCAG 2.4.2,
   * contracts/accessibility-acceptance.md: a descriptive, state-appropriate
   * document title per route). Null when the active route has no subject
   * beyond itself; the shell then titles the route by its surface name.
   * Written through {@link reportPageSubject} and cleared through
   * {@link releasePageSubject}, because route navigation mounts the next page
   * before the previous one is torn down: an unowned clear in the outgoing
   * page's unmount would erase the subject its replacement just reported —
   * permanently, when the replacement is a dead-link view with no later
   * state change to re-report it.
   */
  public readonly pageSubject = shallowRef<string | null>(null);

  /**
   * The token of the page instance whose report the subject currently
   * carries, or null when no page owns it; the same unmount-ordering guard
   * {@link #detailOwner} is (`usePageOwnership`).
   */
  #pageSubjectOwner: symbol | null = null;

  /**
   * Reports the active route's title subject as the calling page instance's
   * own, so a later release by a page that no longer owns it is a no-op.
   */
  public reportPageSubject(value: string | null, owner?: symbol): void {
    this.#pageSubjectOwner = owner ?? null;
    this.pageSubject.value = value;
  }

  /**
   * Clears the title subject if the caller still owns it; the view state's
   * own lifecycle passes no token and always applies.
   */
  public releasePageSubject(owner?: symbol): void {
    if (
      owner !== undefined &&
      this.#pageSubjectOwner !== null &&
      this.#pageSubjectOwner !== owner
    ) {
      return;
    }
    this.#pageSubjectOwner = null;
    this.pageSubject.value = null;
  }

  /**
   * Counts detail requests, so a settlement can tell whether the page still
   * wants what it asked for. A purge, a superseded request, and a closed route
   * are three different ways for that to stop being true, and only this one
   * covers the route.
   */
  #detailRequestVersion = 0;

  /**
   * The token of the page instance whose open call the detail state currently
   * answers, or null when nothing is open. Route navigation mounts the next
   * detail page before the previous one is torn down (the page is rendered
   * under Suspense), so the outgoing page's unmount cleanup runs after its
   * replacement has already opened its own detail; an unowned close there
   * would advance {@link #detailRequestVersion} and discard the replacement's
   * in-flight response. Each page passes its own token to its open and close
   * calls, and {@link closeFileDetail} skips a close whose caller no longer
   * owns the state; the view-state's own lifecycle closes — refresh, purge —
   * pass no token and always apply.
   */
  #detailOwner: symbol | null = null;

  /**
   * Disposers of component-owned holders of the open detail's content — the
   * Monaco model above all. {@link closeFileDetail} runs them synchronously,
   * because the contract orders dispose before replace (data-model.md
   * § BrowserState): a sequence's greater generation is adopted only after
   * the previous generation's editor objects are gone, and waiting for the
   * reactive unmount would leave them alive for one render flush after the
   * replacement. The purge reaches them through the same path — its disposer
   * closes the open detail.
   */
  readonly #openContentOwners = new Set<() => void>();

  /**
   * Increments on every rescan the user issues. A refresh captures it when it
   * starts and only clears command state it still matches, so a refresh that
   * began before a rescan cannot erase that rescan's outcome.
   */
  #commandVersion = 0;

  /**
   * The one in-flight session refresh, or null. Concurrent callers — the boot
   * retry pressed while the first request is still out, or a rescan adopting
   * its result — join it instead of issuing another: a second request would
   * supersede the first's token and discard a good response, and if only the
   * second failed, the boot would strand on an error the first had already
   * answered.
   */
  #refreshInFlight: Promise<void> | null = null;

  /** Wires the client and registers this state's owners with the purge. */
  public constructor(options: SessionViewStateOptions) {
    this.#clientData = new ClientDataPurge();
    this.#client = new SessionApiClient({
      channel: options.channel,
      clientData: this.#clientData,
    });

    // Requests are superseded before the state they would populate is cleared,
    // so a settlement that lands mid-purge cannot repopulate anything.
    // The inventory's return point is client data too: its href and viewport
    // offset describe the purged session's own Source, so a fresh session that
    // renders the same path must not inherit the old session's position and
    // focus (`router.options.ts`).
    this.#clientData.register(clearInventoryReturnPoint);
    this.#clientData.register(() => {
      this.#client.abortOutstandingRequests();
      // Session identity, Global epoch, and sequence generations belong to the
      // purged client model too. Reset them after aborting old requests so the
      // first post-purge response establishes one coherent fresh baseline
      // instead of being compared across different host sessions.
      this.#client.resetBaseline();
    });
    this.#clientData.register(() => {
      // Everything this module holds from the purged session: the snapshot and
      // its inventory/Source/file/diagnostic graph, the open detail's authored
      // source, and any retained error. Later phases register their own owners
      // (comparison, editor models, filters) with this same purge rather than
      // extending this callback.
      this.snapshot.value = null;
      this.#sessionError.value = null;
      this.closeFileDetail();
      // The rescan command belongs to the purged session too: its request ID
      // is meaningless against a different host session, and leaving it set
      // would let a post-purge status be mistaken for that command's result.
      this.rescanState.value = 'idle';
      this.activeScanRequestId.value = null;
      this.rescanRejection.value = null;
      // 'ended' is set by its own reporter and must survive the purge it runs:
      // a dead channel is not something a refetch recovers from.
      if (this.view.value !== 'ended') {
        this.view.value = 'booting';
      }
    });
    // Constructed after the two registrations above, so its own purge
    // disposer runs after requests are aborted — a settlement can then never
    // repopulate the comparison it clears. The two callbacks reach into this
    // state's private members lexically; the fatal reporter exists because a
    // comparison request's lost channel or uninterpretable protocol is a
    // session fact this shell owns, not the comparison's.
    this.skillComparison = new SkillComparisonState({
      client: this.#client,
      clientData: this.#clientData,
      refreshFreshly: () => this.#refreshFreshly(),
      reportFatalFailure: (error) => {
        this.#sessionError.value = error.message;
        this.view.value = 'ended';
      },
    });
    // The instruction kind's own comparison state, wired exactly like the
    // skill one and for the same reasons — including its place after the two
    // registrations above, so its purge disposer runs after requests are
    // aborted.
    this.instructionComparison = new InstructionComparisonState({
      client: this.#client,
      clientData: this.#clientData,
      refreshFreshly: () => this.#refreshFreshly(),
      reportFatalFailure: (error) => {
        this.#sessionError.value = error.message;
        this.view.value = 'ended';
      },
    });
    // The MCP kind's own comparison state, wired exactly like the two above
    // and for the same reasons.
    this.mcpComparison = new McpComparisonState({
      client: this.#client,
      clientData: this.#clientData,
      refreshFreshly: () => this.#refreshFreshly(),
      reportFatalFailure: (error) => {
        this.#sessionError.value = error.message;
        this.view.value = 'ended';
      },
    });
  }

  /**
   * Refetches and adopts the snapshot on demand, or leaves the current view
   * intact. This is the only way status advances: the product defines no
   * timer, filesystem watcher, or server-initiated push
   * (contracts/http-api.md § get-session), so nothing on this page updates by
   * itself and there is no automatic update to pause.
   */
  public refresh(): Promise<void> {
    this.#refreshInFlight ??= this.#refreshOnce().finally(() => {
      this.#refreshInFlight = null;
    });
    return this.#refreshInFlight;
  }

  /**
   * Waits out any in-flight fetch, then issues one that starts now. The
   * rescan recovery needs a request that began after its failure — an
   * in-flight fetch may predate the commit the recovery must observe — so
   * joining {@link refresh}'s coalesced request is not enough.
   */
  async #refreshFreshly(): Promise<void> {
    await this.#refreshInFlight;
    await this.refresh();
  }

  /** One fetch-and-adopt pass; every caller goes through {@link refresh}. */
  async #refreshOnce(): Promise<void> {
    // The client guards its own settlement against a purge, but that guard and
    // this assignment are in different microtasks: a purge running in the gap
    // clears the view, and the assignment below would then repopulate it with
    // data captured before it. Re-reading the epoch here puts the check and the
    // commit in one synchronous step (FR-027, FR-042).
    const capturedEpoch = this.#clientData.epoch();
    const capturedCommandVersion = this.#commandVersion;
    const outcome = await this.#client.fetchSession();
    // Every branch below writes state the purge owns, so the check belongs
    // ahead of all of them. A fatal failure is the one exception: it purges on
    // its way here, so its own purge must not silence its report.
    const purged = this.#clientData.epoch() !== capturedEpoch;
    switch (outcome.kind) {
      case 'adopted':
        if (purged) {
          return;
        }
        // A commit replaced the generation the open detail was read from.
        // Dropping it here is the generation half of the FR-027 cleanup: the
        // route notices and re-requests the same path under the new
        // generation, which is also how a removed file becomes the
        // `stale-resource` state instead of stale content on screen. The
        // open comparison goes with it: FR-030 invalidates the previous
        // generation's comparison view and editor-model state together.
        if (outcome.advancedSequences.length > 0) {
          this.closeFileDetail();
          this.skillComparison.close();
          this.instructionComparison.close();
          this.mcpComparison.close();
        }
        this.snapshot.value = outcome.snapshot;
        // A refresh success answers session-level failures only: a retained
        // detail error still describes the open detail's own failed request,
        // which this success says nothing about.
        this.#sessionError.value = null;
        this.view.value = 'inspection';
        // A rejection describes a command that is now history. The snapshot
        // just adopted is the state the user asked about, so a stale
        // `scan-in-progress` must not outlive it and sit beside a Ready source.
        // `accepted` is different: it names a scan still running. A refresh
        // that started before a later rescan clears nothing: the rejection it
        // would erase belongs to a command it never saw.
        if (
          this.rescanState.value === 'rejected' &&
          this.#commandVersion === capturedCommandVersion
        ) {
          this.rescanState.value = 'idle';
          this.rescanRejection.value = null;
        }
        return;
      case 'failed':
        // A non-fatal failure describes a request against the purged session,
        // so its error must not be written over the fresh one. A fatal failure
        // is what caused the purge and still has to be reported.
        if (purged && !outcome.fatal) {
          return;
        }
        this.#sessionError.value = outcome.error.message;
        // Only a lost channel or an unsupported protocol ends the session. A
        // handler or delivery failure is this request's error alone, so the
        // committed snapshot the user is reading stays on screen and another
        // refresh can still succeed (contracts/http-api.md § Concurrency and
        // lifecycle).
        if (outcome.fatal) {
          this.view.value = 'ended';
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
  public async requestRescan(): Promise<void> {
    // One command at a time. A second dispatch while one is in flight would
    // supersede the first's token and lose the request ID it was admitted
    // with — work the host is already doing, which nothing would then name.
    if (this.rescanState.value === 'requesting') {
      return;
    }
    this.#commandVersion += 1;
    const capturedCommandVersion = this.#commandVersion;
    this.rescanState.value = 'requesting';
    this.rescanRejection.value = null;
    // The previous command's ID is deliberately kept until the new command is
    // admitted. Until then the scan that ID names is still the one running —
    // dispatching again while one is active is exactly the `scan-in-progress`
    // rejection — and clearing it here would sever the running scan's
    // correlated progress the moment the user pressed the button a second
    // time. `accepted` below overwrites it; a rejection or failure leaves the
    // running scan's correlation intact.
    // Same boundary as `refresh`: a purge between the client's guard and this
    // commit must not be overwritten by a command state captured before it.
    const capturedEpoch = this.#clientData.epoch();
    // A rejection describes the session as of dispatch. The generation is
    // captured so a rejection that settles after a newer commit was adopted
    // can be recognized as history; see the 'rejected' branch.
    const capturedGeneration = this.snapshot.value?.repositoryGeneration ?? null;
    const outcome = await this.#client.rescanRepository();
    // As in `refresh`: every branch writes state the purge owns.
    const purged = this.#clientData.epoch() !== capturedEpoch;
    switch (outcome.kind) {
      case 'accepted':
        if (purged) {
          return;
        }
        this.rescanState.value = 'accepted';
        this.activeScanRequestId.value = outcome.scanRequestId;
        // The admission's own `SourceDto` is the Source as of acceptance, so
        // the row shows `scanning` even if the refresh below is slow or fails.
        // Waiting for the refresh alone would leave a Ready row beside an
        // accepted scan.
        if (this.snapshot.value !== null) {
          this.snapshot.value = {
            ...this.snapshot.value,
            sources: this.snapshot.value.sources.map((source) =>
              source.sourceId === outcome.source.sourceId ? outcome.source : source,
            ),
          };
        }
        // The committed generation arrives on this refresh — one that starts
        // after the acceptance. An in-flight fetch may predate it: a "Refresh
        // status" pressed just before acceptance returns a snapshot with no
        // accepted scan, and adopting it would overwrite the scanning Source
        // patched above with a Ready row beside a live `activeScanRequestId`.
        await this.#refreshFreshly();
        return;
      case 'rejected':
        // The rejection belongs to the purged session's command; writing it
        // back would put a stale `scan-in-progress` on a freshly booting view.
        if (purged) {
          return;
        }
        // A `scan-in-progress` rejection names a scan that was still running
        // at dispatch. A refresh racing this settlement can adopt that scan's
        // committed generation first; the rejection then describes a state
        // the page no longer shows, and surfacing it would put "already
        // running" beside a Ready source until the next refresh.
        if (
          capturedGeneration !== null &&
          this.snapshot.value !== null &&
          this.snapshot.value.repositoryGeneration > capturedGeneration
        ) {
          this.rescanState.value = 'idle';
          return;
        }
        this.rescanState.value = 'rejected';
        this.rescanRejection.value = outcome.code;
        return;
      case 'failed':
        if (purged && !outcome.fatal) {
          return;
        }
        this.rescanState.value = 'idle';
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
          return;
        }
        // The failure is published immediately — a recovery fetch takes time
        // and a known error must not wait for it (the fetch's own success
        // clears session errors, so it is restated below).
        this.#sessionError.value = outcome.error.message;
        // A delivery failure can hide a command the host accepted: the scan
        // may be running or already committed, and a transport failure after
        // an atomic commit leaves it committed — the client refetches through
        // the session API (contracts/http-api.md § Concurrency and
        // lifecycle). The fetch must start after the failure: an in-flight
        // one may predate the commit it exists to observe.
        await this.#refreshFreshly();
        // Restated only while this command still owns the slot: a purge
        // started a different session, and a newer command — the version
        // check — owns the state now and must not inherit this error.
        if (
          this.#clientData.epoch() !== capturedEpoch ||
          this.#commandVersion !== capturedCommandVersion
        ) {
          return;
        }
        this.#sessionError.value = outcome.error.message;
        return;
      case 'purged':
        // The disposer already cleared the command state along with the view.
        return;
      case 'discarded':
        // Superseded, and the command that superseded it owns the state now —
        // including across a purge, where the version advanced too. Writing
        // `idle` unconditionally would return the newer command to a state the
        // user has already left.
        if (this.#commandVersion === capturedCommandVersion) {
          this.rescanState.value = 'idle';
        }
        return;
    }
  }

  /**
   * Asks the host to open one committed file in the chosen application
   * (contracts/http-api.md § open-file), and hands the outcome back to the
   * control that asked, which is where the reader is looking.
   *
   * The outcome is returned rather than written to shared state because it
   * belongs to one control on one page: several detail surfaces render an
   * open control, and a shared error ref would put one file's failure beside
   * another file's button. A lost channel is the exception, and is handled
   * here for every caller: it ends the session exactly as a failed refresh or
   * rescan does.
   */
  public async openFile(
    sourceRelativePath: string,
    target: FileOpenTarget,
  ): Promise<FileOpenOutcome> {
    const outcome = await this.#client.openFile(sourceRelativePath, target);
    if (outcome.kind === 'failed' && outcome.fatal) {
      this.#sessionError.value = outcome.error.message;
      this.view.value = 'ended';
    }
    return outcome;
  }

  /**
   * Drops the open detail and the authored source it holds, and invalidates
   * any request still in flight for it.
   *
   * Advancing the version is the load-bearing half. A detail request that
   * settles after the route left would otherwise assign the source it fetched
   * to state nothing is showing, so leaving a file would put its content back
   * in memory a moment after taking it out.
   */
  public closeFileDetail(owner?: symbol): void {
    if (owner !== undefined && this.#detailOwner !== null && this.#detailOwner !== owner) {
      // The caller is an outgoing page whose replacement already opened its
      // own detail (see {@link #detailOwner}): its cleanup is complete the
      // moment it no longer owns the state, and applying it would discard the
      // replacement's in-flight request.
      return;
    }
    this.#detailOwner = null;
    this.#detailRequestVersion += 1;
    // The reactive state goes first and the component-owned content second.
    // Both happen in this one synchronous block, so what the contract orders
    // still holds: the editor objects are gone before the caller replaces the
    // sequence's inventory entries, not one render flush later
    // (data-model.md § BrowserState).
    //
    // Within the block the order matters for focus. The detail page guards
    // focus with synchronous watchers on this state, and they can only move
    // focus off an element that is still there. Disposing first detaches the
    // editor the reader was in, so by the time the watchers run the focused
    // element is already the document body and there is nothing left to
    // rescue (WCAG 2.4.3).
    this.entryDetail.value = null;
    this.openCompanion.value = null;
    this.carrierDetail.value = null;
    this.policyDetail.value = null;
    this.fileDetailState.value = 'idle';
    for (const disposer of this.#openContentOwners) {
      disposer();
    }
    // A detail failure belongs to the route that requested it. A session error
    // survives: it describes the session, not the file the reader just left.
    this.#detailError.value = null;
  }

  /**
   * Requests one customization's own file — a skill's entry point, or a file
   * that is itself the customization, an instruction file or a rule file —
   * and the file being read from it, and adopts
   * both, or records why the detail could not be shown. A kind with no
   * companion files opens its one file as both arguments.
   *
   * The entry point is fetched even when a skill's companion is what the
   * reader selected, because the census alone admits nothing: what this
   * page's skill is comes from its own entry point — a census-listed file may
   * carry its own recognitions, a nested `SKILL.md`, but those belong to its
   * own route — and a page that showed only the companion's detail would say
   * nothing was recognized here.
   *
   * Every write to the detail state happens in this function, behind one
   * ownership check, so the three ways an invocation stops owning the page —
   * a purge cleared it, `closeFileDetail` left it, a newer `openFileDetail` superseded
   * it — cannot each grow their own handling.
   */
  public async openFileDetail(entryPath: string, openPath: string, owner?: symbol): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    const requested = this.#detailRequestVersion;
    // The new selection owns the page now: a previous file's retained detail
    // error would otherwise sit beside this selection's loading and stale
    // states, describing a file the page no longer shows.
    this.#detailError.value = null;
    // Same boundary as `refresh`: the client guards its own settlement against
    // a purge, but that guard and the writes below are different microtasks,
    // so the epoch is re-read at each write to make the check and the commit
    // one synchronous step (FR-027, FR-042). `closeFileDetail` advances the version
    // without aborting the request — leaving the route is not an error and
    // cancels nothing already sent — which is why the version is the other
    // half of this check: without it, a detail settling after the reader
    // returned to the inventory would put another route's error on it.
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#detailRequestVersion && this.#clientData.epoch() === capturedEpoch;
    // The entry point already on screen when the customization has not
    // changed. Keeping it is what makes selecting another file of one skill a
    // change to the source alone: clearing it would take the page through its
    // loading state, unmounting the tree the reader is using — and the link
    // they just activated with it, dropping keyboard focus to the document.
    const held =
      this.entryDetail.value?.file.sourceRelativePath === entryPath ? this.entryDetail.value : null;
    if (held !== null && this.fileDetailState.value === 'companion-failed') {
      // A retry — or another file selected — from the failed pane: the entry
      // stays, and the pane returns to its in-flight state so the failed
      // branch and its retry button unmount. Left standing, the button could
      // dispatch a second request whose supersession discards the first's
      // success and then fails alone.
      this.fileDetailState.value = 'ready';
    }
    if (held === null) {
      this.fileDetailState.value = 'loading';
      // The previous detail's authored source is dropped before the next one
      // is asked for, so a slow request never leaves one file's content on
      // screen under another customization's heading. The carrier slot too:
      // an MCP page's detail — commands, headers, environment values — would
      // otherwise survive a navigation to a skill or instruction page, whose
      // open supersedes the outgoing page's ownership-guarded close, and the
      // open-detail state would hold two slots at once.
      this.entryDetail.value = null;
      this.openCompanion.value = null;
      this.carrierDetail.value = null;
      this.policyDetail.value = null;
    }
    /**
     * Fetches one detail and settles every non-detail outcome, so the entry
     * point and the companion cannot drift into different handling. A `stale`
     * or failed settlement clears whatever is on screen: on the held path that
     * is the previous file, which the tree and the URL no longer name, and
     * showing it under the newer selection would claim a file the page does
     * not have.
     */
    const fetchOwned = async (sourceRelativePath: string): Promise<FileDetailDto | null> => {
      const outcome = await this.#client.fetchFileDetail(sourceRelativePath);
      switch (outcome.kind) {
        case 'adopted':
          return owns() ? outcome.detail : null;
        case 'rejected':
          // The one rejection these requests can receive: no current
          // generation holds a file at the path. It is a declared functional
          // outcome, shown as its own state rather than as an error.
          if (owns()) {
            this.entryDetail.value = null;
            this.openCompanion.value = null;
            this.fileDetailState.value = 'stale';
            // The rejection proves this client's snapshot is older than the
            // host's committed generation — the path came from a snapshot
            // whose file the commit since removed. Refetching now makes
            // "return to the inventory and open it again" show what the
            // current generation actually holds.
            void this.refresh();
          }
          return null;
        case 'failed':
          // A fatal failure is the transport reporting the host is gone, which
          // is true of the session rather than of this request, so it is the
          // one outcome a no-longer-owning request still reports.
          if (outcome.fatal) {
            this.#sessionError.value = outcome.error.message;
            this.view.value = 'ended';
          } else if (owns()) {
            // A companion's own failure fails only the pane: the held entry
            // still describes the skill — its recognition and file tree are
            // not what failed — where an entry failure leaves nothing to show.
            if (sourceRelativePath !== entryPath && this.entryDetail.value !== null) {
              this.openCompanion.value = null;
              this.fileDetailState.value = 'companion-failed';
            } else {
              this.entryDetail.value = null;
              this.openCompanion.value = null;
              this.fileDetailState.value = 'idle';
            }
            this.#detailError.value = outcome.error.message;
          }
          return null;
        case 'newer-generation':
          // The host has committed past this page's adopted snapshot, and the
          // path may well survive there — the response was withheld so one
          // generation's labels never sit over another's content. Adopting
          // the newer snapshot is the fix, and the route re-requests under
          // it: its open effect watches the committed generations, so the
          // refresh both closes this selection and reopens the same path
          // against the new snapshot. Fresh rather than joined, for the same
          // reason as the rescan recovery: an in-flight fetch may predate the
          // commit this withholding proves, and adopting its older snapshot
          // would re-request nothing.
          if (owns()) {
            await this.#refreshFreshly();
            // Adopting the newer snapshot closes this selection and advances
            // the version, so still owning here means no adoption happened:
            // the refresh failed non-fatally — a fatal failure purges, which
            // changes the epoch. Without this transition the page would sit
            // on a loading or held state with no request in flight and no
            // recovery control; the entry-failure state is the surface with
            // the retry. The refresh's own error stays the shell's to report
            // (`#sessionError`), so no message is copied here — the route
            // states its own condition and neither surface repeats the other.
            if (owns()) {
              this.entryDetail.value = null;
              this.openCompanion.value = null;
              this.fileDetailState.value = 'idle';
            }
          }
          return null;
        case 'purged':
          // The disposer already cleared the detail along with the view.
          return null;
        case 'discarded':
          // A newer selection superseded this request and owns the state now.
          return null;
      }
    };
    const entry = held ?? (await fetchOwned(entryPath));
    if (entry === null || !owns()) {
      return;
    }
    // Published the moment it is owned, not with the companion: a companion's
    // own failure must fail only the pane, and that requires the entry to
    // already be the page's held state — a direct link to a companion starts
    // with none.
    this.entryDetail.value = entry;
    // One request when the entry point is what is open: it is already here, and
    // asking again would put one file's detail in two places. A companion the
    // page is already holding is reused for the same reason the entry is —
    // returning to it is a change of selection, not of content, and the
    // refetch it would replace could fail and take good state with it.
    const heldCompanion =
      this.openCompanion.value?.file.sourceRelativePath === openPath
        ? this.openCompanion.value
        : null;
    const companion =
      openPath === entryPath ? null : (heldCompanion ?? (await fetchOwned(openPath)));
    if ((openPath !== entryPath && companion === null) || !owns()) {
      return;
    }
    this.openCompanion.value = companion;
    this.fileDetailState.value = 'ready';
    // A detail success answers detail failures only; a session error — a failed
    // refresh, say — is still true of the session and stays.
    this.#detailError.value = null;
  }

  /**
   * Requests one MCP carrier's declarations
   * and adopts them, or records why they
   * could not be shown — the carrier counterpart of
   * {@link openFileDetail}, through the same request version, epoch capture,
   * and state machine, because the two functions serve the one open detail
   * (contracts/http-api.md § get-mcp-carrier-detail). There is no companion
   * half: the declarations arrive in the one response, and an owner's own
   * source is the skill route's business, not this request's.
   */
  public async openCarrierDetail(sourceRelativePath: string, owner?: symbol): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    const requested = this.#detailRequestVersion;
    this.#detailError.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#detailRequestVersion && this.#clientData.epoch() === capturedEpoch;
    // The carrier already on screen when the selection moved within it: a
    // step between two declarations of one carrier changes which record the
    // page heads itself with, not the response it renders from, so the held
    // detail answers without a second fetch.
    if (this.carrierDetail.value?.file.sourceRelativePath === sourceRelativePath) {
      this.fileDetailState.value = 'ready';
      return;
    }
    this.fileDetailState.value = 'loading';
    // The previous detail — either slot's — is dropped before the next one is
    // asked for, so a slow request never leaves one file's content on screen
    // under another customization's heading.
    this.entryDetail.value = null;
    this.openCompanion.value = null;
    this.carrierDetail.value = null;
    this.policyDetail.value = null;
    const outcome = await this.#client.fetchMcpCarrierDetail(sourceRelativePath);
    switch (outcome.kind) {
      case 'adopted':
        if (owns()) {
          this.carrierDetail.value = outcome.detail;
          this.fileDetailState.value = 'ready';
          this.#detailError.value = null;
        }
        return;
      case 'rejected':
        // No current generation holds an admitted carrier at the path — the
        // same declared outcome, shown as the same stale state, as a file
        // detail's (contracts/http-api.md § get-mcp-carrier-detail).
        if (owns()) {
          this.carrierDetail.value = null;
          this.fileDetailState.value = 'stale';
          void this.refresh();
        }
        return;
      case 'failed':
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
        } else if (owns()) {
          this.carrierDetail.value = null;
          this.fileDetailState.value = 'idle';
          this.#detailError.value = outcome.error.message;
        }
        return;
      case 'newer-generation':
        // Same recovery as the file detail's: adopt the newer snapshot, and
        // the route's own open effect re-requests the path under it.
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.carrierDetail.value = null;
            this.fileDetailState.value = 'idle';
          }
        }
        return;
      case 'purged':
        // The disposer already cleared the detail along with the view.
        return;
      case 'discarded':
        // A newer selection superseded this request and owns the state now.
        return;
    }
  }

  /**
   * Requests one declared permission policy and adopts it, or records why it
   * could not be shown — the policy counterpart of {@link openFileDetail},
   * through the same request version, epoch capture, and state machine,
   * because the detail functions serve the one open detail
   * (contracts/http-api.md § get-permission-policy-detail). There is no
   * companion half: a policy is one response.
   */
  public async openPolicyDetail(sourceRelativePath: string, owner?: symbol): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    const requested = this.#detailRequestVersion;
    this.#detailError.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#detailRequestVersion && this.#clientData.epoch() === capturedEpoch;
    if (this.policyDetail.value?.file.sourceRelativePath === sourceRelativePath) {
      // Already the open policy: a re-entry under the same generation asks
      // for what is on screen, so nothing is refetched.
      this.fileDetailState.value = 'ready';
      return;
    }
    this.fileDetailState.value = 'loading';
    // Every other slot is dropped before the next detail is asked for, so a
    // slow request never leaves one subject's content on screen under
    // another's heading.
    this.entryDetail.value = null;
    this.openCompanion.value = null;
    this.carrierDetail.value = null;
    this.policyDetail.value = null;
    const outcome = await this.#client.fetchPermissionPolicyDetail(sourceRelativePath);
    switch (outcome.kind) {
      case 'adopted':
        if (owns()) {
          this.policyDetail.value = outcome.detail;
          this.fileDetailState.value = 'ready';
          this.#detailError.value = null;
        }
        return;
      case 'rejected':
        // No current generation holds a permissions recognition at the path —
        // the same declared outcome, shown as the same stale state, as a file
        // detail's (contracts/http-api.md § get-permission-policy-detail).
        if (owns()) {
          this.policyDetail.value = null;
          this.fileDetailState.value = 'stale';
          void this.refresh();
        }
        return;
      case 'failed':
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
        } else if (owns()) {
          this.policyDetail.value = null;
          this.fileDetailState.value = 'idle';
          this.#detailError.value = outcome.error.message;
        }
        return;
      case 'newer-generation':
        // Same recovery as the file detail's: adopt the newer snapshot, and
        // the route's own open effect re-requests the path under it.
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.policyDetail.value = null;
            this.fileDetailState.value = 'idle';
          }
        }
        return;
      case 'purged':
        // The disposer already cleared the detail along with the view.
        return;
      case 'discarded':
        // A newer selection superseded this request and owns the state now.
        return;
    }
  }

  /** Adopts the initial snapshot; the same fetch-and-adopt as {@link refresh}. */
  public async start(): Promise<void> {
    await this.refresh();
  }

  /**
   * Adopts a channel loss reported by the transport (devframe's
   * `connection:status`). Purges and shows the ended view without waiting
   * for a request to fail, so a dead host is visible immediately rather
   * than at the next interaction.
   */
  public reportChannelLost(error: Error | null): void {
    // Purge first: the disposer clears the retained error along with
    // everything else, so the reported message is set afterwards or it
    // would be wiped by its own purge.
    this.#clientData.purge('channel-failure');
    this.view.value = 'ended';
    this.#sessionError.value = error === null ? null : error.message;
  }

  /** Abandons every outstanding request. */
  public dispose(): void {
    this.#client.abortOutstandingRequests();
  }

  /**
   * Registers one component-owned holder of the open detail's content,
   * returning its unregister function. Exists because a Monaco model is owned
   * by the component that mounted it while the disposal order is this
   * module's contract: the central purge (FR-027) and the adoption of a
   * greater generation must both dispose editor models synchronously, and
   * waiting for the reactive unmount would leave authored content in the
   * model for one render flush after everything else was already gone. Both
   * paths run through {@link closeFileDetail}.
   */
  public registerOpenContentOwner(disposer: () => void): () => void {
    this.#openContentOwners.add(disposer);
    return () => this.#openContentOwners.delete(disposer);
  }
}

/**
 * The provide/inject key the shell publishes its one session view state under.
 * The inventory route reads it rather than constructing its own: the session
 * has exactly one connection and one adopted snapshot per page, and a second
 * view state would race the first for the same request tokens.
 */
export const SESSION_VIEW_STATE: InjectionKey<SessionViewState> = Symbol('session-view-state');
