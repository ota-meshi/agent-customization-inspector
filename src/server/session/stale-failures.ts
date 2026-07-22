// Session-owned explicit-rescan stale-failure overlay. One current entry may
// exist per published Source; the derived snapshot state is stale exactly
// while any entry remains.

/**
 * What explains a stale entry: a deterministic Diagnostic or the failed
 * request's error message (FR-030).
 */
export type StaleFailureRef =
  | { readonly kind: 'diagnostic'; readonly diagnosticId: string }
  | { readonly kind: 'error'; readonly message: string };

/**
 * One Source's explicit-rescan stale overlay; the retained snapshot stays
 * visible while this entry exists.
 */
export interface StaleSourceFailure {
  /** The Source whose explicit rescan failed. */
  readonly sourceId: string;
  /** What explains the failure: a Diagnostic or the failed request's error. */
  readonly failureRef: StaleFailureRef;
  /** UTC timestamp of the terminal failure. */
  readonly failedAt: string;
  /** The owning sequence's generation that stays visible as stale (FR-030). */
  readonly baseGeneration: number;
}

/**
 * Creates or replaces only the entry for the failing Source. Entries for
 * different Sources coexist so one Source's fatal rescan never hides or
 * clears another Source's failure; sorting by sourceId keeps the DTO order
 * deterministic across commits.
 */
export function upsertStaleFailure(
  failures: readonly StaleSourceFailure[],
  entry: StaleSourceFailure,
): StaleSourceFailure[] {
  const rest = failures.filter((failure) => failure.sourceId !== entry.sourceId);
  rest.push(entry);
  rest.sort((left, right) =>
    left.sourceId < right.sourceId ? -1 : left.sourceId > right.sourceId ? 1 : 0,
  );
  return rest;
}

/** Clears entries only for the Sources a commit successfully refreshed. */
export function clearStaleFailures(
  failures: readonly StaleSourceFailure[],
  scannedSourceIds: readonly string[],
): StaleSourceFailure[] {
  return failures.filter((failure) => !scannedSourceIds.includes(failure.sourceId));
}

/** The snapshot is stale exactly while any stale entry remains (FR-030). */
export function deriveSnapshotState(
  failures: readonly StaleSourceFailure[],
): 'current' | 'stale-after-fatal-rescan' {
  return failures.length === 0 ? 'current' : 'stale-after-fatal-rescan';
}
