// The one shared full client-data purge for the browser SPA (T049,
// contracts/http-api.md § Concurrency and lifecycle, FR-042).
//
// This module exists so there is exactly one code path that can decide "the
// client has lost confidence in its session, discard everything it holds".
// Every owner of client-held session data registers its own synchronous
// clearing here instead of being enumerated by the purge, and the purge
// increments `clientDataEpoch` so a response captured under the old epoch
// can never repopulate state even if its bytes arrive later.
//
// It is deliberately the dependency leaf of `src/app/session/`: it imports
// nothing, so the API client and view state can both observe the same epoch
// without a module cycle.

/**
 * Why the purge ran. Each member names a documented trigger
 * (contracts/http-api.md § Concurrency and lifecycle, FR-042).
 *
 * The pre-disable purge the Global disable command runs before sending is
 * `global-disable-request` (`view-state.ts` § requestGlobalDisable): nothing
 * this session held may survive the decision to disable, so the purge
 * precedes the request rather than following its outcome (FR-042).
 */
export type PurgeReason =
  /** A response reported a greater server-owned Global content epoch. */
  | 'global-content-epoch-advanced'
  /** The browser is about to send `disable-global` and purges first (FR-042). */
  | 'global-disable-request'
  /** A response reported a non-null Global disable fence. */
  | 'global-disable-fence'
  /** The host answered with an identity different from the adopted session. */
  | 'session-identity-lost'
  /** The transport or session protocol failed for the current RPC call. */
  | 'channel-failure';

/**
 * One owner's synchronous clearing of the client data it holds. Registered
 * here so the purge stays a single call site: current owners such as the
 * session snapshot, plus inventory, Sources, files, diagnostics, and filters
 * as their owners are added, each clear themselves rather than being
 * enumerated here.
 */
export type ClientDataDisposer = (reason: PurgeReason) => void;

/**
 * The client-data epoch plus the one shared full purge. Injected into the
 * API client as its `ClientDataGuard`, so both sides observe the same epoch.
 *
 * Purging is synchronous by construction: every disposer runs before the
 * epoch increments and before control returns, so no caller can interleave a
 * render between "state cleared" and "epoch advanced".
 */
export class ClientDataPurge {
  /** The current epoch value; advanced only by {@link purge}. */
  #currentEpoch = 0;

  /**
   * The registered owners' clearings. Insertion-ordered so wiring can put
   * request abortion first: outstanding requests are superseded before the
   * state they would have populated is cleared.
   */
  readonly #disposers = new Set<ClientDataDisposer>();

  /** The monotonically increasing `clientDataEpoch`; only the purge advances it. */
  public epoch(): number {
    return this.#currentEpoch;
  }

  /** Registers one owner's clearing; returns its unregister function. */
  public register(disposer: ClientDataDisposer): () => void {
    this.#disposers.add(disposer);
    return () => {
      this.#disposers.delete(disposer);
    };
  }

  /** Runs every registered disposer synchronously, then increments the epoch. */
  public purge(reason: PurgeReason): void {
    // A disposer clears state this module's own owners hold; it performs no
    // I/O and cannot fail for a reason outside the program. So there is no
    // try/catch: one that threw would be a bug in an owner, and letting it
    // reach the caller is how that bug is found. Catching it here would only
    // hide it, and a purge that continued past it would leave the client
    // holding state it has already decided to discard.
    //
    // Not a `DisposableStack`: it disposes once, in reverse registration
    // order, and offers no way to unregister. This purge runs repeatedly,
    // runs in registration order so request abortion precedes the state
    // those requests would repopulate, and its owners come and go with the
    // components holding them.
    for (const disposer of this.#disposers) {
      disposer(reason);
    }
    // Incremented last: a disposer that (directly or indirectly) reads the
    // epoch still sees the value the purged responses were captured under.
    this.#currentEpoch += 1;
  }
}
