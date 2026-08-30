// The skill comparison view state for the browser SPA (T195; FR-011,
// FR-030, data-model.md § BrowserState · ComparisonSelection).
//
// This surface is the skill kind's, not a shared one: a skill comparison
// is one name's copies compared file by
// corresponding file, a model other kinds do not fit — an MCP comparison,
// for one, compares declarations inside carrier files rather than
// same-named file copies — so each family's comparison phase designs its
// own surface, and nothing here pretends to be it.
//
// The comparison selection is the route's:
// `/skills/compare/<family>?name=<row name>&leftSource=<selector>&left=<entry path>&rightSource=<selector>&right=<entry path>&file=<relative>`
// names the row and two of its copies by their entry files' whole identities —
// each side's own Source and Source-relative Path, the identity the inventory
// and the detail route use (FR-030) —
// and the compared file inside them, and the compare page's own switchers
// are how a reader moves those coordinates. There is no standing
// pre-selection state: the entry links are built where a name's files are
// already known (the inventory row and the skill detail page), and a
// persistent two-file selection could not switch among three or more files
// the way the switchers do. A pair the model does not express is reported
// by the page, never opened (FR-011).
//
// What this class holds is the open view: the ordinary `get-file-detail`
// loads a pair needs — two for a two-file pair, one for a one-sided pair
// whose absent side is the stated absence itself — of files the client
// already lists. There is no compare API, because a comparison is a read of
// committed details, not a new resource. The view is generation-scoped
// (FR-030): a commit that replaces the owning sequence's snapshot
// invalidates the previous generation's comparison view and editor-model
// state, and the central client-data purge (FR-027) clears them the same
// way.
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
 *  - 'loading'      the pair's detail requests are in flight — two for a
 *                   two-file pair, one for a one-sided pair
 *  - 'ready'        every present side's detail passed its guards and may be
 *                   rendered; a one-sided pair's absent side stays null as
 *                   the stated absence
 *  - 'same-path'    the route named one path twice; the same file must not
 *                   occupy both sides (FR-011)
 *  - 'stale'        a named path resolves to no current-generation file
 *  - 'not-readable' a named file holds no readable source text (FR-025)
 *  - 'failed'       a request failed ordinarily; the real message is kept
 */
export type SkillComparisonViewStatus =
  /** Nothing is open, or the open pair was cleaned up. */
  | 'idle'
  /** The pair's detail requests — one or two — are in flight. */
  | 'loading'
  /** Every present side's detail passed its guards and is rendered. */
  | 'ready'
  /** The route named one path twice (FR-011). */
  | 'same-path'
  /** A named path resolves to no current-generation file. */
  | 'stale'
  /** A named file holds no readable source text (FR-025). */
  | 'not-readable'
  /** A request failed ordinarily; see {@link SkillComparisonState.errorMessage}. */
  | 'failed';

/**
 * The skill comparison route of one compared pair. `name` is the invocation
 * name of the row the pair belongs to, `left` and `right` are the two copies'
 * identities — each the entry file's own Source and Source-relative Path, the
 * same identity the inventory's definitions and the detail route use (FR-030),
 * each side naming its Source because a consented member publishes skills too
 * (contracts/http-api.md § Host requirements #5) — and
 * `comparedFile` is the copy-relative path of the file the pair shows, omitted
 * for the entries themselves. The URL carries the comparison model's own
 * coordinates rather than two free file paths, so a pair the model cannot
 * express — two files of different names, one file twice, a cross-kind pair —
 * cannot be written.
 *
 * The row is named rather than derived from the two paths, because two files
 * can sit together on two rows: the products invoke a skill by different
 * facts, so `.claude/skills/alpha/SKILL.md` declaring `name: beta` beside
 * `.claude/skills/beta/SKILL.md` declaring `name: alpha` is on the `alpha` row
 * and the `beta` row alike. A derived row would be whichever of them sorts
 * first, which drops a third copy of the row the reader opened from out of the
 * compare page's switchers.
 *
 * A module function beside the state class so every surface that builds the
 * link — the inventory row's and detail page's entry links, and the compare
 * route's own switchers — builds the same URL.
 *
 * The family leads the address rather than a Source, because a pair stays
 * inside one family while a family can hold two consented homes — a reader
 * compares one home's file against the other's, never a Repository file
 * against a home's (contracts/http-api.md § Host requirements #5). Stated in
 * the address rather than derived so the page can refuse a pair outside it
 * before resolving anything.
 */
export function skillComparisonRouteFor(
  family: SourceKind,
  name: string,
  left: ComparisonSide,
  right: ComparisonSide,
  comparedFile?: string,
): {
  readonly path: string;
  readonly query: {
    readonly name: string;
    readonly leftSource: string;
    readonly left: string;
    readonly rightSource: string;
    readonly right: string;
    readonly file?: string;
  };
} {
  // Each value rides as its JSON string body, the spelling every route in this
  // product uses: a raw entry name can hold a lone surrogate (data-model.md
  // § SourceRelativePath), which the router's own query encoding rejects with
  // a `URIError` while the row's link renders (`detail-route.ts`). An
  // invocation name is authored text — or a directory segment — and takes the
  // same spelling for the same reason.
  return {
    path: `/skills/compare/${family}`,
    query: {
      name: toJsonStringBody(name),
      leftSource: left.source,
      left: toJsonStringBody(left.sourceRelativePath),
      rightSource: right.source,
      right: toJsonStringBody(right.sourceRelativePath),
      ...(comparedFile === undefined ? {} : { file: toJsonStringBody(comparedFile) }),
    },
  };
}

/** Construction inputs for {@link SkillComparisonState}. */
export interface SkillComparisonStateOptions {
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
 * The one open skill comparison view (FR-011). Every public member has a
 * render site or caller in the compare route; nothing is exposed only so a
 * test can read it.
 */
export class SkillComparisonState {
  /** The guarded API client the two detail loads go through. */
  readonly #client: SessionApiClient;

  /** The shared purge; the epoch source for every settlement guard. */
  readonly #clientData: ClientDataPurge;

  /** See {@link SkillComparisonStateOptions.refreshFreshly}. */
  readonly #refreshFreshly: () => Promise<void>;

  /** See {@link SkillComparisonStateOptions.reportFatalFailure}. */
  readonly #reportFatalFailure: (error: Error) => void;

  /** Where the one open comparison stands; see {@link SkillComparisonViewStatus}. */
  public readonly status = shallowRef<SkillComparisonViewStatus>('idle');
  /**
   * The Source family of the open request, held from dispatch (FR-030): the
   * adopted details cannot answer it while the pair is still loading or is
   * one-sided, and the session's generation adoption must close a comparison
   * exactly when the sequence that owns it advanced — never for the other
   * sequence's commit.
   */
  public readonly openSequence = shallowRef<SourceKind | null>(null);

  /**
   * The first compared file's adopted detail. Null outside 'ready' — and
   * within it for the absent side of a one-sided comparison
   * ({@link openSingle}), where the missing counterpart is the difference.
   */
  public readonly leftDetail = shallowRef<FileDetailDto | null>(null);

  /** The second compared file's adopted detail; see {@link leftDetail}. */
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
  public constructor(options: SkillComparisonStateOptions) {
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
   * detail's registry does (`SessionViewState.registerOpenContentOwner`):
   * the models are owned by the component that mounted them while the
   * disposal order is this module's contract.
   */
  public registerOpenContentOwner(disposer: () => void): () => void {
    this.#openContentOwners.add(disposer);
    return () => this.#openContentOwners.delete(disposer);
  }

  /**
   * Drops the open view: supersedes any request still in flight, clears the
   * reactive state, and disposes the component-owned content synchronously.
   * The reactive state goes first and the owned content second, in one
   * synchronous block, for the same ordering the skill detail's close
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
   * Opens the comparison of exactly two distinct files: two ordinary detail
   * loads, in order, adopted together or not at all (FR-011). Every write
   * happens behind one ownership check, so the ways an invocation stops
   * owning the view — a purge, a generation change, a close, a newer open —
   * cannot each grow their own handling.
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
   * Opens the one-sided comparison of a file only one of the name's copies
   * ships: the present side's complete content against its absent
   * counterpart — the absence itself is the difference the surface exists to
   * show. One ordinary detail load; the absent side's detail stays null
   * within 'ready', and the compare route renders the missing side as the
   * stated absence. The caller decides one-sidedness against the committed
   * snapshot it holds; a path that turns out uncommitted still settles as
   * the ordinary stale outcome.
   */
  public async openSingle(present: ComparisonSide, presentSide: 'left' | 'right'): Promise<void> {
    this.#dropView();
    this.openSequence.value = sideFamilyOf(present);
    const requested = this.#requestVersion;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#requestVersion && this.#clientData.epoch() === capturedEpoch;
    this.status.value = 'loading';
    const presentDetail = await this.#fetchOwned(present, owns);
    if (presentDetail === null || !owns()) {
      return;
    }
    if (presentSide === 'left') {
      this.leftDetail.value = presentDetail;
    } else {
      this.rightDetail.value = presentDetail;
    }
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
