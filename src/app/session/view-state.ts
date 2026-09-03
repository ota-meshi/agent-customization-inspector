// The session's view state for the browser SPA (T049): the reactive values
// `App.vue` renders and the commands that drive them. It also builds the
// shared client-data purge and the guarded API client the state is derived
// from.
//
// The session state that matters to a viewer is on the host; what this module
// holds is the browser's view of it — which surface is showing, the snapshot
// currently adopted, and any retained error. There are exactly four
// surfaces, and which one is active is derived from adoption outcomes rather
// than set ad hoc:
//  - 'booting'     nothing adopted yet, or the last purge cleared everything
//  - 'inspection'  a snapshot passed every guard and is rendered
//  - 'fenced'      the disable barrier is up; only the control-only recovery
//                  projection renders (FR-042)
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
import { computed, shallowRef, type InjectionKey, type ShallowRef } from 'vue';
import {
  SessionApiClient,
  type ConsentPreviewOutcome,
  type FileOpenOutcome,
  type SessionRpcChannel,
  type ScanSequence,
  type RescanOutcome,
} from './api-client';
import { ClientDataPurge, type ClientDataDisposer } from './client-data';
import { clearInventoryReturnPoint } from '../router.options';
import { selectorFamilyOf, sourceIdOf } from '../components/detail-route';
import { InstructionComparisonState } from '../composables/instruction-comparison';
import { HookComparisonState } from '../composables/hook-comparison';
import { McpComparisonState } from '../composables/mcp-comparison';
import { PluginComparisonState } from '../composables/plugin-comparison';
import { PromptComparisonState } from '../composables/prompt-comparison';
import { CustomAgentComparisonState } from '../composables/custom-agent-comparison';
import { SkillComparisonState } from '../composables/skill-comparison';
import type {
  FileDetailDto,
  FileOpenTarget,
  GlobalConsentPreviewDto,
  GlobalEnableResultDto,
  GlobalFenceRecoverySnapshot,
  HookCarrierDetailDto,
  SourceKind,
  SourceSelector,
  McpCarrierDetailDto,
  PluginCarrierDetailDto,
  PluginCarrierDetailParams,
  PluginFileDetailDto,
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
  /**
   * The host is fenced by a non-complete disable barrier: everything was
   * purged and only the control-only recovery renders until a later fetch
   * returns the full snapshot (FR-042; contracts/http-api.md § disable-global).
   */
  | 'fenced'
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
 * Which slot a file detail request fills, and therefore which part of a page
 * its failure belongs to.
 *
 * `page` is the file a detail page is *about*: its failure leaves nothing to
 * show, so the page reports it. `pane` is a file selected inside a
 * customization the page already describes — a skill's companion, one of a
 * plugin's own files — which fails alone while the tree the reader retries
 * from stays. `manifest` is a plugin's own declaration of itself, shown beside
 * the offering: it is a third file with a third outcome, so its failure is
 * reported where it is shown and never fails the pane the reader's selection
 * is in.
 */
export type FileDetailSlot = 'page' | 'pane' | 'manifest';

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
   * design: every comparison-bearing kind owns a state of its own beside
   * this one, rather than one state widened to span them.
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

  /**
   * The hook kind's own comparison view: one declared lifecycle event's
   * declarations in two of its row's carriers (`hook-comparison.ts`). Its own
   * state beside the others because comparison is kind-specific with no shared
   * module, and this kind's model is two carriers compared by the declarations
   * each wrote, with no source half at all (FR-007).
   */
  public readonly hookComparison: HookComparisonState;

  /**
   * The plugin kind's own comparison view: one plugin name's declarations in
   * two of its row's carriers (`plugin-comparison.ts`). Its own state beside
   * the others because comparison is kind-specific with no shared module.
   */
  public readonly pluginComparison: PluginComparisonState;

  /**
   * The prompt-and-command comparison view state (FR-011), owned here for
   * the same reasons {@link skillComparison} is. Its own state rather than a
   * widening of the others, because comparison is kind-specific with no
   * shared module (spec.md § Clarifications Session 2026-08-14): this kind's
   * model is two committed files of one invocation-name row compared whole,
   * with no copy or corresponding-file coordinate.
   */
  public readonly promptComparison: PromptComparisonState;

  /**
   * The custom-agent comparison view state (FR-011), owned here for the same
   * reasons {@link skillComparison} is. Its own state rather than a widening
   * of the others, because comparison is kind-specific with no shared module
   * (spec.md § Clarifications Session 2026-08-14): this kind's model is two
   * committed files of one agent-name row compared whole, with no copy or
   * corresponding-file coordinate.
   */
  public readonly customAgentComparison: CustomAgentComparisonState;

  /** Which surface to render; see {@link SessionView}. */
  public readonly view = shallowRef<SessionView>('booting');

  /** The adopted snapshot; null in every non-'inspection' view. */
  public readonly snapshot = shallowRef<SessionSnapshot | null>(null);

  /**
   * How many of each Source's committed files kept a file-confined diagnostic,
   * keyed by Source ID and absent for a Source with none. It is what a
   * `partial` status reports (FR-028), and two surfaces state it — the rail's
   * status beside the way to a Source, and that Source's own state surface — so
   * it is derived once here rather than once per surface.
   *
   * Counted from the published files rather than from the generation's
   * diagnostics: a record is referenced by the file it belongs to, and one file
   * may hold several, so counting records would report a number no list shows.
   */
  public readonly diagnosticFileCounts = computed<ReadonlyMap<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const file of this.snapshot.value?.files ?? []) {
      if (file.diagnosticIds.length > 0) {
        counts.set(file.sourceId, (counts.get(file.sourceId) ?? 0) + 1);
      }
    }
    return counts;
  });

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
   * Where the one explicit Global rescan command stands — its own slot
   * beside the Repository's, because each drives its own control's rendering
   * and one command must never wear the other's state (T1015).
   */
  public readonly globalRescanState = shallowRef<RescanState>('idle');

  /**
   * The published Global Source the current or last Global rescan command was
   * for, so the one rejection and progress correlation attach to the member
   * row the reader pressed rather than to every row (FR-030).
   */
  public readonly globalRescanSourceId = shallowRef<string | null>(null);

  /**
   * The `scanRequestId` of each currently admitted Global rescan command,
   * keyed by the member Source it was accepted for. A map rather than one
   * pair, because the coordinator admits one command per Source and queues
   * across Sources FIFO (contracts/http-api.md § Concurrency and
   * lifecycle) — a second member's accepted rescan must not sever the first
   * member's still-running correlation (FR-030). Each member's progress is
   * shown only while it carries that member's exact recorded ID; the rule
   * {@link activeScanRequestId} states, held per Source.
   */
  public readonly activeGlobalScans = shallowRef<ReadonlyMap<string, string>>(new Map());

  /** The closed rejection code of a refused Global rescan command; null otherwise. */
  public readonly globalRescanRejection = shallowRef<RejectionCode | null>(null);

  /**
   * The control-only recovery projection the fenced view renders, adopted
   * from the host's fenced session response; null outside the 'fenced' view
   * (FR-042). It is what a fenced tab retries and joins from.
   */
  public readonly fenceRecovery = shallowRef<GlobalFenceRecoverySnapshot | null>(null);

  /**
   * Where this page's one disable command stands: 'submitting' from the
   * pre-request purge until the command settles, 'idle' otherwise. The guard
   * that keeps a second press from sending a duplicate join.
   */
  public readonly globalDisableState = shallowRef<'idle' | 'submitting'>('idle');

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
   * The plugin's own manifest, as the plugin's file function served it — the
   * slot the plugin panel reads, beside {@link pluginOpenFile}.
   *
   * Its own slot rather than {@link entryDetail}, because a plugin's file is
   * not a kind's parse: `get-plugin-file-detail` answers with the file and its
   * diagnostics, and a file a rule independently admitted keeps its own row
   * for its own kind (contracts/http-api.md § get-plugin-file-detail).
   */
  public readonly pluginManifestFile = shallowRef<PluginFileDetailDto | null>(null);

  /** The file of the open plugin the reader selected; see {@link pluginManifestFile}. */
  public readonly pluginOpenFile = shallowRef<PluginFileDetailDto | null>(null);

  /**
   * The open plugin carrier's detail, or null while none is (contracts/http-api.md
   * § get-plugin-carrier-detail). Its own slot beside the MCP carrier's,
   * because the two responses are different shapes: a plugin manifest's
   * detail carries the complete authored source its file is, and the page
   * renders from whichever slot its own route filled.
   */
  public readonly pluginDetail = shallowRef<PluginCarrierDetailDto | null>(null);

  /**
   * What the plugin manifest's own request failed with, or null while none
   * has (contracts/http-api.md § get-file-detail).
   *
   * Its own slot beside {@link detailErrorMessage} because the manifest and
   * the file the reader selected are requests about two different files: a
   * manifest this scan cannot read is a fact about the plugin panel, and
   * failing the pane the selection is in with it would report the reader's own
   * file as unreadable and never ask for it.
   */
  public readonly entryDetailError = shallowRef<string | null>(null);

  /**
   * Which row {@link pluginDetail} answers for, or null while it holds none.
   *
   * The response carries the carrier's own file and the declarations it was
   * asked for, but not the name it was asked *about*, so the request is what
   * says whether the held detail is still the open row's — which is what lets
   * selecting another of the plugin's files keep the declarations instead of
   * refetching them. Private: it is a request key, and a surface that wanted
   * the row would take it from the route it came from.
   */
  #openPluginRow: PluginCarrierDetailParams | null = null;

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
   * The open hook carrier detail, or null while none is. Its own slot beside
   * {@link carrierDetail} because it is another function's result about
   * another subject — a hook row names a declared lifecycle event rather than
   * a server (contracts/http-api.md § get-hook-carrier-detail) — while the
   * request version, state machine, and purge path below are shared, so at
   * most one slot is non-null.
   */
  public readonly hookDetail = shallowRef<HookCarrierDetailDto | null>(null);

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
   * The Global consent preview the consent route renders, or null when none
   * has been read yet. Held here rather than in the page because the client it
   * comes from is this state's, and because a purge must clear it: a preview
   * captured in one host session names nothing in another.
   */
  public readonly consentPreview = shallowRef<GlobalConsentPreviewDto | null>(null);

  /**
   * What the consent route is showing:
   *  - 'idle'       nothing requested yet
   *  - 'loading'    a read or capture is in flight
   *  - 'ready'      {@link consentPreview} holds a preview to review
   *  - 'missing'    the host holds none, so the reader is offered a capture
   *  - 'failed'     the call failed; {@link consentPreviewError} says how
   */
  public readonly consentPreviewState = shallowRef<
    'idle' | 'loading' | 'ready' | 'missing' | 'failed'
  >('idle');

  /** The failed preview call's own error message, or null. */
  public readonly consentPreviewError = shallowRef<string | null>(null);

  /**
   * The closed rejection code a refused preview call returned, or null. Kept
   * beside {@link consentPreviewError} rather than turned into a sentence here:
   * the words a code stands for are written where they are rendered, as the
   * scan status's own refusal copy is (AGENTS.md § User-visible copy policy).
   */
  public readonly consentPreviewRejection = shallowRef<RejectionCode | null>(null);

  /**
   * What the last confirmation did, or null before one. It is the acceptance
   * result rather than a derived summary: which tools were admitted and which
   * refused is what the page states, and the controls in the next snapshot are
   * where each refusal's reason comes from.
   */
  public readonly globalEnableResult = shallowRef<GlobalEnableResultDto | null>(null);

  /** Whether a confirmation is in flight, so the control cannot be pressed twice. */
  public readonly globalEnableState = shallowRef<'idle' | 'submitting'>('idle');

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
   * The Source family the open detail's request reads from, held from
   * dispatch: the adopted detail refs cannot answer it before the first
   * response lands, and the generation adoption must close the open detail
   * exactly when the sequence it reads from advanced — never for the other
   * sequence's commit (FR-030). Null while no detail is open.
   */
  #openDetailSequence: SourceKind | null = null;

  /**
   * The identity of the customization whose detail is open, as the page last
   * asked for it — the Source and the entry point's Source-relative Path
   * (FR-030), or null while nothing is open.
   *
   * Held so {@link openFileDetail} can tell a change of selection inside one
   * customization from a move to another: the first keeps the entry point on
   * screen, and the second must drop it. The requested address rather than the
   * response's, so the comparison is between two things the page asked for.
   */
  #openDetailAddress: { readonly source: SourceSelector; readonly entryPath: string } | null = null;

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
   * Per-slot rescan dispatch counters — one per sequence, because the two
   * commands are two independent slots (FR-030). A refresh captures both and
   * clears a slot's command state only while that slot still matches, so a
   * refresh that began before a rescan cannot erase that rescan's outcome;
   * a settled command's own restatement compares against its slot alone, so
   * the other sequence's dispatch never suppresses it.
   */
  #repositoryCommandVersion = { value: 0 };

  /** The Global slot's half of the pair above. */
  #globalCommandVersion = { value: 0 };

  /**
   * How many consent confirmations this page has sent. A refresh captures it
   * and releases the confirmation hold only if it has not moved: a fetch that
   * began before the confirm carries an answer from before it, and releasing
   * the hold on that answer would re-enable Confirm while the real one is
   * still in flight.
   */
  #globalEnableVersion = { value: 0 };

  /**
   * Whether the purge-recovery fetch is already scheduled, so the recovery
   * fetch's own fenced answer — which purges again by design — does not
   * schedule an endless chain of identical fetches (see the constructor's
   * recovery disposer, which serves the fence and greater-epoch reasons).
   */
  #fenceRecoveryScheduled = false;

  /**
   * Set by the Global purge reasons and consumed by the next adopted
   * snapshot: the recovery contract restores no prior detail and lands on
   * the fresh default inventory (data-model.md § RecoveryViewState), so the
   * adoption that follows one of these purges asks the shell to leave
   * whatever route the purged world was on.
   */
  #resumeToInventoryOnAdopt = false;

  /**
   * Bumped when a post-purge adoption wants the shell on the inventory; the
   * shell watches it and replaces the route (App.vue). A counter rather
   * than a flag, so two recoveries in one session both navigate.
   */
  public readonly inventoryResumeRequests = shallowRef(0);

  /**
   * Bumped by every client-data purge, whatever its reason. It is a different
   * fact from {@link inventoryResumeRequests}, which asks the shell to
   * navigate and fires for two of the reasons only: a surface that needs to
   * know its own state predates a purge — the inventory's filter generation —
   * reads this, because inferring "a purge happened" from "a navigation was
   * requested" misses every purge that does not navigate.
   */
  public readonly clientDataPurges = shallowRef(0);

  /**
   * The token stamped into each inventory history entry, so an entry left
   * before a purge can be told from one made after it (FR-042; the recovery
   * contract starts the inventory at the default filters, data-model.md
   * § RecoveryViewState). It lives here rather than on the inventory page
   * because a purge confirmed from another route must rotate it too, and
   * because a page instance is remounted by ordinary navigation while this
   * state is the session's.
   *
   * A reload starts a fresh token, and nothing carries the old one across:
   * FR-044 closes what this application may store on the reader's machine to
   * the open-target and colour-scheme preferences. So an inherited stamp is
   * never compared with a token this load knows — it is judged by whether
   * this load has purged at all, which {@link filterGenerationPredatesPurge}
   * does.
   */
  #filterGeneration = crypto.randomUUID();

  /** The token to stamp into an inventory history entry written now. */
  public filterGeneration(): string {
    return this.#filterGeneration;
  }

  /**
   * Registers one more owner's clearing with this session's client-data purge,
   * returning its unregister function.
   *
   * The shell's, for state it creates itself and this class therefore cannot
   * import: the inventory's narrowing is provided rather than module-level, so
   * the component that constructs it is the one that can hand its clearing over
   * (`composables/inventory-filter-state.ts`). Registration order is the purge's
   * (`session/client-data.ts` § register), and the shell registers after
   * constructing this state, so this class's own owners still run first.
   */
  public registerClientDataOwner(disposer: ClientDataDisposer): () => void {
    return this.#clientData.register(disposer);
  }

  /**
   * Whether a history entry's stamp was written before the last purge. Any
   * stamp other than the current one was, and the two cases reach that answer
   * for different reasons: a stamp this load issued has been superseded, which
   * only a purge does; and a stamp this load never issued was written by an
   * earlier document, so it predates everything that happened in this one.
   * Before the first purge there is nothing to predate, which is why the
   * purge count is the question rather than the token — an entry inherited
   * across a reload then keeps its narrowing (T1122 — Back, a reload, and a
   * pasted link render the same narrowed list).
   */
  public filterGenerationPredatesPurge(stamp: unknown): boolean {
    return (
      typeof stamp === 'string' &&
      stamp !== this.#filterGeneration &&
      this.clientDataPurges.value > 0
    );
  }

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
      // The document title's subject with them: it is a name or a path the
      // purged session published, and the tab keeps showing it until the page
      // unmounts, which a purge does not wait for (data-model.md § Client
      // data). No token, so the release applies whichever page reported it.
      this.releasePageSubject();
      // The rescan commands belong to the purged session too: their request
      // IDs are meaningless against a different host session, and leaving one
      // set would let a post-purge status be mistaken for that command's
      // result. The Global command's member selection goes with it.
      this.rescanState.value = 'idle';
      this.activeScanRequestId.value = null;
      this.rescanRejection.value = null;
      this.globalRescanState.value = 'idle';
      this.globalRescanSourceId.value = null;
      this.activeGlobalScans.value = new Map();
      this.globalRescanRejection.value = null;
      // The fenced recovery belongs to the purged view too; the disable
      // command's own submitting state survives, because the purge it runs
      // before sending must not cancel the very command it precedes.
      this.fenceRecovery.value = null;
      // The consent preview is the purged session's too: its `previewId` is a
      // lookup key into that host session's memory, so a fresh session must be
      // asked again rather than shown a preview it never captured.
      this.consentPreview.value = null;
      this.consentPreviewState.value = 'idle';
      this.consentPreviewError.value = null;
      this.consentPreviewRejection.value = null;
      // The confirmation belonged to the purged session too: its accepted
      // tools name Sources a different host session never created.
      this.globalEnableResult.value = null;
      this.globalEnableState.value = 'idle';
      // 'ended' is set by its own reporter and must survive the purge it runs:
      // a dead channel is not something a refetch recovers from.
      if (this.view.value !== 'ended') {
        this.view.value = 'booting';
      }
    });
    this.#clientData.register(() => {
      this.clientDataPurges.value += 1;
      // Every entry stamped before this moment is pre-purge, so the token is
      // replaced rather than counted: the replacement is what makes an entry
      // written after this purge distinguishable from one written before it.
      this.#filterGeneration = crypto.randomUUID();
    });
    this.#clientData.register((reason) => {
      // Recovery from a Global-content purge is automatic (FR-042): observing
      // the fence's fixed conflict or a greater epoch on any response —
      // an ordinary command's as much as the session function's — purges,
      // and one direct session fetch then adopts what the host now serves:
      // the fenced recovery projection while the barrier runs, or the fresh
      // authoritative snapshot once the era moved on. Direct, not through
      // {@link refresh}, whose coalescing could join a fetch that predates
      // the purge. The flag collapses the cascade: the recovery fetch's own
      // fenced answer purges again, and scheduling from that purge would
      // fetch the same projection forever; the epoch case converges in one
      // pass because the reset baseline adopts the fresh epoch as its first
      // observation. Every other purge reason keeps its own follow-up — the
      // disable request purges before its own command, and a lost channel
      // or identity ends the session rather than refetching it.
      if (reason === 'global-disable-fence' || reason === 'global-content-epoch-advanced') {
        this.#resumeToInventoryOnAdopt = true;
      }
      if (
        (reason !== 'global-disable-fence' && reason !== 'global-content-epoch-advanced') ||
        this.#fenceRecoveryScheduled
      ) {
        return;
      }
      this.#fenceRecoveryScheduled = true;
      // After the purge finishes, not inside it: the epoch increments last
      // (client-data.ts § purge), so a fetch started here would capture the
      // old epoch and discard its own answer as purged-under.
      queueMicrotask(() => {
        void this.#refreshOnce().finally(() => {
          this.#fenceRecoveryScheduled = false;
        });
      });
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
    // The hook kind's own comparison state, wired exactly like the ones above
    // and for the same reasons.
    this.hookComparison = new HookComparisonState({
      client: this.#client,
      clientData: this.#clientData,
      refreshFreshly: () => this.#refreshFreshly(),
      reportFatalFailure: (error) => {
        this.#sessionError.value = error.message;
        this.view.value = 'ended';
      },
    });
    // The plugin kind's own comparison state, wired exactly like the ones
    // above and for the same reasons.
    this.pluginComparison = new PluginComparisonState({
      client: this.#client,
      clientData: this.#clientData,
      refreshFreshly: () => this.#refreshFreshly(),
      reportFatalFailure: (error) => {
        this.#sessionError.value = error.message;
        this.view.value = 'ended';
      },
    });
    // The `prompt/command` kind's own comparison state, wired exactly like
    // the three above and for the same reasons.
    this.promptComparison = new PromptComparisonState({
      client: this.#client,
      clientData: this.#clientData,
      refreshFreshly: () => this.#refreshFreshly(),
      reportFatalFailure: (error) => {
        this.#sessionError.value = error.message;
        this.view.value = 'ended';
      },
    });
    // The `agent` kind's own comparison state, wired exactly like the four
    // above and for the same reasons.
    this.customAgentComparison = new CustomAgentComparisonState({
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
    const started = (this.#refreshInFlight ??= this.#refreshOnce().finally(() => {
      // Only its own slot: a fetch that settles after {@link #refreshFreshly}
      // has already opened a newer one must not clear that newer one.
      if (this.#refreshInFlight === started) {
        this.#refreshInFlight = null;
      }
    }));
    return started;
  }

  /**
   * Issues a fetch that starts now. The rescan recovery needs a request that
   * began after its failure — an in-flight fetch may predate the commit the
   * recovery must observe — so joining {@link refresh}'s coalesced request is
   * not enough. The in-flight one is abandoned rather than awaited: a purge
   * revokes its settlement authority but does not settle the RPC itself, so
   * waiting for it would tie this fetch to a response that may never come.
   */
  async #refreshFreshly(): Promise<void> {
    this.#refreshInFlight = null;
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
    const capturedRepositoryCommandVersion = this.#repositoryCommandVersion.value;
    const capturedGlobalCommandVersion = this.#globalCommandVersion.value;
    const capturedGlobalEnableVersion = this.#globalEnableVersion.value;
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
        if (this.#resumeToInventoryOnAdopt) {
          // The first snapshot adopted after a Global purge is the recovery
          // contract's fresh start (data-model.md § RecoveryViewState):
          // no prior detail comes back, so the shell is asked to land on
          // the inventory instead of remounting the purged world's route.
          this.#resumeToInventoryOnAdopt = false;
          this.inventoryResumeRequests.value += 1;
        }
        // A commit replaced the generation the open detail was read from.
        // Dropping it here is the generation half of the FR-027 cleanup: the
        // route notices and re-requests the same path under the new
        // generation, which is also how a removed file becomes the
        // `stale-resource` state instead of stale content on screen. The
        // open comparison goes with it: FR-030 invalidates the previous
        // generation's comparison view and editor-model state together.
        if (outcome.advancedSequences.length > 0) {
          // A commit invalidates only its own sequence's views (FR-030,
          // spec.md § Clarifications Session 2026-07-22): the open detail and
          // each open comparison drop only when the sequence that produced
          // them advanced, so a Global enable in another tab leaves a
          // repository page's held detail and editor state alone. Each view
          // is judged by the family its own open request named, held from
          // dispatch: the adopted details cannot answer it while a view is
          // still loading — and a comparison's absent side never answers at
          // all — so resolving families from what has been adopted would
          // close a Repository view over a Global commit it does not read
          // from, on a page whose own generation never moved and whose route
          // therefore never re-requests.
          const advanced = new Set<ScanSequence>(outcome.advancedSequences);
          if (this.#openDetailSequence !== null && advanced.has(this.#openDetailSequence)) {
            this.closeFileDetail();
          }
          for (const comparison of [
            this.skillComparison,
            this.instructionComparison,
            this.mcpComparison,
            this.hookComparison,
            this.pluginComparison,
            this.promptComparison,
            this.customAgentComparison,
          ] as const) {
            const sequence = comparison.openSequence.value;
            if (sequence !== null && advanced.has(sequence)) {
              comparison.close();
            }
          }
        }
        this.snapshot.value = outcome.snapshot;
        // A refresh success answers session-level failures only: a retained
        // detail error still describes the open detail's own failed request,
        // which this success says nothing about.
        this.#sessionError.value = null;
        this.view.value = 'inspection';
        // A rejection describes a command that is now history. The snapshot
        // just adopted is the state the user asked about, so a stale
        // `scan-in-progress` must not outlive it and sit beside a Ready
        // source — on the Repository control and on a member row alike.
        // `accepted` is different: it names a scan still running. A refresh
        // that started before a later rescan clears nothing: the rejection it
        // would erase belongs to a command it never saw.
        if (
          this.rescanState.value === 'rejected' &&
          this.#repositoryCommandVersion.value === capturedRepositoryCommandVersion
        ) {
          this.rescanState.value = 'idle';
          this.rescanRejection.value = null;
        }
        if (
          this.globalRescanState.value === 'rejected' &&
          this.#globalCommandVersion.value === capturedGlobalCommandVersion
        ) {
          this.globalRescanState.value = 'idle';
          this.globalRescanRejection.value = null;
        }
        // Releases the confirmation hold, wherever the adoption came from —
        // `confirmGlobalConsent`'s own refetch or the reader's Refresh.
        // Adoption *is* the authoritative answer the hold waits for, whatever
        // it says: a control block, an operation another tab still runs, or
        // neither, which is the true state after a pre-acceptance failure.
        // Reading the answer's content instead would leave confirm and
        // recapture disabled for good on exactly that path.
        if (
          this.globalEnableState.value === 'submitting' &&
          this.#globalEnableVersion.value === capturedGlobalEnableVersion
        ) {
          this.globalEnableState.value = 'idle';
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
      case 'fenced':
        // The client already ran the full purge on observing the fence; what
        // this view owns is rendering the recovery controls in its place.
        this.fenceRecovery.value = outcome.recovery;
        this.view.value = 'fenced';
        this.#sessionError.value = null;
        return;
      case 'purged':
        if (outcome.reason === 'session-identity-lost') {
          // A host that answers with another session is not this session's
          // host: the contract lands a session mismatch on the ended view
          // after the central purge, alongside channel loss and an
          // unsupported protocol (data-model.md § RecoveryViewState). Without
          // this the purge disposer's `booting` would stand, and nothing
          // refetches — the recovery fetch is the fence and epoch reasons'.
          this.view.value = 'ended';
          return;
        }
        // The purge disposer already scheduled the one recovery fetch for
        // the epoch and fence reasons (see the constructor's recovery
        // disposer); a second pass here would fetch the same snapshot
        // twice. Every other purge trigger cleared the view, and its own
        // reporter says what comes next.
        return;
      case 'rejected':
      case 'discarded':
        return;
    }
  }

  /**
   * Sends the priority disable barrier command (FR-042;
   * contracts/http-api.md § disable-global). The full client-data purge runs
   * before the request — nothing this session held may survive the decision
   * to disable — and the terminal outcome decides what is fetched next: a
   * no-op or terminal success immediately refetches the full snapshot, while
   * a post-acceptance failure refetches the fenced recovery so its retained
   * error and retry render where the reader is.
   */
  public async requestGlobalDisable(): Promise<void> {
    if (this.globalDisableState.value === 'submitting') {
      return;
    }
    this.#clientData.purge('global-disable-request');
    this.globalDisableState.value = 'submitting';
    this.view.value = 'booting';
    const outcome = await this.#client.disableGlobal();
    this.globalDisableState.value = 'idle';
    switch (outcome.kind) {
      case 'completed':
        // A no-op and a terminal success both leave a null fence, so the
        // full authoritative snapshot is immediately recoverable — fetched,
        // never reconstructed from anything purged (the FR-027 purge already
        // ran before the request went out). This is not the control-only
        // recovery FR-042 mandates: that binds a client that observed a
        // greater epoch or a non-null fence on a response, and this result
        // carries neither — it reports the fence already down. Nor does any
        // Resume step remain for the requester: the fenced view and its
        // "Check status" Resume exist for a session that hit the fence
        // mid-operation (GlobalFenceRecovery.vue), and a terminal result is
        // this requester already holding what that Resume would fetch.
        await this.#refreshFreshly();
        return;
      case 'rejected':
        // Disable itself returns no closed conflict; an unknown code is
        // handled by the client as the unsupported protocol. Refetching is
        // still the right recovery for anything declared later.
        await this.#refreshFreshly();
        return;
      case 'failed': {
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
          return;
        }
        // The failure is published immediately — the recovery fetch takes
        // time, and a known error must not wait for it (the fetch's own
        // success clears session errors, so it is restated below).
        this.#sessionError.value = outcome.error.message;
        const capturedEpoch = this.#clientData.epoch();
        await this.#refreshFreshly();
        // A post-acceptance failure surfaces through the fenced view the
        // refetch just adopted: the fence is still up and the failed
        // projection retains this same message with its retry control
        // (contracts/http-api.md § disable-global). A pre-acceptance failure
        // leaves no fence — nothing was accepted — so the refetch adopted
        // the ordinary view and cleared the error; the failed request's own
        // error is restated as the ordinary report it is, unless a purge
        // moved the session on while the fetch was out.
        if (this.fenceRecovery.value === null && this.#clientData.epoch() === capturedEpoch) {
          this.#sessionError.value = outcome.error.message;
        }
        return;
      }
    }
  }

  /**
   * Reads the host's current consent preview, without capturing one
   * (contracts/http-api.md § get-global-consent-preview). A host that holds
   * none answers `missing`, which the consent route renders as an offer to
   * capture rather than as something that went wrong.
   */
  public loadConsentPreview(): Promise<void> {
    return this.#consentPreviewRequest(() => this.#client.fetchGlobalConsentPreview());
  }

  /**
   * Captures the four proposed Global roots and replaces the host's
   * unconsented preview (contracts/http-api.md
   * § create-global-consent-preview). It submits no confirmation: what comes
   * back is what the reader is then asked to review, and enabling Global
   * inspection is a separate operation this state does not have.
   */
  public captureConsentPreview(): Promise<void> {
    return this.#consentPreviewRequest(() => this.#client.createGlobalConsentPreview());
  }

  /**
   * The request both preview calls share, with the one guard that applies: a
   * purge between dispatch and settlement means the preview belongs to a
   * session this page has dropped, so the settlement writes nothing.
   */
  async #consentPreviewRequest(issue: () => Promise<ConsentPreviewOutcome>): Promise<void> {
    this.consentPreviewState.value = 'loading';
    this.consentPreviewError.value = null;
    this.consentPreviewRejection.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const outcome = await issue();
    if (this.#clientData.epoch() !== capturedEpoch) {
      // A fatal failure still lands: the unsupported-rejection path purges
      // before reporting (`api-client.ts`), so the moved epoch is the fatal
      // outcome's own doing and dropping it here would leave the page
      // retrying a session that declared itself unusable.
      if (outcome.kind === 'failed' && outcome.fatal) {
        this.#sessionError.value = outcome.error.message;
        this.view.value = 'ended';
      }
      return;
    }
    switch (outcome.kind) {
      case 'ready':
        this.consentPreview.value = outcome.preview;
        this.consentPreviewState.value = 'ready';
        return;
      case 'purged':
        // The client purged on the response's greater epoch (FR-042); the
        // epoch guard above has already dropped this settlement's ownership,
        // so this case is unreachable in practice and deliberately writes
        // nothing — the purge disposer owns the view now.
        return;
      case 'discarded':
        // Settled across a purge: the response belongs to the discarded
        // world, and the epoch guard above already dropped its ownership.
        return;
      case 'missing':
        this.consentPreview.value = null;
        this.consentPreviewState.value = 'missing';
        return;
      case 'rejected':
        // A conflict rejection the preview pair can take once the enable and
        // disable operations exist: consent has frozen the preview, or one of
        // those operations holds it. The code travels as itself so the page can
        // state the conflict rather than a generic failure.
        this.consentPreview.value = null;
        this.consentPreviewState.value = 'failed';
        this.consentPreviewRejection.value = outcome.code;
        return;
      case 'failed':
        this.consentPreview.value = null;
        this.consentPreviewState.value = 'failed';
        // The failed request's own error, reported as it arrived: there is no
        // envelope and no cause classification (FR-040/FR-041 removed).
        this.consentPreviewError.value = outcome.error.message;
        if (outcome.fatal) {
          this.view.value = 'ended';
        }
        return;
    }
  }

  /**
   * Confirms the preview currently on screen (contracts/http-api.md
   * § enable-global), then refreshes so the accepted batch's Sources and
   * controls are what the page renders next.
   *
   * It sends the preview's own two identities and no tool list: what the
   * reader confirmed is the whole preview, and a client-side subset would be a
   * consent narrower than the one they were shown.
   */
  public async confirmGlobalConsent(): Promise<void> {
    const preview = this.consentPreview.value;
    if (preview === null || this.globalEnableState.value === 'submitting') {
      return;
    }
    this.globalEnableState.value = 'submitting';
    // Moved before the request goes out, so a fetch already in flight cannot
    // be mistaken for this confirmation's own answer.
    this.#globalEnableVersion.value += 1;
    this.consentPreviewRejection.value = null;
    this.consentPreviewError.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const outcome = await this.#client.enableGlobal(preview.previewId, preview.allowlistVersion);
    if (this.#clientData.epoch() !== capturedEpoch) {
      // The same fatal exception the preview guard makes: the unsupported
      // path's own purge moved the epoch, and 'ended' must still land.
      if (outcome.kind === 'failed' && outcome.fatal) {
        this.#sessionError.value = outcome.error.message;
        this.view.value = 'ended';
        return;
      }
      this.globalEnableState.value = 'idle';
      return;
    }
    // `submitting` holds until this command's own follow-up settles: an
    // acceptance is not on screen until the refetched snapshot is adopted, and
    // releasing the controls at the response would re-enable confirm and
    // recapture over the stale preview — a second confirmation would then take
    // the in-progress or no-retryable conflict and display a failure over a
    // correctly accepted operation. Each branch releases when its own last
    // write lands; the purge disposer resets the slot for the purged path.
    switch (outcome.kind) {
      case 'purged':
        // The client purged on the response's greater epoch (FR-042); the
        // epoch guard above already dropped this settlement, so nothing is
        // written here — the purge disposer owns the view now.
        return;
      case 'discarded':
        // Settled across a purge: the response belongs to the discarded
        // world, and the epoch guard above already dropped its ownership.
        return;
      case 'accepted': {
        this.globalEnableResult.value = outcome.result;
        // The batch commits after the acceptance, so the snapshot that carries
        // its Sources is the one fetched now — and a refresh is how a queued
        // batch's later commit reaches the page at all.
        await this.#refreshFreshly();
        // Released only once the authoritative snapshot landed: a failed
        // refetch leaves the stale preview with no controls on screen, and an
        // idle state there would re-arm confirm and recapture against an
        // operation the host already accepted — the second confirmation takes
        // the in-progress conflict and reads as a failure of an accepted one.
        // The consent page offers its own Refresh while this hold stands. The
        // release itself is the adoption's ({@link fetchSession} 'adopted'),
        // so a refetch that landed has already cleared this slot and one that
        // failed deliberately has not; a purge clears it through the
        // disposer.
        return;
      }
      case 'rejected':
        this.globalEnableState.value = 'idle';
        this.consentPreviewRejection.value = outcome.code;
        return;
      case 'failed': {
        this.consentPreviewError.value = outcome.error.message;
        if (outcome.fatal) {
          this.globalEnableState.value = 'idle';
          this.view.value = 'ended';
          return;
        }
        // A delivery failure can hide a confirmation the host accepted: the
        // batch may be running or already committed, and the stale snapshot
        // shows no controls — so no Refresh status control — while a second
        // confirmation would take the in-progress or no-retryable conflict.
        // The refetch recovers the accepted state from `batchStatus`
        // (contracts/http-api.md § enable-global: a lost response loses no
        // batch), and the failed request's own error is restated over the
        // refetch's success-clears-errors write while this page still owns
        // the outcome.
        await this.#refreshFreshly();
        // The same adoption-owned release as the accepted branch: a delivery
        // failure can hide an acceptance, so until a snapshot is adopted the
        // state stays unresolved and the page keeps confirm and recapture
        // out, offering its Refresh-and-Disable recovery instead.
        if (this.#clientData.epoch() === capturedEpoch) {
          this.consentPreviewError.value = outcome.error.message;
        }
        return;
      }
    }
  }

  public async requestRescan(): Promise<void> {
    await this.#dispatchRescanCommand(
      {
        state: this.rescanState,
        rejection: this.rescanRejection,
        recordAcceptance: (scanRequestId) => {
          this.activeScanRequestId.value = scanRequestId;
        },
        version: this.#repositoryCommandVersion,
      },
      () => this.#client.rescanRepository(),
      () => this.snapshot.value?.repositoryGeneration ?? null,
    );
  }

  /**
   * Dispatches one explicit rescan of a published member Global Source
   * (T1015; contracts/http-api.md § rescan-global), through the shared
   * command dispatch the Repository rescan uses. The pressed member rides in
   * {@link globalRescanSourceId} so the rejection and correlation attach to
   * its own row, and the race guard reads the Global sequence — a rejection
   * that settles after a newer Global commit was adopted is history exactly
   * as a Repository one is.
   */
  public async rescanGlobalSource(sourceId: string): Promise<void> {
    if (this.globalRescanState.value === 'requesting') {
      return;
    }
    this.globalRescanSourceId.value = sourceId;
    await this.#dispatchRescanCommand(
      {
        state: this.globalRescanState,
        rejection: this.globalRescanRejection,
        recordAcceptance: (scanRequestId) => {
          // One entry per member Source, so a second member's acceptance
          // never severs the first member's running correlation (FR-030).
          this.activeGlobalScans.value = new Map([
            ...this.activeGlobalScans.value,
            [sourceId, scanRequestId],
          ]);
        },
        version: this.#globalCommandVersion,
      },
      () => this.#client.rescanGlobal(sourceId),
      () => this.snapshot.value?.globalGeneration ?? null,
    );
  }

  /**
   * The one explicit-rescan command dispatch both Sources' commands share, so
   * acceptance, rejection-race, failure, purge, and supersession handling
   * cannot drift between them (FR-030). `slot` is the calling command's own
   * reactive state, and `generationNow` reads the sequence that command
   * commits into — the guard that recognizes a late rejection as history.
   */
  async #dispatchRescanCommand(
    slot: {
      readonly state: ShallowRef<RescanState>;
      readonly rejection: ShallowRef<RejectionCode | null>;
      /**
       * Where an acceptance records the admitted request's correlation —
       * the Repository slot's single active ID, or one entry of the Global
       * per-Source map. Called only on `accepted`, so a refused later press
       * never moves a running command's correlation.
       */
      readonly recordAcceptance: (scanRequestId: string) => void;
      /**
       * The slot's own dispatch counter: the settled command's restatement
       * compares against it alone, so the other sequence's dispatch never
       * suppresses this slot's error (FR-030 — two independent sequences).
       */
      readonly version: { value: number };
    },
    call: () => Promise<RescanOutcome>,
    generationNow: () => number | null,
  ): Promise<void> {
    // One command at a time. A second dispatch while one is in flight would
    // supersede the first's token and lose the request ID it was admitted
    // with — work the host is already doing, which nothing would then name.
    if (slot.state.value === 'requesting') {
      return;
    }
    slot.version.value += 1;
    const capturedCommandVersion = slot.version.value;
    slot.state.value = 'requesting';
    slot.rejection.value = null;
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
    const capturedGeneration = generationNow();
    const outcome = await call();
    // As in `refresh`: every branch writes state the purge owns.
    const purged = this.#clientData.epoch() !== capturedEpoch;
    switch (outcome.kind) {
      case 'accepted':
        if (purged) {
          return;
        }
        slot.state.value = 'accepted';
        slot.recordAcceptance(outcome.scanRequestId);
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
        // patched above with a Ready row beside a live active request ID.
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
          (generationNow() ?? capturedGeneration) > capturedGeneration
        ) {
          slot.state.value = 'idle';
          return;
        }
        slot.state.value = 'rejected';
        slot.rejection.value = outcome.code;
        return;
      case 'failed':
        if (purged && !outcome.fatal) {
          return;
        }
        slot.state.value = 'idle';
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
          slot.version.value !== capturedCommandVersion
        ) {
          return;
        }
        this.#sessionError.value = outcome.error.message;
        return;
      case 'purged':
        // The disposer already cleared the command state along with the view.
        return;
      case 'discarded':
        // Settled after its slot moved on — a purge aborted it, or a newer
        // same-sequence dispatch superseded it. Ownership is read from the
        // slot itself rather than from the shared command version: the other
        // sequence's dispatch advances that version without ever touching
        // this slot, and comparing against it would leave this slot showing
        // `requesting` forever. If this command still holds its slot open,
        // release it; anything else means the purge disposer or a newer
        // owner already wrote the slot.
        if (slot.state.value === 'requesting') {
          slot.state.value = 'idle';
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
    source: SourceSelector,
    target: FileOpenTarget,
  ): Promise<FileOpenOutcome> {
    const outcome = await this.#client.openFile(sourceRelativePath, source, target);
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
    this.#openDetailSequence = null;
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
    this.#dropOpenDetails();
    this.entryDetailError.value = null;
    this.fileDetailState.value = 'idle';
    for (const disposer of this.#openContentOwners) {
      disposer();
    }
    // A detail failure belongs to the route that requested it. A session error
    // survives: it describes the session, not the file the reader just left.
    this.#detailError.value = null;
  }

  /**
   * Fetches one file's detail under `owns`, settling every outcome that is not
   * a detail and returning null for each of them, so the pages that open a
   * file cannot drift into different handling of what a request can answer.
   * A `stale` or failed settlement clears whatever is on screen: showing the
   * previous file under a newer selection would claim a file the page does not
   * have.
   *
   * `pane` marks a file selected *inside* a customization the page is already
   * describing — a skill's companion, one of a plugin's own files. Only such a
   * request can fail alone: what describes the customization is still in hand,
   * and its tree is what the reader retries from, where the failure of the file
   * a page is *about* leaves nothing to show.
   */
  async #fetchOwnedFileDetail(
    sourceRelativePath: string,
    owns: () => boolean,
    slot: FileDetailSlot,
    source: SourceSelector,
  ): Promise<FileDetailDto | null> {
    const outcome = await this.#client.fetchFileDetail(sourceRelativePath, source);
    switch (outcome.kind) {
      case 'adopted':
        return owns() ? outcome.detail : null;
      case 'rejected':
        // The one rejection these requests can receive: no current generation
        // holds a file at the path. It is a declared functional outcome, shown
        // as its own state rather than as an error.
        if (owns()) {
          this.entryDetail.value = null;
          this.openCompanion.value = null;
          this.fileDetailState.value = 'stale';
          // The rejection proves this client's snapshot is older than the
          // host's committed generation — the path came from a snapshot whose
          // file the commit since removed. Refetching now makes "return to the
          // inventory and open it again" show what the current generation
          // actually holds.
          void this.refresh();
        }
        return null;
      case 'failed':
        // A fatal failure is the transport reporting the host is gone, which
        // is true of the session rather than of this request, so it is the one
        // outcome a no-longer-owning request still reports.
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
        } else if (owns()) {
          if (slot === 'manifest') {
            // The manifest's own outcome, in the slot that shows it: the pane
            // state and the page error belong to the file the reader selected,
            // which is a separate request with a separate answer.
            this.entryDetail.value = null;
            this.entryDetailError.value = outcome.error.message;
            return null;
          }
          if (slot === 'pane') {
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
        // generation's labels never sit over another's content. Adopting the
        // newer snapshot is the fix, and the route re-requests under it: its
        // open effect watches the committed generations, so the refresh both
        // closes this selection and reopens the same path against the new
        // snapshot. Fresh rather than joined, for the same reason as the
        // rescan recovery: an in-flight fetch may predate the commit this
        // withholding proves, and adopting its older snapshot would re-request
        // nothing.
        if (owns()) {
          await this.#refreshFreshly();
          // Adopting the newer snapshot closes this selection and advances the
          // version, so still owning here means no adoption happened: the
          // refresh failed non-fatally — a fatal failure purges, which changes
          // the epoch. Without this transition the page would sit on a loading
          // or held state with no request in flight and no recovery control;
          // the entry-failure state is the surface with the retry. The
          // refresh's own error stays the shell's to report
          // (`#sessionError`), so no message is copied here — the route states
          // its own condition and neither surface repeats the other.
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
  }

  /**
   * Drops every open detail slot and the request key beside them.
   *
   * One method rather than a list repeated at each open, because the list is
   * what FR-027 is about: a slot a route forgets keeps the previous
   * customization's authored source in memory after its page is gone, and the
   * outgoing page's own close is a no-op by then — the incoming open has
   * already taken ownership. A slot added to this class is added here, and
   * every route drops it.
   *
   * `fileDetailState` is deliberately not touched: each caller sets the state
   * its own request is in.
   */
  #dropOpenDetails(): void {
    // What this clears is the owned state the contract names: the DTO slots
    // here, and the Monaco models through their registered owners
    // (data-model.md § BrowserState). A page's computed projections over
    // these slots may lazily retain their last evaluation until re-read or
    // unmount; that is Vue's own cache, released by the platform lifecycle —
    // the central purge unmounts the page — and never by a read-for-effect
    // flush, which restructuring has replaced before and must not return.
    this.entryDetail.value = null;
    this.openCompanion.value = null;
    this.carrierDetail.value = null;
    this.hookDetail.value = null;
    this.pluginDetail.value = null;
    this.pluginManifestFile.value = null;
    this.pluginOpenFile.value = null;
    this.policyDetail.value = null;
    // The request key goes with the detail it keyed. It is authored text — a
    // carrier's path and a declared plugin name — so leaving it behind would
    // keep part of what the reader navigated away from in memory (FR-027).
    this.#openPluginRow = null;
    // The open detail's requested address goes the same way: its entry path
    // is a Source-relative Path of the purged view (FR-027), and a held
    // address with no held detail could only mislead the next comparison.
    this.#openDetailAddress = null;
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
  public async openFileDetail(
    entryPath: string,
    openPath: string,
    owner?: symbol,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    this.#openDetailSequence = selectorFamilyOf(source);
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
    // "The customization has not changed" is the whole address staying the
    // same, never the path alone: the repository and a consented home can hold
    // one Source-relative Path, so a step between their two details keeps a
    // path that is identical and a file that is not (FR-030). Compared against
    // the address this state last requested rather than against the response,
    // because that is what "unchanged" is about — and holding the other
    // Source's detail here would leave it on screen, in the ready state, under
    // the address the reader just opened.
    const openAddress = this.#openDetailAddress;
    const held =
      openAddress !== null &&
      openAddress.source === source &&
      openAddress.entryPath === entryPath &&
      this.entryDetail.value !== null
        ? this.entryDetail.value
        : null;
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
      // screen under another customization's heading — an MCP page's
      // commands, headers, and environment values would otherwise survive a
      // navigation to a skill or instruction page, whose open supersedes the
      // outgoing page's ownership-guarded close.
      this.#dropOpenDetails();
    }
    // After the drop, which clears the previous address with the rest: the
    // new selection's address is what the next call compares against.
    this.#openDetailAddress = { source, entryPath };
    const entry = held ?? (await this.#fetchOwnedFileDetail(entryPath, owns, 'page', source));
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
      openPath === entryPath
        ? null
        : (heldCompanion ?? (await this.#fetchOwnedFileDetail(openPath, owns, 'pane', source)));
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
  public async openCarrierDetail(
    sourceRelativePath: string,
    owner?: symbol,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    this.#openDetailSequence = selectorFamilyOf(source);
    const requested = this.#detailRequestVersion;
    this.#detailError.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#detailRequestVersion && this.#clientData.epoch() === capturedEpoch;
    // The carrier already on screen when the selection moved within it: a
    // step between two declarations of one carrier changes which record the
    // page heads itself with, not the response it renders from, so the held
    // detail answers without a second fetch.
    // Both halves of the identity, because two Sources can hold one spelling
    // (FR-030): the Claude and Copilot homes both hold a `settings.json`, so
    // a path-only match would answer one Source's request with the other's
    // held detail — and its retry with the same skip.
    if (
      this.carrierDetail.value?.file.sourceRelativePath === sourceRelativePath &&
      this.carrierDetail.value.file.sourceId ===
        sourceIdOf(this.snapshot.value?.sources ?? [], source)
    ) {
      this.fileDetailState.value = 'ready';
      return;
    }
    this.fileDetailState.value = 'loading';
    // The previous detail — every slot's — is dropped before the next one is
    // asked for, so a slow request never leaves one file's content on screen
    // under another customization's heading.
    this.#dropOpenDetails();
    const outcome = await this.#client.fetchMcpCarrierDetail(sourceRelativePath, source);
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
   * Requests one plugin carrier's declarations for one inventory row, the
   * plugin's own manifest, and the file of that plugin the reader has selected,
   * and adopts all three — or records why they could not be shown. The plugin
   * counterpart of {@link openFileDetail}, through the same request version,
   * epoch capture, and state machine, because the functions serve the one open
   * detail (contracts/http-api.md § get-plugin-carrier-detail).
   *
   * The three are one open for the reason a skill's two are: a plugin is its
   * root, so the page describes the offering, shows the plugin's own
   * declaration of itself, and shows the file being read, all at once. The
   * manifest takes the entry-point slot a skill's `SKILL.md` uses and is held
   * across a file selection for the same reason; a file the plugin ships
   * carries no recognition, so both are served by the file detail every
   * unrecognized file is. `manifestPath` is null for an offering whose source
   * names no directory here, and `selectedFilePath` is null when the manifest
   * is what the reader has open.
   */
  public async openPluginDetail(
    params: PluginCarrierDetailParams,
    manifestPath: string | null,
    selectedFilePath: string | null,
    owner?: symbol,
  ): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    this.#openDetailSequence = selectorFamilyOf(params.source);
    const requested = this.#detailRequestVersion;
    this.#detailError.value = null;
    this.entryDetailError.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#detailRequestVersion && this.#clientData.epoch() === capturedEpoch;
    // The declarations already on screen when the row has not changed. Keeping
    // them is what makes selecting another of the plugin's files a change to
    // the source alone, for the reason the skill route's entry point is kept:
    // clearing them would take the page through its loading state, unmounting
    // the tree the reader is using — and the link they just activated with it,
    // dropping keyboard focus to the document. "The row" is the whole carrier
    // identity — Source, path, plugin name, and the product whose reading the
    // detail answers with: one catalog read as Codex reads it and as Claude
    // reads it are two answers (api-types.ts § PluginCarrierDetailParams), so
    // a history step between those two pages must fetch, never keep the other
    // product's interpretation on screen.
    const held =
      this.#openPluginRow !== null &&
      this.#openPluginRow.source === params.source &&
      this.#openPluginRow.sourceRelativePath === params.sourceRelativePath &&
      this.#openPluginRow.pluginName === params.pluginName &&
      this.#openPluginRow.tool === params.tool
        ? this.pluginDetail.value
        : null;
    if (held !== null && this.fileDetailState.value === 'companion-failed') {
      // A retry — or another file selected — from the failed pane: the
      // declarations stay, and the pane returns to its in-flight state so the
      // failed branch and its retry button unmount.
      this.fileDetailState.value = 'ready';
    }
    if (held === null) {
      this.fileDetailState.value = 'loading';
      // The previous detail — every slot's — is dropped before the next one is
      // asked for, so a slow request never leaves one file's content on screen
      // under another customization's heading.
      this.#dropOpenDetails();
    }
    const detail = held ?? (await this.#fetchOwnedPluginCarrierDetail(params, owns));
    if (detail === null || !owns()) {
      // The fetch settled the state itself — a stale path, this route's own
      // error, or a request this one no longer owns.
      return;
    }
    this.pluginDetail.value = detail;
    this.#openPluginRow = params;
    // The declarations are the page's subject and are published the moment they
    // are owned, not with the file: a file's own failure must fail only the
    // pane, and that requires the row to already be the page's held state.
    this.fileDetailState.value = 'ready';
    this.#detailError.value = null;
    // The plugin's own manifest, in the slot a skill's entry point uses: it is
    // what the page shows beside the offering, so it stays while the reader
    // steps through the other files the plugin ships.
    // The file the reader selected comes first, and the manifest after it. Two
    // files, two requests, two outcomes: asking for the manifest first let its
    // failure return before the selection was ever requested, so a manifest
    // this scan cannot read took the reader's own file down with it. One
    // request when the manifest is what is open: it is already here, and asking
    // again would put one file's detail in two slots.
    await this.#openSelectedPluginFile(
      params,
      selectedFilePath === manifestPath ? null : selectedFilePath,
      owns,
    );
    if (manifestPath === null || !owns()) {
      return;
    }
    const heldManifest =
      this.pluginManifestFile.value?.file.sourceRelativePath === manifestPath
        ? this.pluginManifestFile.value
        : null;
    const manifest =
      heldManifest ?? (await this.#fetchOwnedPluginFile(params, manifestPath, owns, 'manifest'));
    if (owns()) {
      // Null when its own request failed, which the slot's error already says.
      this.pluginManifestFile.value = manifest;
    }
  }

  /**
   * Fetches one plugin carrier's declarations under `owns`, settling every
   * outcome that is not a detail and returning null for each of them — the
   * plugin half of what {@link #fetchOwnedFileDetail} does for a file, through
   * the same states, because the two serve the one open detail.
   */
  async #fetchOwnedPluginCarrierDetail(
    params: PluginCarrierDetailParams,
    owns: () => boolean,
  ): Promise<PluginCarrierDetailDto | null> {
    const outcome = await this.#client.fetchPluginCarrierDetail(params);
    switch (outcome.kind) {
      case 'adopted':
        return owns() ? outcome.detail : null;
      case 'rejected':
        // No current generation holds an admitted plugin carrier at the path — the
        // same declared outcome, shown as the same stale state, as a file
        // detail's (contracts/http-api.md § get-plugin-carrier-detail).
        if (owns()) {
          this.pluginDetail.value = null;
          this.#openPluginRow = null;
          this.fileDetailState.value = 'stale';
          void this.refresh();
        }
        return null;
      case 'failed':
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
        } else if (owns()) {
          this.pluginDetail.value = null;
          this.#openPluginRow = null;
          this.fileDetailState.value = 'idle';
          this.#detailError.value = outcome.error.message;
        }
        return null;
      case 'newer-generation':
        // Same recovery as the file detail's: adopt the newer snapshot, and
        // the route's own open effect re-requests the path under it.
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.pluginDetail.value = null;
            this.#openPluginRow = null;
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
  }

  /**
   * Opens the file of the plugin the reader has selected, beside the
   * declarations already published — reusing one it is already holding, for
   * the reason the skill route's companion is reused: returning to a file is a
   * change of selection, not of content, and a refetch could fail and take
   * good state with it.
   *
   * A null selection leaves the pane empty, which is the answer for a row
   * whose offering reached no files here.
   */
  async #openSelectedPluginFile(
    params: PluginCarrierDetailParams,
    selectedFilePath: string | null,
    owns: () => boolean,
  ): Promise<void> {
    if (selectedFilePath === null) {
      this.pluginOpenFile.value = null;
      return;
    }
    const held =
      this.pluginOpenFile.value?.file.sourceRelativePath === selectedFilePath
        ? this.pluginOpenFile.value
        : null;
    const file = held ?? (await this.#fetchOwnedPluginFile(params, selectedFilePath, owns, 'pane'));
    if (file === null || !owns()) {
      // The fetch settled the state itself — the pane's own failure, a stale
      // path, or a request this one no longer owns.
      return;
    }
    this.pluginOpenFile.value = file;
    this.fileDetailState.value = 'ready';
  }

  /**
   * Fetches one file of the open plugin under `owns`, settling every outcome
   * that is not a detail exactly as {@link #fetchOwnedFileDetail} does for a
   * file of a row whose subject the file is — the same slots, the same states,
   * because the two serve the one open detail.
   *
   * The plugin's own function rather than the generic one: a file below a
   * plugin root has no row whose subject it is unless a rule independently
   * admitted it, and the generic function answers for that row alone, so it
   * refuses exactly the files the plugin's tree lists
   * (contracts/http-api.md § get-plugin-file-detail).
   */
  async #fetchOwnedPluginFile(
    params: PluginCarrierDetailParams,
    filePath: string,
    owns: () => boolean,
    slot: FileDetailSlot,
  ): Promise<PluginFileDetailDto | null> {
    const outcome = await this.#client.fetchPluginFileDetail({ ...params, filePath });
    switch (outcome.kind) {
      case 'adopted':
        return owns() ? outcome.detail : null;
      case 'rejected':
        // The plugin no longer reaches this file: a commit that dropped it, or
        // a path this offering never enumerated. The same declared outcome, in
        // the same state, as a file detail's stale answer — and the refetch is
        // what makes reopening the row show what this generation holds.
        if (owns()) {
          this.pluginManifestFile.value = null;
          this.pluginOpenFile.value = null;
          this.fileDetailState.value = 'stale';
          void this.refresh();
        }
        return null;
      case 'failed':
        // A fatal failure is the transport reporting the host is gone, which is
        // true of the session rather than of this request, so it is the one
        // outcome a no-longer-owning request still reports.
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
        } else if (owns()) {
          if (slot === 'manifest') {
            // The manifest's own outcome, in the slot that shows it: the pane
            // state belongs to the file the reader selected, which is a
            // separate request with a separate answer.
            this.pluginManifestFile.value = null;
            this.entryDetailError.value = outcome.error.message;
          } else {
            this.pluginOpenFile.value = null;
            this.fileDetailState.value = 'companion-failed';
            this.#detailError.value = outcome.error.message;
          }
        }
        return null;
      case 'newer-generation':
        // The host committed past this page's snapshot, so the response was
        // withheld rather than shown under this generation's labels. Adopting
        // the newer snapshot is the fix, and the route's open effect watches
        // the committed generations, so the refresh both closes this selection
        // and reopens the same path under the new one — the same recovery a
        // file detail performs (FR-030).
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.pluginManifestFile.value = null;
            this.pluginOpenFile.value = null;
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
  }

  /**
   * Requests one hook carrier's declarations and adopts them, or records why
   * they could not be shown — the hook counterpart of
   * {@link openCarrierDetail}, through the same request version, epoch
   * capture, and state machine, because the detail functions serve the one
   * open detail (contracts/http-api.md § get-hook-carrier-detail).
   */
  public async openHookCarrierDetail(
    sourceRelativePath: string,
    owner?: symbol,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    this.#openDetailSequence = selectorFamilyOf(source);
    const requested = this.#detailRequestVersion;
    this.#detailError.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#detailRequestVersion && this.#clientData.epoch() === capturedEpoch;
    // The carrier already on screen when the selection moved within it: a step
    // between two events of one carrier changes which declaration the page
    // heads itself with, not the response it renders from, so the held detail
    // answers without a second fetch — the rule {@link openCarrierDetail}
    // applies to a step between two servers.
    // Both halves of the identity, because two Sources can hold one spelling
    // (FR-030): the Claude and Copilot homes both hold a `settings.json`, so
    // a path-only match would answer one Source's request with the other's
    // held detail — and its retry with the same skip.
    if (
      this.hookDetail.value?.file.sourceRelativePath === sourceRelativePath &&
      this.hookDetail.value.file.sourceId === sourceIdOf(this.snapshot.value?.sources ?? [], source)
    ) {
      this.fileDetailState.value = 'ready';
      return;
    }
    this.fileDetailState.value = 'loading';
    // The previous detail — every slot's — is dropped before the next one is
    // asked for, so a slow request never leaves one file's content on screen
    // under another customization's heading.
    this.#dropOpenDetails();
    const outcome = await this.#client.fetchHookCarrierDetail(sourceRelativePath, source);
    switch (outcome.kind) {
      case 'adopted':
        if (owns()) {
          this.hookDetail.value = outcome.detail;
          this.fileDetailState.value = 'ready';
          this.#detailError.value = null;
        }
        return;
      case 'rejected':
        // No current generation holds an admitted hook carrier at the path —
        // the same declared outcome, shown as the same stale state, as a file
        // detail's (contracts/http-api.md § get-hook-carrier-detail).
        if (owns()) {
          this.hookDetail.value = null;
          this.fileDetailState.value = 'stale';
          void this.refresh();
        }
        return;
      case 'failed':
        if (outcome.fatal) {
          this.#sessionError.value = outcome.error.message;
          this.view.value = 'ended';
        } else if (owns()) {
          this.hookDetail.value = null;
          this.fileDetailState.value = 'idle';
          this.#detailError.value = outcome.error.message;
        }
        return;
      case 'newer-generation':
        // Same recovery as the MCP carrier's: adopt the newer snapshot, and
        // the route's own open effect re-requests the path under it.
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.hookDetail.value = null;
            this.fileDetailState.value = 'idle';
          }
        }
        return;
      case 'purged':
        // The client-data purge already cleared the slots; nothing to adopt.
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
  public async openPolicyDetail(
    sourceRelativePath: string,
    owner?: symbol,
    source: SourceSelector = 'repository',
  ): Promise<void> {
    this.#detailOwner = owner ?? null;
    this.#detailRequestVersion += 1;
    this.#openDetailSequence = selectorFamilyOf(source);
    const requested = this.#detailRequestVersion;
    this.#detailError.value = null;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#detailRequestVersion && this.#clientData.epoch() === capturedEpoch;
    // Both halves of the identity, because two Sources can hold one spelling
    // (FR-030): the Claude and Copilot homes both hold a `settings.json`, so
    // a path-only match would answer one Source's request with the other's
    // held detail — and its retry with the same skip.
    if (
      this.policyDetail.value?.file.sourceRelativePath === sourceRelativePath &&
      this.policyDetail.value.file.sourceId ===
        sourceIdOf(this.snapshot.value?.sources ?? [], source)
    ) {
      // Already the open policy: a re-entry under the same generation asks
      // for what is on screen, so nothing is refetched.
      this.fileDetailState.value = 'ready';
      return;
    }
    this.fileDetailState.value = 'loading';
    // The previous detail — every slot's — is dropped before the next one is
    // asked for, so a slow request never leaves one file's content on screen
    // under another customization's heading.
    this.#dropOpenDetails();
    const outcome = await this.#client.fetchPermissionPolicyDetail(sourceRelativePath, source);
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
