// The prompt-and-command comparison view state for the browser SPA (T505;
// FR-011, FR-030, data-model.md § BrowserState · ComparisonSelection).
//
// This surface is the `prompt/command` kind's, not a shared one: comparison
// is kind-specific with no shared module (spec.md § Clarifications Session
// 2026-08-14), and this kind's model is two files of one invocation-name row
// compared whole — the row-owned pair the skill precedent establishes, with
// the name row standing where the skill name's row stands. A file of this
// kind is complete in itself, with no copy directory and no
// corresponding-file coordinate, so the row's files are compared whole
// rather than file by corresponding file.
//
// One surface covers the whole kind, because one kind is one comparison
// surface: a Claude command, a Copilot CLI command, and a VS Code prompt
// file all reach this page, and a prompt sitting opposite a command is the
// pair the kind's row unit makes possible (tasks.md T503/T505).
//
// The comparison selection is the route's:
// `/prompts-and-commands/compare/<family>?left=<path>&right=<path>` names the two
// files by their Source-relative Paths — the identity the inventory and the
// detail route use (FR-030); the owning name row is derived from them, the
// way the skill and instruction routes derive theirs, because no shipped
// rule lets one file resolve two names — and the compare page's own pickers
// are how a reader moves those coordinates within the row. There is no
// standing pre-selection state, and a pair the model does not express is
// reported by the page, never opened (FR-011).
//
// What this class holds is the open view: the two ordinary `get-file-detail`
// loads of files the client already lists. There is no compare API, because
// a comparison is a read of committed details, not a new resource. The view
// is generation-scoped (FR-030): a commit that replaces the owning
// sequence's snapshot invalidates the previous generation's comparison view
// and editor-model state, and the central client-data purge (FR-027) clears
// them the same way.
//
// Construction performs no I/O, and the state is owned by the one
// `SessionViewState`: a second instance would race the first for the same
// request tokens.
import { sideFamilyOf, toJsonStringBody, type ComparisonSide } from '../components/detail-route';
import { shallowRef } from 'vue';
import type { SessionApiClient } from '../session/api-client';
import type { ClientDataPurge } from '../session/client-data';
import { isReadableFile } from '../../shared/entities';
import type { FileDetailDto, SourceKind } from '../../shared/api-types';

/**
 * Where the one open comparison stands:
 *  - 'idle'         nothing is open, or the open pair was cleaned up; with a
 *                   pair still named by the route this is the recoverable
 *                   state whose retry re-requests it
 *  - 'loading'      the pair's two detail requests are in flight
 *  - 'ready'        both details passed their guards and may be rendered
 *  - 'same-path'    the route named one path twice; the same file must not
 *                   occupy both sides (FR-011)
 *  - 'stale'        a named path resolves to no current-generation file
 *  - 'not-readable' a named file holds no readable source text (FR-025)
 *  - 'failed'       a request failed ordinarily; the real message is kept
 */
export type PromptComparisonViewStatus =
  /** Nothing is open, or the open pair was cleaned up. */
  | 'idle'
  /** The pair's two detail requests are in flight. */
  | 'loading'
  /** Both details passed their guards and are rendered. */
  | 'ready'
  /** The route named one path twice (FR-011). */
  | 'same-path'
  /** A named path resolves to no current-generation file. */
  | 'stale'
  /** A named file holds no readable source text (FR-025). */
  | 'not-readable'
  /** A request failed ordinarily; see {@link PromptComparisonState.errorMessage}. */
  | 'failed';

/**
 * The prompt-and-command comparison route of one compared pair. `left` and
 * `right` are the two files' identities — each its own Source and
 * Source-relative Path, the identity the inventory rows and the detail route
 * use (FR-030), each side naming its Source because a consented member
 * publishes prompt and command files too (contracts/http-api.md § Host
 * requirements #5); the invocation-name row that owns the pair is derived
 * from them rather than carried, because no shipped rule lets one file
 * resolve two names. A module function beside the
 * state class so every surface that builds the link — the inventory row's
 * and detail page's entry links, and the compare route's own pickers —
 * builds the same URL.
 *
 * The family leads the address rather than a Source, because a pair stays
 * inside one family while a family can hold two consented homes — a reader
 * compares one home's file against the other's, never a Repository file
 * against a home's (contracts/http-api.md § Host requirements #5). Stated in
 * the address rather than derived so the page can refuse a pair outside it
 * before resolving anything.
 */
export function promptComparisonRouteFor(
  family: SourceKind,
  left: ComparisonSide,
  right: ComparisonSide,
): {
  readonly path: string;
  readonly query: {
    readonly leftSource: string;
    readonly left: string;
    readonly rightSource: string;
    readonly right: string;
  };
} {
  // Each path rides as its JSON string body, the spelling every route in this
  // product uses: a raw entry name can hold a lone surrogate (data-model.md
  // § SourceRelativePath), which the router's own query encoding rejects with
  // a `URIError` while the row's link renders (`detail-route.ts`).
  return {
    path: `/prompts-and-commands/compare/${family}`,
    query: {
      leftSource: left.source,
      left: toJsonStringBody(left.sourceRelativePath),
      rightSource: right.source,
      right: toJsonStringBody(right.sourceRelativePath),
    },
  };
}

/** Construction inputs for {@link PromptComparisonState}. */
export interface PromptComparisonStateOptions {
  /** The guarded API client the pair's detail loads go through. */
  readonly client: SessionApiClient;
  /** The shared purge: the epoch guard, and where this state registers its clearing. */
  readonly clientData: ClientDataPurge;
  /**
   * Waits out any in-flight session fetch, then issues one that starts now.
   * Called when the host answers a detail from a generation newer than the
   * adopted snapshot: an in-flight fetch may predate the commit the
   * withholding proves, so joining it would adopt nothing
   * (`SessionApiClient.fetchFileDetail` § newer-generation).
   */
  readonly refreshFreshly: () => Promise<void>;
  /**
   * Reports a fatal transport failure to the session owner. The client has
   * already purged on its way here; what remains is the session-level fact —
   * the ended view and its message — which belongs to `SessionViewState`,
   * not to this state.
   */
  readonly reportFatalFailure: (error: Error) => void;
}

/**
 * The one open prompt-and-command comparison view (FR-011). Every public member has
 * a render site or caller in the compare route; nothing is exposed only so a
 * test can read it.
 */
export class PromptComparisonState {
  /** The guarded API client the two detail loads go through. */
  readonly #client: SessionApiClient;

  /** The shared purge; the epoch source for every settlement guard. */
  readonly #clientData: ClientDataPurge;

  /** See {@link PromptComparisonStateOptions.refreshFreshly}. */
  readonly #refreshFreshly: () => Promise<void>;

  /** See {@link PromptComparisonStateOptions.reportFatalFailure}. */
  readonly #reportFatalFailure: (error: Error) => void;

  /** Where the one open comparison stands; see {@link PromptComparisonViewStatus}. */
  public readonly status = shallowRef<PromptComparisonViewStatus>('idle');
  /**
   * The Source family of the open request, held from dispatch (FR-030): the
   * adopted details cannot answer it while the pair is still loading or is
   * one-sided, and the session's generation adoption must close a comparison
   * exactly when the sequence that owns it advanced — never for the other
   * sequence's commit.
   */
  public readonly openSequence = shallowRef<SourceKind | null>(null);

  /** The first compared file's adopted detail. Null outside 'ready'. */
  public readonly leftDetail = shallowRef<FileDetailDto | null>(null);

  /** The second compared file's adopted detail. Null outside 'ready'. */
  public readonly rightDetail = shallowRef<FileDetailDto | null>(null);

  /**
   * The real error message of the failed detail request retained by the
   * 'failed' status, or null. The compare route shows it beside its retry;
   * a session-level failure stays the shell's to report.
   */
  public readonly errorMessage = shallowRef<string | null>(null);

  /**
   * The named path whose file holds no readable source text, set with the
   * 'not-readable' status so the page can say which file rather than which
   * pair (FR-025). Null in every other status.
   */
  public readonly unreadablePath = shallowRef<string | null>(null);

  /**
   * Counts open requests, so a settlement can tell whether the view still
   * wants what it asked for. A purge, a generation change, a close, and a
   * newer open each advance it; the epoch check covers only the first.
   */
  #requestVersion = 0;

  /**
   * Disposers of component-owned holders of the open comparison's content —
   * the two Monaco models above all. Run synchronously by every drop path,
   * because the contract orders dispose before replace (data-model.md
   * § BrowserState): waiting for the reactive unmount would leave both
   * files' authored text in models for one render flush after the state was
   * already gone.
   */
  readonly #openContentOwners = new Set<() => void>();

  /** Wires the state and registers its clearing with the shared purge. */
  public constructor(options: PromptComparisonStateOptions) {
    this.#client = options.client;
    this.#clientData = options.clientData;
    this.#refreshFreshly = options.refreshFreshly;
    this.#reportFatalFailure = options.reportFatalFailure;
    // The central purge clears the open view: it belongs to the purged
    // session's committed state (FR-027). Registered by this owner itself,
    // so the purge stays one call site that enumerates nothing.
    this.#clientData.register(() => {
      this.#dropView();
    });
  }

  /**
   * Registers one component-owned holder of the open comparison's content,
   * returning its unregister function. Exists for the same reason the skill
   * comparison's registry does: the models are owned by the component that
   * mounted them while the disposal order is this module's contract.
   */
  public registerOpenContentOwner(disposer: () => void): () => void {
    this.#openContentOwners.add(disposer);
    return () => this.#openContentOwners.delete(disposer);
  }

  /**
   * Drops the open view: supersedes any request still in flight, clears the
   * reactive state, and disposes the component-owned content synchronously.
   * The reactive state goes first and the owned content second, in one
   * synchronous block, for the same ordering the skill comparison's drop
   * documents (data-model.md § BrowserState).
   */
  #dropView(): void {
    this.#requestVersion += 1;
    this.leftDetail.value = null;
    this.rightDetail.value = null;
    this.status.value = 'idle';
    this.openSequence.value = null;
    this.errorMessage.value = null;
    this.unreadablePath.value = null;
    for (const disposer of this.#openContentOwners) {
      disposer();
    }
  }

  /**
   * Drops the open view and the models rendering it. Two callers, one
   * cleanup: leaving the compare route (FR-027), and `SessionViewState`'s
   * adoption of a newer committed generation, which invalidates the previous
   * generation's comparison view and editor-model state (FR-030) — the
   * route's watch then re-requests the same pair under the new snapshot.
   */
  public close(): void {
    this.#dropView();
  }

  /**
   * Opens the comparison of exactly two distinct files of this kind: two
   * ordinary detail loads, in order, adopted together or not at all
   * (FR-011). Every write happens behind one ownership check, so the ways an
   * invocation stops owning the view — a purge, a generation change, a
   * close, a newer open — cannot each grow their own handling.
   */
  public async open(left: ComparisonSide, right: ComparisonSide): Promise<void> {
    // The previous pair's content is dropped before anything is requested,
    // so a slow request never leaves one pair's sources on screen under
    // another pair's paths; this also supersedes any open still in flight.
    this.#dropView();
    this.openSequence.value = sideFamilyOf(left);
    const requested = this.#requestVersion;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#requestVersion && this.#clientData.epoch() === capturedEpoch;
    if (left.source === right.source && left.sourceRelativePath === right.sourceRelativePath) {
      // The same file must not occupy both inputs, however many recognitions
      // it has (FR-011) — and the identity is the Source-and-path pair, so
      // one path two Sources hold is two files and a valid pair (FR-030). A
      // declared outcome, decided here: spending a request to discover it
      // would ask the host a question the client can answer.
      this.status.value = 'same-path';
      return;
    }
    this.status.value = 'loading';
    // Sequential rather than concurrent, because the client correlates
    // detail settlements through one request-token family: a second
    // in-flight detail would supersede the first and discard its response
    // (`SessionApiClient` § request tokens). Two loads of committed state a
    // few milliseconds apart cost nothing a user can see.
    const leftDetail = await this.#fetchOwned(left, owns);
    if (leftDetail === null || !owns()) {
      return;
    }
    const rightDetail = await this.#fetchOwned(right, owns);
    if (rightDetail === null || !owns()) {
      return;
    }
    // Adopted together: a comparison with one side is not a comparison, and
    // publishing the pair in one synchronous step means no render can see
    // half of it.
    this.leftDetail.value = leftDetail;
    this.rightDetail.value = rightDetail;
    this.status.value = 'ready';
  }

  /**
   * Fetches one side and settles every non-adopted outcome, so no two call
   * sites can drift into different handling. `owns` is the calling open's
   * ownership check: every write happens behind it, except the fatal report,
   * which is true of the session rather than of this request.
   */
  async #fetchOwned(side: ComparisonSide, owns: () => boolean): Promise<FileDetailDto | null> {
    const outcome = await this.#client.fetchFileDetail(side.sourceRelativePath, side.source);
    switch (outcome.kind) {
      case 'adopted':
        if (!owns()) {
          return null;
        }
        if (!isReadableFile(outcome.detail.file)) {
          // Binary input is textless and a failed read has nothing to show:
          // neither is comparison-eligible (FR-025), and the state names
          // the file instead of fabricating an empty side.
          this.unreadablePath.value = side.sourceRelativePath;
          this.status.value = 'not-readable';
          return null;
        }
        return outcome.detail;
      case 'rejected':
        // The one rejection a detail request can receive: no current
        // generation holds a file at the path. A declared functional
        // outcome, shown as its own state rather than as an error — and
        // proof this client's snapshot is older than the host's commit, so
        // the session is refetched exactly as the detail route does.
        if (owns()) {
          this.status.value = 'stale';
          void this.#refreshFreshly();
        }
        return null;
      case 'failed':
        // A fatal failure is the transport reporting the host is gone, or a
        // protocol/rejection the client cannot interpret — either way a
        // fact about the session rather than about this request, so it is
        // the one outcome a no-longer-owning request still reports.
        if (outcome.fatal) {
          this.#reportFatalFailure(outcome.error);
        } else if (owns()) {
          this.errorMessage.value = outcome.error.message;
          this.status.value = 'failed';
        }
        return null;
      case 'newer-generation':
        // The host has committed past this page's adopted snapshot.
        // Adopting the newer snapshot is the fix — the adoption itself
        // drops this open through the generation change — and the compare
        // route re-requests the same pair under the new snapshot. Still
        // owning afterwards means the refresh failed non-fatally; 'idle'
        // is then the recoverable state whose retry re-requests, and the
        // refresh's own error stays the shell's to report.
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.status.value = 'idle';
          }
        }
        return null;
      case 'purged':
        // The registered disposer already cleared the view.
        return null;
      case 'discarded':
        // A newer request owns the state now.
        return null;
    }
  }
}
