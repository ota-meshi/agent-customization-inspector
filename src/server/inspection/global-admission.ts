// Admission of one proposed User-Global root (FR-013, FR-014,
// contracts/http-api.md § enable-global).
//
// This module is the only place a consented Global root is touched before its
// scan, and that placement is the point: QR-003 reserves every filesystem
// operation to the inspection module, so the host's enable orchestration
// submits the frozen root here and consumes only the typed outcome below. It
// never calls `node:fs`, and it never inspects or converts a Node error code —
// what a `EACCES` on a home directory means is this module's decision, made
// once, for both scopes.
//
// Admission answers one question: is this exact string a directory this
// process can read? A root that is missing or is not a readable directory is
// that member's own deterministic rejection, which leaves the other members
// free to commit (FR-014). Anything else is not confined to one member and
// throws, so the whole fixed-four transaction aborts and the request reports
// its real error.
//
// It is deliberately not a permission check on the files below the root.
// Consent authorizes the customization files the compiled plan names, and
// whether each of those is readable is that file's own outcome during the
// scan — a Diagnostic, not an admission failure.
import { access, fsConstants, stat } from './fs-io';
import { isRootEnumerationFailure } from './traversal';

/**
 * The typed outcome of submitting one proposed Global root
 * (data-model.md § GlobalToolControl `failureCode`).
 *
 * There is no `admitted`-with-warning member and no partial state: a root
 * either becomes this tool's boundary or is rejected with the one closed
 * reason a root can be rejected for.
 */
export type GlobalRootAdmission =
  | {
      /** The root is a directory this process can read; it may become a boundary. */
      readonly kind: 'admitted';
    }
  | {
      /** The root is missing or is not a readable directory; this tool alone fails. */
      readonly kind: 'rejected';
      /** The one closed reason a proposed root can be rejected for. */
      readonly reason: 'root-unreadable';
    };

/**
 * Submits one exact frozen root for admission: one `stat` for whether it is a
 * directory, then one `access` for whether this process may read it.
 *
 * Two calls rather than one, because a `stat` alone answers the wrong
 * question. A directory whose mode denies this process is still a directory,
 * so `stat` admits it and the unreadability then surfaces as each named
 * target's own read failure — which publishes a Source for a root FR-013's
 * closed model says creates none. `access` answers the question the model
 * asks, and neither call lists anything: the Global root itself is never
 * enumerated — its plans probe exact targets and walk only the fixed subtrees
 * the selectors name (FR-015 through FR-018). A reader who consents to having
 * the contracted files read has not consented to having their configuration
 * directory listed.
 *
 * `R_OK | X_OK`, not `X_OK` alone. Search permission is all the exact-target
 * probes actually need, so a search-only directory would be readable for part
 * of what consent covers — and is refused anyway, because the contract's
 * unit is a readable directory and a partial capability is not one. Refusing a
 * root the product could have partly read is the safe direction; the reader is
 * told the directory cannot be read and can change its mode.
 *
 * `access` reports the real UID's permission, so a mode it approves can still
 * be denied at the open — an ACL, a read-only mount, a file removed in
 * between. Those remain each target's own file outcome during the scan, as
 * every other read failure does. This narrows what reaches a scan; it does not
 * promise the scan will succeed.
 *
 * The argument is the retained raw `lexicalRoot`, never the escaped
 * `displayRoot`: the display value is one-way presentation and is never
 * decoded back into a path.
 */
export async function admitGlobalRoot(root: string): Promise<GlobalRootAdmission> {
  try {
    if (!(await stat(root)).isDirectory()) {
      // A regular file, a socket, or a device at the proposed path is not a
      // home directory: the same non-directory outcome the Repository root
      // check gives, and this tool's own rejection.
      return { kind: 'rejected', reason: 'root-unreadable' };
    }
    await access(root, fsConstants.R_OK | fsConstants.X_OK);
  } catch (error) {
    if (isRootEnumerationFailure(error, root)) {
      return { kind: 'rejected', reason: 'root-unreadable' };
    }
    // `EMFILE`, `ENOMEM`, and anything else about the process rather than this
    // root: not confined to one tool, so it aborts the whole transaction and
    // reaches the request boundary as its real error (contracts/http-api.md
    // § enable-global).
    throw error;
  }
  return { kind: 'admitted' };
}
