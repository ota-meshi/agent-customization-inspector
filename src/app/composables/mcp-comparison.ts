// The MCP comparison view state for the browser SPA (T399; FR-011, FR-030,
// data-model.md § BrowserState · ComparisonSelection).
//
// This surface is the MCP kind's, not a shared one: comparison is
// kind-specific with no shared module (spec.md § Clarifications Session
// 2026-08-14), and this kind's comparison unit is the inventory's own row
// unit — one declared server name (data-model.md § Inventory unit). The two
// sides are that name's declarations in two of its row's carriers, each
// serialized to one canonical JSON document and diffed in Monaco
// (research.md § 7) — never the carriers' own
// source, which no carrier shows anywhere (FR-007). The pair is row-owned,
// like every comparison surface's: the compare route accepts only two
// carriers the named row holds together, and that row's carriers are what
// its pickers move the sides among.
//
// The comparison selection is the route's:
// `/mcp/compare?name=<declared name>&left=<path>&right=<path>` — the row's
// name in the carriers' own spelling and the two carriers by their
// Source-relative Paths, the identities the inventory and the detail route
// use (FR-030) — and a selection the model does not express is reported by
// the page, never opened (FR-011). Only explicit carriers resolve: any
// other path answers `stale-resource`, which this view reports as the
// stale state.
//
// What this class holds is the open view: the two ordinary
// `get-mcp-carrier-detail` loads of carriers the client already lists. There
// is no compare API, because a comparison is a read of committed details,
// not a new resource. The view is generation-scoped (FR-030), and the
// central client-data purge (FR-027) clears it the same way — including the
// two Monaco models holding the serialized declarations, whose disposers
// the mounting component registers here.
//
// Construction performs no I/O, and the state is owned by the one
// `SessionViewState`: a second instance would race the first for the same
// request tokens.
import { shallowRef } from 'vue';
import { encodeMcpServerRouteName } from '../components/mcp-detail-route';
import type { SessionApiClient } from '../session/api-client';
import type { ClientDataPurge } from '../session/client-data';
import type { McpCarrierDetailDto } from '../../shared/api-types';

/**
 * Where the one open comparison stands:
 *  - 'idle'    nothing is open, or the open pair was cleaned up; with a
 *              pair still named by the route this is the recoverable state
 *              whose retry re-requests it
 *  - 'loading' the pair's two detail requests are in flight
 *  - 'ready'   both details were adopted and may be rendered
 *  - 'stale'   a named path resolves to no current-generation carrier
 *  - 'failed'  a request failed ordinarily; the real message is kept
 *
 * No same-path or unreadable state exists, because no caller can produce
 * one: the compare route rejects a link naming one carrier twice before it
 * opens anything, and a named row's carriers are always parsed — a failed
 * carrier publishes no name, and a binary carrier is diagnostic-only — so
 * their text was read (api-types.ts § McpDeclarationDto.parseStatus).
 */
export type McpComparisonViewStatus =
  /** Nothing is open, or the open pair was cleaned up. */
  | 'idle'
  /** The pair's two detail requests are in flight. */
  | 'loading'
  /** Both details were adopted and are rendered. */
  | 'ready'
  /** A named path resolves to no current-generation carrier. */
  | 'stale'
  /** A request failed ordinarily; see {@link McpComparisonState.errorMessage}. */
  | 'failed';

/**
 * The MCP comparison route of one compared selection: `name` is the
 * declared server name whose row owns the comparison, in the carriers' own
 * spelling (FR-007), and `left` and `right` are the two carriers'
 * Source-relative Paths — the identities the inventory rows and the detail
 * route use (FR-030). A module function beside the state class so every
 * surface that builds the link — the inventory row's and detail page's
 * entry links, and the compare route's own pickers — builds the same URL.
 *
 * The name passes through {@link encodeMcpServerRouteName}, exactly as the
 * declaration detail's `?server=` does: a declared name is not always
 * well-formed UTF-16 — strict JSON resolves an authored `"\uD800"` escape
 * to a lone surrogate — and the router's own query encoding throws
 * `URIError` on one, which would surface inside the row computed that
 * builds these links. The compare route decodes with
 * `decodeMcpServerRouteName`, so every declared name round-trips.
 */
export function mcpComparisonRouteFor(
  name: string,
  left: string,
  right: string,
): {
  readonly path: string;
  readonly query: { readonly name: string; readonly left: string; readonly right: string };
} {
  return { path: '/mcp/compare', query: { name: encodeMcpServerRouteName(name), left, right } };
}

/** Construction inputs for {@link McpComparisonState}. */
export interface McpComparisonStateOptions {
  /** The guarded API client the pair's detail loads go through. */
  readonly client: SessionApiClient;
  /** The shared purge: the epoch guard, and where this state registers its clearing. */
  readonly clientData: ClientDataPurge;
  /**
   * Waits out any in-flight session fetch, then issues one that starts now.
   * Called when the host answers a detail from a generation newer than the
   * adopted snapshot (`SessionApiClient.fetchMcpCarrierDetail`
   * § newer-generation).
   */
  readonly refreshFreshly: () => Promise<void>;
  /**
   * Reports a fatal transport failure to the session owner; see the
   * instruction comparison's option of the same name.
   */
  readonly reportFatalFailure: (error: Error) => void;
}

/**
 * The one open MCP comparison view (FR-011). Every public member has a
 * render site or caller in the compare route; nothing is exposed only so a
 * test can read it.
 */
export class McpComparisonState {
  /** The guarded API client the two detail loads go through. */
  readonly #client: SessionApiClient;

  /** The shared purge; the epoch source for every settlement guard. */
  readonly #clientData: ClientDataPurge;

  /** See {@link McpComparisonStateOptions.refreshFreshly}. */
  readonly #refreshFreshly: () => Promise<void>;

  /** See {@link McpComparisonStateOptions.reportFatalFailure}. */
  readonly #reportFatalFailure: (error: Error) => void;

  /** Where the one open comparison stands; see {@link McpComparisonViewStatus}. */
  public readonly status = shallowRef<McpComparisonViewStatus>('idle');

  /** The first compared carrier's adopted detail. Null outside 'ready'. */
  public readonly leftDetail = shallowRef<McpCarrierDetailDto | null>(null);

  /** The second compared carrier's adopted detail. Null outside 'ready'. */
  public readonly rightDetail = shallowRef<McpCarrierDetailDto | null>(null);

  /**
   * The real error message of the failed detail request retained by the
   * 'failed' status, or null. The compare route shows it beside its retry;
   * a session-level failure stays the shell's to report.
   */
  public readonly errorMessage = shallowRef<string | null>(null);

  /**
   * Counts open requests, so a settlement can tell whether the view still
   * wants what it asked for. A purge, a generation change, a close, and a
   * newer open each advance it; the epoch check covers only the first.
   */
  #requestVersion = 0;

  /**
   * Disposers of component-owned holders of the open comparison's content —
   * the two Monaco models carrying the serialized declarations. Run
   * synchronously by every drop path, because the contract orders dispose
   * before replace (data-model.md § BrowserState), exactly as the skill
   * comparison's registry documents.
   */
  readonly #openContentOwners = new Set<() => void>();

  /** Wires the state and registers its clearing with the shared purge. */
  public constructor(options: McpComparisonStateOptions) {
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
   * returning its unregister function. Exists for the same reason the skill
   * comparison's registry does: the serialized-declaration models are owned
   * by the component that mounted them while the disposal order is this
   * module's contract.
   */
  public registerOpenContentOwner(disposer: () => void): () => void {
    this.#openContentOwners.add(disposer);
    return () => this.#openContentOwners.delete(disposer);
  }

  /**
   * Drops the open view: supersedes any request still in flight, clears the
   * reactive state, and disposes the component-owned content synchronously —
   * the reactive state first and the owned content second, in one
   * synchronous block (data-model.md § BrowserState).
   */
  #dropView(): void {
    this.#requestVersion += 1;
    this.leftDetail.value = null;
    this.rightDetail.value = null;
    this.status.value = 'idle';
    this.errorMessage.value = null;
    for (const disposer of this.#openContentOwners) {
      disposer();
    }
  }

  /**
   * Drops the open view and the models rendering it. Two callers, one
   * cleanup: leaving the compare route
   * (FR-027), and `SessionViewState`'s adoption of a newer committed
   * generation, which invalidates the previous generation's comparison view
   * (FR-030) — the route's watch then re-requests the same pair under the
   * new snapshot.
   */
  public close(): void {
    this.#dropView();
  }

  /**
   * Opens the comparison of two explicit carriers of one named row — the
   * route rejects every other selection before calling this — as two
   * ordinary carrier-detail loads, in order, adopted together or not at all
   * (FR-011). Every write happens behind one ownership check, so the ways an
   * invocation stops owning the view — a purge, a generation change, a
   * close, a newer open — cannot each grow their own handling.
   */
  public async open(leftPath: string, rightPath: string): Promise<void> {
    // The previous pair's content is dropped before anything is requested,
    // so a slow request never leaves one pair's declarations on screen under
    // another pair's paths; this also supersedes any open still in flight.
    this.#dropView();
    const requested = this.#requestVersion;
    const capturedEpoch = this.#clientData.epoch();
    const owns = (): boolean =>
      requested === this.#requestVersion && this.#clientData.epoch() === capturedEpoch;
    this.status.value = 'loading';
    // Sequential rather than concurrent, because the client correlates
    // detail settlements through one request-token family: a second
    // in-flight detail would supersede the first and discard its response
    // (`SessionApiClient` § request tokens).
    const left = await this.#fetchOwned(leftPath, owns);
    if (left === null || !owns()) {
      return;
    }
    const right = await this.#fetchOwned(rightPath, owns);
    if (right === null || !owns()) {
      return;
    }
    // Adopted together: a comparison with one side is not a comparison, and
    // publishing the pair in one synchronous step means no render can see
    // half of it.
    this.leftDetail.value = left;
    this.rightDetail.value = right;
    this.status.value = 'ready';
  }

  /**
   * Fetches one side and settles every non-adopted outcome, so no two call
   * sites can drift into different handling. `owns` is the calling open's
   * ownership check: every write happens behind it, except the fatal report,
   * which is true of the session rather than of this request.
   */
  async #fetchOwned(
    sourceRelativePath: string,
    owns: () => boolean,
  ): Promise<McpCarrierDetailDto | null> {
    const outcome = await this.#client.fetchMcpCarrierDetail(sourceRelativePath);
    switch (outcome.kind) {
      case 'adopted':
        return owns() ? outcome.detail : null;
      case 'rejected':
        // The one rejection a carrier-detail request can receive: no current
        // generation holds an MCP recognition at the path — a path that is
        // not an explicit carrier resolves here too. Shown as its own state, and the session is refetched
        // exactly as the detail route does.
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
