// The plugin comparison view state for the browser SPA (T831; FR-011,
// FR-030, data-model.md § BrowserState · ComparisonSelection).
//
// This surface is the plugin kind's, not a shared one: comparison is
// kind-specific with no shared module (spec.md § Clarifications Session
// 2026-08-14), and this kind's comparison unit is the inventory's own row
// unit — one plugin name as its vendor addresses it (data-model.md
// § Inventory unit). The two sides are that name's declarations in two of
// its row's carriers, each serialized to one canonical JSON document and
// diffed in Monaco (research.md § 7). Two carriers of one name is a
// repository keeping parallel catalogs — one at the location Codex reads and
// one at Claude's — and the comparison is what says whether the two entries
// still agree.
//
// The comparison selection is the route's:
// `/plugins/compare/<family>?name=<plugin name>&left=<path>&right=<path>` — the row's
// name in the carriers' own spelling and the two carriers by their
// Source-relative Paths, the identities the inventory and the detail route
// use (FR-030) — and a selection the model does not express is reported by
// the page, never opened (FR-011).
//
// What this class holds is the open view: the two ordinary
// `get-plugin-carrier-detail` loads of carriers the client already lists.
// There is no compare API, because a comparison is a read of committed
// details, not a new resource. The name travels with each request because
// the host answers for one row (contracts/http-api.md
// § get-plugin-carrier-detail), so neither side ever holds another plugin's
// declarations. The view is generation-scoped (FR-030), and the central
// client-data purge (FR-027) clears it the same way — including the two
// Monaco models holding the serialized declarations, whose disposers the
// mounting component registers here.
//
// Construction performs no I/O, and the state is owned by the one
// `SessionViewState`: a second instance would race the first for the same
// request tokens.
import { shallowRef } from 'vue';
import type { SupportedTool } from '../../shared/entities';
import { toJsonStringBody, type ComparisonSide } from '../components/detail-route';
import type { SessionApiClient } from '../session/api-client';
import type { ClientDataPurge } from '../session/client-data';
import type {
  PluginCarrierDetailDto,
  PluginCarrierDetailParams,
  PluginFileDetailDto,
  SourceKind,
} from '../../shared/api-types';

/**
 * Where the one open comparison stands:
 *  - 'idle'    nothing is open, or the open pair was cleaned up; with a
 *              pair still named by the route this is the recoverable state
 *              whose retry re-requests it
 *  - 'loading' the pair's two detail requests are in flight
 *  - 'ready'   both details were adopted and may be rendered
 *  - 'stale'   a named path resolves to no current-generation carrier of
 *              this plugin
 *  - 'failed'  a request failed ordinarily; the real message is kept
 *
 * No same-path state exists, because no caller can produce one: the compare
 * route rejects a link naming one carrier twice before it opens anything.
 */
export type PluginComparisonViewStatus =
  /** Nothing is open, or the open pair was cleaned up. */
  | 'idle'
  /** The pair's two detail requests are in flight. */
  | 'loading'
  /** Both details were adopted and are rendered. */
  | 'ready'
  /** A named path resolves to no current-generation carrier of this plugin. */
  | 'stale'
  /** A request failed ordinarily; see {@link PluginComparisonState.errorMessage}. */
  | 'failed';

/**
 * The plugin comparison route of one compared selection: `name` is the
 * plugin name whose row owns the comparison, as its vendor addresses it
 * (FR-007), `left` and `right` are the two carriers' identities — each its
 * own Source and Source-relative Path, the identity the inventory rows and
 * the detail route use (FR-030), each side naming its Source because a
 * consented member publishes plugin carriers too (contracts/http-api.md
 * § Host requirements #5) — and
 * `file` is the file of the plugin the reader has open, named relative to
 * each side's own root. A module function beside the state class so every
 * surface that builds the link — the inventory row's and detail page's entry
 * links, and the compare route's own pickers and file list — builds the same
 * URL.
 *
 * Every coordinate passes through {@link toJsonStringBody}, exactly as the
 * plugin detail's `?plugin=` and `?file=` do: a declared name and a raw
 * entry name are not always well-formed UTF-16 — strict JSON resolves an
 * authored `"\uD800"` escape to a lone surrogate — and the router's own
 * query encoding throws `URIError` on one, which would surface inside the
 * row computed that builds these links.
 *
 * The family leads the address rather than a Source, because a pair stays
 * inside one family while a family can hold two consented homes — a reader
 * compares one home's file against the other's, never a Repository file
 * against a home's (contracts/http-api.md § Host requirements #5). Stated in
 * the address rather than derived so the page can refuse a pair outside it
 * before resolving anything.
 */
export function pluginComparisonRouteFor(
  family: SourceKind,
  name: string,
  left: ComparisonSide,
  right: ComparisonSide,
  file: string | null = null,
): {
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
} {
  return {
    path: `/plugins/compare/${family}`,
    query: {
      name: toJsonStringBody(name),
      leftSource: left.source,
      left: toJsonStringBody(left.sourceRelativePath),
      rightSource: right.source,
      right: toJsonStringBody(right.sourceRelativePath),
      // The file the reader has open, named the way both plugins name it:
      // relative to each side's own root, because two copies of one plugin
      // sit at two paths and the file they share is the same name inside
      // them. Absent from the link that opens on the declarations, so an
      // entry link stays the plugin's own address.
      ...(file === null ? {} : { file: toJsonStringBody(file) }),
    },
  };
}

/**
 * One side's file request: the file to read, and the carrier whose offering of
 * this row's name reached it.
 *
 * The carrier travels with the path because a plugin's file is read as that
 * plugin's: the generic file detail answers for the row whose subject a file is,
 * and a file below a plugin root has none unless a rule independently admitted
 * it — where that row answers for its own kind and this one for the plugin
 * (contracts/http-api.md § get-plugin-file-detail).
 */
export interface PluginComparisonFileRequest {
  /** The Source-relative Path of the file to read (FR-030). */
  readonly filePath: string;
  /** The carrier whose offering reached it, and the product that read it. */
  readonly carrier: PluginCarrierDetailParams;
}

/** Construction inputs for {@link PluginComparisonState}. */
export interface PluginComparisonStateOptions {
  /** The guarded API client the pair's detail loads go through. */
  readonly client: SessionApiClient;
  /** The shared purge: the epoch guard, and where this state registers its clearing. */
  readonly clientData: ClientDataPurge;
  /**
   * Waits out any in-flight session fetch, then issues one that starts now.
   * Called when the host answers a detail from a generation newer than the
   * adopted snapshot (`SessionApiClient.fetchPluginCarrierDetail`
   * § newer-generation).
   */
  readonly refreshFreshly: () => Promise<void>;
  /**
   * Reports a fatal transport failure to the session owner; see the MCP
   * comparison's option of the same name.
   */
  readonly reportFatalFailure: (error: Error) => void;
}

/**
 * The one open plugin comparison view (FR-011). Every public member has a
 * render site or caller in the compare route; nothing is exposed only so a
 * test can read it.
 */
export class PluginComparisonState {
  /** The guarded API client the two detail loads go through. */
  readonly #client: SessionApiClient;

  /** The shared purge; the epoch source for every settlement guard. */
  readonly #clientData: ClientDataPurge;

  /** See {@link PluginComparisonStateOptions.refreshFreshly}. */
  readonly #refreshFreshly: () => Promise<void>;

  /** See {@link PluginComparisonStateOptions.reportFatalFailure}. */
  readonly #reportFatalFailure: (error: Error) => void;

  /** Where the one open comparison stands; see {@link PluginComparisonViewStatus}. */
  public readonly status = shallowRef<PluginComparisonViewStatus>('idle');

  /** The first compared carrier's adopted detail. Null outside 'ready'. */
  public readonly leftDetail = shallowRef<PluginCarrierDetailDto | null>(null);

  /** The second compared carrier's adopted detail. Null outside 'ready'. */
  public readonly rightDetail = shallowRef<PluginCarrierDetailDto | null>(null);

  /**
   * The real error message of the failed detail request retained by the
   * 'failed' status, or null. The compare route shows it beside its retry;
   * a session-level failure stays the shell's to report.
   */
  public readonly errorMessage = shallowRef<string | null>(null);

  /**
   * Where the selected file pair stands, or 'idle' while no file is
   * selected. Its own status beside {@link status} because a plugin's files
   * are a second pair of requests about a second pair of files: a file this
   * scan cannot read is a fact about that file, and failing the declaration
   * comparison with it would take the page's subject away over a file
   * selected inside it.
   */
  public readonly fileStatus = shallowRef<PluginComparisonViewStatus>('idle');

  /** The first side's copy of the selected file. Null outside a ready file pair. */
  public readonly leftFile = shallowRef<PluginFileDetailDto | null>(null);

  /** The second side's copy of the selected file. Null outside a ready file pair. */
  public readonly rightFile = shallowRef<PluginFileDetailDto | null>(null);

  /** The real error message the file pair's 'failed' status retains, or null. */
  public readonly fileErrorMessage = shallowRef<string | null>(null);

  /**
   * Where the compared plugins' own manifests stand, or 'idle' while neither
   * side has one to fetch. A third status beside {@link status} and
   * {@link fileStatus} for the same reason those two are apart: three
   * subjects, three pairs of files, and a manifest this scan cannot read is a
   * fact about that manifest rather than about the declarations it sits
   * beside.
   */
  public readonly manifestStatus = shallowRef<PluginComparisonViewStatus>('idle');

  /** The first side's plugin manifest. Null outside a ready manifest pair. */
  public readonly leftManifest = shallowRef<PluginFileDetailDto | null>(null);

  /** The second side's plugin manifest. Null outside a ready manifest pair. */
  public readonly rightManifest = shallowRef<PluginFileDetailDto | null>(null);

  /** The real error message the manifest pair's 'failed' status retains, or null. */
  public readonly manifestErrorMessage = shallowRef<string | null>(null);

  /**
   * Counts open requests, so a settlement can tell whether the view still
   * wants what it asked for. A purge, a generation change, a close, and a
   * newer open each advance it; the epoch check covers only the first.
   */
  #requestVersion = 0;

  /**
   * Counts open file-pair requests, so a settlement can tell whether the view
   * still wants the file it asked for. Its own counter beside
   * {@link #requestVersion}: stepping through a plugin's files supersedes the
   * previous file without touching the declarations the page is about.
   */
  #fileRequestVersion = 0;

  /**
   * Counts open manifest-pair requests, for the reason
   * {@link #fileRequestVersion} counts the file pair's: the manifests are
   * their own pair, and a newer pair supersedes the previous one without
   * touching what the page is about.
   */
  #manifestRequestVersion = 0;

  /**
   * Disposers of component-owned holders of the open comparison's content —
   * the two Monaco models carrying the serialized declarations. Run
   * synchronously by every drop path, because the contract orders dispose
   * before replace (data-model.md § BrowserState).
   */
  readonly #openContentOwners = new Set<() => void>();

  /**
   * The tail of this view's request chain, so its three pairs are fetched one
   * at a time.
   *
   * A comparison of one plugin has three subjects — the two carriers'
   * declarations, the two plugins' own manifests, and the file the reader
   * selected — and each is opened by its own effect, so two of them can start
   * in one flush. The client correlates every detail settlement through one
   * request-token family (`SessionApiClient` § request tokens), so a second
   * request in flight discards the first: run concurrently, the pairs would
   * take turns cancelling each other and both panels would report a failure
   * neither request had. Chaining is what makes each pair's own version guard
   * the only thing that can supersede it.
   */
  #requestChain: Promise<void> = Promise.resolve();

  /** Wires the state and registers its clearing with the shared purge. */
  public constructor(options: PluginComparisonStateOptions) {
    this.#client = options.client;
    this.#clientData = options.clientData;
    this.#refreshFreshly = options.refreshFreshly;
    this.#reportFatalFailure = options.reportFatalFailure;
    // The central purge clears the open view: it belongs to the purged
    // session's committed state (FR-027).
    this.#clientData.register(() => {
      this.#dropView();
    });
  }

  /**
   * Registers one component-owned holder of the open comparison's content,
   * returning its unregister function. Exists for the same reason the MCP
   * comparison's registry does: the serialized-declaration models are owned
   * by the component that mounted them while the disposal order is this
   * module's contract.
   */
  public registerOpenContentOwner(disposer: () => void): () => void {
    this.#openContentOwners.add(disposer);
    return () => this.#openContentOwners.delete(disposer);
  }

  /**
   * Runs one pair's requests after every pair queued before it, and never
   * beside one; see {@link #requestChain}. A task that throws is not this
   * class's to handle — every outcome the client can answer with is settled
   * inside the fetch helpers — but the chain has to survive one all the same,
   * or a single rejection would strand every later pair.
   */
  #run(task: () => Promise<void>): Promise<void> {
    const queued = this.#requestChain.then(task, task);
    this.#requestChain = queued.catch(() => undefined);
    return queued;
  }

  /**
   * Starts a fresh chain, so the next view does not wait behind work the
   * reader has already left.
   *
   * Called only where the whole view is superseded ({@link #dropView}), never
   * where one subview is replaced: chaining is what keeps two *wanted*
   * requests from discarding each other, and the carrier pair, the manifest
   * pair, and the file pair are all wanted at once on a link that names a
   * file. Resetting for one of them would let it run beside another, where the
   * client's one detail token family discards whichever settles second and
   * leaves that pane loading forever. A view the reader has left is wanted by
   * nobody, so a fresh chain there strands nothing.
   */
  #resetChain(): void {
    this.#requestChain = Promise.resolve();
  }

  /**
   * Drops the open view: supersedes any request still in flight, clears the
   * reactive state, and disposes the component-owned content synchronously —
   * the reactive state first and the owned content second, in one
   * synchronous block (data-model.md § BrowserState).
   */
  #dropView(): void {
    this.#requestVersion += 1;
    this.#resetChain();
    this.leftDetail.value = null;
    this.rightDetail.value = null;
    this.status.value = 'idle';
    this.errorMessage.value = null;
    this.#dropFilePair();
    this.#dropManifestPair();
    for (const disposer of this.#openContentOwners) {
      disposer();
    }
  }

  /**
   * Drops the selected file pair alone: its own sources leave with it, while
   * the declarations the page is about stay. Called by the file open before
   * it requests, and by {@link #dropView} with the rest.
   */
  #dropFilePair(): void {
    this.#fileRequestVersion += 1;
    this.leftFile.value = null;
    this.rightFile.value = null;
    this.fileStatus.value = 'idle';
    this.fileErrorMessage.value = null;
  }

  /** Drops the manifest pair alone; see {@link #dropFilePair}. */
  #dropManifestPair(): void {
    this.#manifestRequestVersion += 1;
    this.leftManifest.value = null;
    this.rightManifest.value = null;
    this.manifestStatus.value = 'idle';
    this.manifestErrorMessage.value = null;
  }

  /**
   * Drops the open view and the models rendering it. Two callers, one
   * cleanup: leaving the compare route (FR-027), and `SessionViewState`'s
   * adoption of a newer committed generation, which invalidates the previous
   * generation's comparison view (FR-030) — the route's watch then
   * re-requests the same pair under the new snapshot.
   */
  public close(): void {
    this.#dropView();
  }

  /**
   * Opens the comparison of one plugin name in two of its carriers — the
   * route rejects every other selection before calling this — as two
   * ordinary carrier-detail loads, in order, adopted together or not at all
   * (FR-011). Every write happens behind one ownership check, so the ways an
   * invocation stops owning the view — a purge, a generation change, a
   * close, a newer open — cannot each grow their own handling.
   */
  public open(
    pluginName: string,
    left: ComparisonSide,
    leftTool: SupportedTool,
    right: ComparisonSide,
    rightTool: SupportedTool,
  ): Promise<void> {
    // The previous pair's content is dropped before anything is requested,
    // so a slow request never leaves one pair's declarations on screen under
    // another pair's paths; this also supersedes any open still in flight.
    // Dropped now and fetched in turn: the drop is what supersedes, and it
    // must not wait behind a pair the reader has already left.
    this.#dropView();
    const requested = this.#requestVersion;
    // Loading from the moment it is queued, not from the moment it runs: the
    // drop above leaves the view idle, which is a state this surface reports
    // as a failed load, and a pair waiting its turn has not failed.
    this.status.value = 'loading';
    return this.#run(() =>
      this.#openOwned(pluginName, left, leftTool, right, rightTool, requested),
    );
  }

  /** The queued half of {@link open}; `requested` is that call's own version. */
  async #openOwned(
    pluginName: string,
    left: ComparisonSide,
    leftTool: SupportedTool,
    right: ComparisonSide,
    rightTool: SupportedTool,
    requested: number,
  ): Promise<void> {
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#requestVersion && this.#clientData.epoch() === capturedEpoch;
    if (!owns()) {
      // Superseded while it waited its turn.
      return;
    }
    this.status.value = 'loading';
    // Sequential rather than concurrent, because the client correlates
    // detail settlements through one request-token family: a second
    // in-flight detail would supersede the first and discard its response
    // (`SessionApiClient` § request tokens).
    const leftDetail = await this.#fetchOwned(pluginName, left, leftTool, owns);
    if (leftDetail === null || !owns()) {
      return;
    }
    const rightDetail = await this.#fetchOwned(pluginName, right, rightTool, owns);
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
   * The document a carrier response of this view already carried at one
   * Source-relative Path, as the pair slots hold documents, or null when no
   * carrier here is that file.
   *
   * A manifest carrier *is* its plugin's manifest, so its detail arrived with
   * the file's complete source and its own diagnostics; asking the host for
   * that path again would be a second read of a document this view is already
   * showing, which the request contract forbids (contracts/http-api.md
   * § Comparison views). Both sides are consulted, because which side holds it
   * is not a property of the document: a catalog whose plugin declares itself
   * with the file the other side's carrier is would otherwise re-read it in
   * one pair order and not in the other.
   *
   * Only the two carrier responses are consulted, never the pane slots. Those
   * live exactly as long as the pair, while a pane's slot is dropped whenever
   * its own selection changes — a pane that had adopted another pane's slot
   * would then be left holding a document with no request of its own to
   * restore it.
   */
  #carrierDocument(filePath: string): PluginFileDetailDto | null {
    for (const detail of [this.leftDetail.value, this.rightDetail.value]) {
      if (detail?.carrier === 'manifest' && detail.file.sourceRelativePath === filePath) {
        return { file: detail.file, diagnostics: detail.diagnostics };
      }
    }
    return null;
  }

  /**
   * Whether every side of a document pair is in hand already: a side that is
   * null needs nothing, and a side whose document a carrier response carried
   * is adopted rather than requested. Such a pair is published without
   * entering the queue at all, so a panel showing a document this view holds
   * never renders a loading state on the way to it.
   */
  #pairNeedsNoRequest(sides: readonly (PluginComparisonFileRequest | null)[]): boolean {
    return sides.every((side) => side === null || this.#carrierDocument(side.filePath) !== null);
  }

  /**
   * Opens the compared plugins' copies of one file, as ordinary
   * `get-plugin-file-detail` loads adopted together or not at all. The route
   * decides which file: it holds each side's own root and the census the row
   * published. A side may be null — a file only one copy ships — which is
   * requested as nothing and rendered as the stated absence it is, and a side
   * whose document a carrier response already carried is adopted from it
   * rather than read again ({@link #carrierDocument}).
   *
   * Its own request family, so a file that cannot be read fails the file
   * pane and leaves the declaration comparison — the page's subject —
   * standing (FR-028).
   */
  public openFilePair(
    left: PluginComparisonFileRequest | null,
    right: PluginComparisonFileRequest | null,
  ): Promise<void> {
    this.#dropFilePair();
    if (this.#pairNeedsNoRequest([left, right])) {
      // Both copies are in hand: a selected file that is one carrier's own
      // manifest is the document that carrier's response already carried
      // ({@link #carrierDocument}).
      this.leftFile.value = left === null ? null : this.#carrierDocument(left.filePath);
      this.rightFile.value = right === null ? null : this.#carrierDocument(right.filePath);
      this.fileStatus.value = 'ready';
      return Promise.resolve();
    }
    const requested = this.#fileRequestVersion;
    // Queued is loading; see {@link open}.
    this.fileStatus.value = 'loading';
    return this.#run(() => this.#openFilePairOwned(left, right, requested));
  }

  /** The queued half of {@link openFilePair}; `requested` is that call's version. */
  async #openFilePairOwned(
    leftRequest: PluginComparisonFileRequest | null,
    rightRequest: PluginComparisonFileRequest | null,
    requested: number,
  ): Promise<void> {
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#fileRequestVersion && this.#clientData.epoch() === capturedEpoch;
    if (!owns()) {
      return;
    }
    this.fileStatus.value = 'loading';
    // A null side is a file the other copy ships alone: there is nothing to
    // request for it, and its absence is what the comparison shows against
    // the present side's content (FR-011).
    const left =
      leftRequest === null
        ? null
        : (this.#carrierDocument(leftRequest.filePath) ??
          (await this.#fetchOwnedFile(leftRequest, owns)));
    if ((leftRequest !== null && left === null) || !owns()) {
      return;
    }
    const right =
      rightRequest === null
        ? null
        : (this.#carrierDocument(rightRequest.filePath) ??
          (await this.#fetchOwnedFile(rightRequest, owns)));
    if ((rightRequest !== null && right === null) || !owns()) {
      return;
    }
    this.leftFile.value = left;
    this.rightFile.value = right;
    this.fileStatus.value = 'ready';
  }

  /** Drops the selected file pair without touching the declarations. */
  public closeFilePair(): void {
    this.#dropFilePair();
  }

  /**
   * Opens the compared plugins' own manifests — the file each plugin declares
   * itself with, beside the entry each catalog declares it with — as ordinary
   * `get-plugin-file-detail` loads adopted together or not at all. A side is
   * null when this scan holds no manifest for it, and a side whose manifest a
   * carrier response already carried is adopted from it rather than read again
   * ({@link #carrierDocument}), which is what makes one carrier being the
   * other side's manifest cost no request in either pair order.
   */
  public openManifestPair(
    left: PluginComparisonFileRequest | null,
    right: PluginComparisonFileRequest | null,
  ): Promise<void> {
    this.#dropManifestPair();
    if (this.#pairNeedsNoRequest([left, right])) {
      // Nothing to fetch: each side's manifest is either absent from this scan
      // or a document a carrier response already carried, which is adopted
      // here instead ({@link #carrierDocument}).
      this.leftManifest.value = left === null ? null : this.#carrierDocument(left.filePath);
      this.rightManifest.value = right === null ? null : this.#carrierDocument(right.filePath);
      if (this.leftManifest.value !== null || this.rightManifest.value !== null) {
        this.manifestStatus.value = 'ready';
      }
      return Promise.resolve();
    }
    const requested = this.#manifestRequestVersion;
    // Queued is loading; see {@link open}.
    this.manifestStatus.value = 'loading';
    return this.#run(() => this.#openManifestPairOwned(left, right, requested));
  }

  /** The queued half of {@link openManifestPair}; `requested` is that call's version. */
  async #openManifestPairOwned(
    leftRequest: PluginComparisonFileRequest | null,
    rightRequest: PluginComparisonFileRequest | null,
    requested: number,
  ): Promise<void> {
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#manifestRequestVersion && this.#clientData.epoch() === capturedEpoch;
    if (!owns()) {
      // Superseded while it waited its turn.
      return;
    }
    this.manifestStatus.value = 'loading';
    const left =
      leftRequest === null
        ? null
        : (this.#carrierDocument(leftRequest.filePath) ??
          (await this.#fetchOwnedManifest(leftRequest, owns)));
    if ((leftRequest !== null && left === null) || !owns()) {
      return;
    }
    const right =
      rightRequest === null
        ? null
        : (this.#carrierDocument(rightRequest.filePath) ??
          (await this.#fetchOwnedManifest(rightRequest, owns)));
    if ((rightRequest !== null && right === null) || !owns()) {
      return;
    }
    this.leftManifest.value = left;
    this.rightManifest.value = right;
    this.manifestStatus.value = 'ready';
  }

  /** Drops the manifest pair without touching the declarations. */
  public closeManifestPair(): void {
    this.#dropManifestPair();
  }

  /**
   * Fetches one side's manifest and settles every non-adopted outcome into
   * this pair's own status, exactly as {@link #fetchOwnedFile} does for the
   * selected file's.
   */
  async #fetchOwnedManifest(
    request: PluginComparisonFileRequest,
    owns: () => boolean,
  ): Promise<PluginFileDetailDto | null> {
    // A plugin's own manifest is one of the files it ships, so it is read
    // through the plugin's own function for the reason {@link #fetchOwnedFile}
    // gives.
    const outcome = await this.#client.fetchPluginFileDetail({
      ...request.carrier,
      filePath: request.filePath,
    });
    switch (outcome.kind) {
      case 'adopted':
        return owns() ? outcome.detail : null;
      case 'rejected':
        if (owns()) {
          this.manifestStatus.value = 'stale';
          void this.#refreshFreshly();
        }
        return null;
      case 'failed':
        if (outcome.fatal) {
          this.#reportFatalFailure(outcome.error);
        } else if (owns()) {
          this.manifestErrorMessage.value = outcome.error.message;
          this.manifestStatus.value = 'failed';
        }
        return null;
      case 'newer-generation':
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.manifestStatus.value = 'idle';
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

  /**
   * Fetches one side's copy of the selected file and settles every
   * non-adopted outcome, exactly as {@link #fetchOwned} does for a carrier —
   * into this pair's own status, which is what keeps a file's outcome off the
   * declaration comparison.
   */
  async #fetchOwnedFile(
    request: PluginComparisonFileRequest,
    owns: () => boolean,
  ): Promise<PluginFileDetailDto | null> {
    // The plugin's own function: a file below a plugin root is read as that
    // plugin's, and the generic one answers for the row whose subject a file is
    // — which a census-listed file has none of, and an independently admitted
    // one has for another kind (contracts/http-api.md
    // § get-plugin-file-detail).
    const outcome = await this.#client.fetchPluginFileDetail({
      ...request.carrier,
      filePath: request.filePath,
    });
    switch (outcome.kind) {
      case 'adopted':
        return owns() ? outcome.detail : null;
      case 'rejected':
        if (owns()) {
          this.fileStatus.value = 'stale';
          void this.#refreshFreshly();
        }
        return null;
      case 'failed':
        if (outcome.fatal) {
          this.#reportFatalFailure(outcome.error);
        } else if (owns()) {
          this.fileErrorMessage.value = outcome.error.message;
          this.fileStatus.value = 'failed';
        }
        return null;
      case 'newer-generation':
        if (owns()) {
          await this.#refreshFreshly();
          if (owns()) {
            this.fileStatus.value = 'idle';
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

  /**
   * Fetches one side and settles every non-adopted outcome, so no two call
   * sites can drift into different handling. `owns` is the calling open's
   * ownership check: every write happens behind it, except the fatal report,
   * which is true of the session rather than of this request.
   */
  async #fetchOwned(
    pluginName: string,
    side: ComparisonSide,
    tool: SupportedTool,
    owns: () => boolean,
  ): Promise<PluginCarrierDetailDto | null> {
    // The product whose reading this side is: a file several products
    // recognize is one carrier to this surface, so which of them answers is
    // named by the page that opens the pair rather than left to whichever
    // recognition a projection reached first (`api-types.ts`
    // § PluginCarrierDetailParams.tool).
    const outcome = await this.#client.fetchPluginCarrierDetail({
      source: side.source,
      sourceRelativePath: side.sourceRelativePath,
      pluginName,
      tool,
    });
    switch (outcome.kind) {
      case 'adopted':
        return owns() ? outcome.detail : null;
      case 'rejected':
        // The one rejection a plugin carrier-detail request can receive: no
        // current generation holds a plugin recognition at the path. Shown as
        // its own state, and the session is refetched exactly as the detail
        // route does.
        if (owns()) {
          this.status.value = 'stale';
          void this.#refreshFreshly();
        }
        return null;
      case 'failed':
        if (outcome.fatal) {
          this.#reportFatalFailure(outcome.error);
        } else if (owns()) {
          this.errorMessage.value = outcome.error.message;
          this.status.value = 'failed';
        }
        return null;
      case 'newer-generation':
        // The host has committed past this page's adopted snapshot; adopting
        // the newer snapshot drops this open through the generation change,
        // and the compare route re-requests the same pair under it.
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
