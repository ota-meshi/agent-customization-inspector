import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

import type { BigIntStats } from 'node:fs';

export interface FileIdentity {
  readonly device: bigint;
  readonly inode: bigint;
}

const identityOf = (stats: BigIntStats): FileIdentity => ({
  device: stats.dev,
  inode: stats.ino,
});

export const hasSameFileIdentity = (left: FileIdentity, right: FileIdentity): boolean =>
  left.device === right.device && left.inode === right.inode;

/**
 * Internal filesystem authority. Its absolute paths are deliberately private
 * fields and it serializes to undefined so it cannot be mixed into a public
 * snapshot by spreading or JSON serialization.
 */
export class RootBoundary {
  readonly #rootPath: string;
  readonly #canonicalRoot: string;
  readonly #identity: FileIdentity;

  constructor(rootPath: string, canonicalRoot: string, identity: FileIdentity) {
    this.#rootPath = rootPath;
    this.#canonicalRoot = canonicalRoot;
    this.#identity = identity;
  }

  /** Internal use only. Never place this value in a diagnostic or model. */
  get rootPath(): string {
    return this.#rootPath;
  }

  /** Internal use only. Never place this value in a diagnostic or model. */
  get canonicalRoot(): string {
    return this.#canonicalRoot;
  }

  get identity(): FileIdentity {
    return this.#identity;
  }

  toJSON(): undefined {
    return undefined;
  }
}

export type RootBoundaryFailureReason =
  'aborted' | 'inaccessible' | 'not-directory' | 'symlink-root' | 'root-changed';

export type RootBoundaryResult =
  | { readonly ok: true; readonly boundary: RootBoundary }
  | { readonly ok: false; readonly reason: RootBoundaryFailureReason };

/**
 * Creates a canonical authority for a scan root without exposing raw
 * filesystem errors. A symlink or junction supplied as the root is rejected.
 */
export async function createRootBoundary(
  rootPath: string,
  signal?: AbortSignal,
): Promise<RootBoundaryResult> {
  if (signal?.aborted) {
    return { ok: false, reason: 'aborted' };
  }

  const absoluteRoot = path.resolve(rootPath);

  try {
    const initial = await lstat(absoluteRoot, { bigint: true });
    signal?.throwIfAborted();

    if (initial.isSymbolicLink()) {
      return { ok: false, reason: 'symlink-root' };
    }
    if (!initial.isDirectory()) {
      return { ok: false, reason: 'not-directory' };
    }

    const canonicalRoot = await realpath(absoluteRoot);
    signal?.throwIfAborted();
    const canonicalStats = await lstat(canonicalRoot, { bigint: true });
    const finalRoot = await lstat(absoluteRoot, { bigint: true });

    if (
      canonicalStats.isSymbolicLink() ||
      !canonicalStats.isDirectory() ||
      finalRoot.isSymbolicLink() ||
      !finalRoot.isDirectory() ||
      !hasSameFileIdentity(identityOf(initial), identityOf(canonicalStats)) ||
      !hasSameFileIdentity(identityOf(initial), identityOf(finalRoot))
    ) {
      return { ok: false, reason: 'root-changed' };
    }

    return {
      ok: true,
      boundary: new RootBoundary(absoluteRoot, canonicalRoot, identityOf(canonicalStats)),
    };
  } catch (error: unknown) {
    if (signal?.aborted || isAbortError(error)) {
      return { ok: false, reason: 'aborted' };
    }
    return { ok: false, reason: 'inaccessible' };
  }
}

interface PathSemantics {
  readonly sep: string;
  isAbsolute(path: string): boolean;
  relative(from: string, to: string): string;
}

/**
 * Component-aware containment check. Unlike string prefix checks, sibling
 * roots such as /work/repo-other are not accepted for /work/repo.
 */
export function isPathInsideRoot(
  canonicalRoot: string,
  canonicalCandidate: string,
  semantics: PathSemantics = path,
): boolean {
  if (!semantics.isAbsolute(canonicalRoot) || !semantics.isAbsolute(canonicalCandidate)) {
    return false;
  }

  const relative = semantics.relative(canonicalRoot, canonicalCandidate);
  return (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith(`..${semantics.sep}`) &&
      !semantics.isAbsolute(relative))
  );
}

export type BoundaryEntryFailureReason =
  'aborted' | 'inaccessible' | 'missing' | 'outside-root' | 'root-changed' | 'symlink';

export type BoundaryEntryResult =
  | {
      readonly ok: true;
      readonly canonicalPath: string;
      readonly stats: BigIntStats;
      readonly identity: FileIdentity;
    }
  | { readonly ok: false; readonly reason: BoundaryEntryFailureReason };

/**
 * Checks an internal absolute candidate with lstat, realpath containment, and
 * identity verification. It never follows a candidate that is itself a
 * symlink and never returns raw filesystem failures.
 */
export async function inspectBoundaryEntry(
  boundary: RootBoundary,
  absoluteCandidate: string,
  signal?: AbortSignal,
): Promise<BoundaryEntryResult> {
  if (signal?.aborted) {
    return { ok: false, reason: 'aborted' };
  }
  if (
    !isPathInsideRoot(boundary.rootPath, absoluteCandidate) &&
    !isPathInsideRoot(boundary.canonicalRoot, absoluteCandidate)
  ) {
    return { ok: false, reason: 'outside-root' };
  }

  try {
    const initial = await lstat(absoluteCandidate, { bigint: true });
    signal?.throwIfAborted();
    if (initial.isSymbolicLink()) {
      return { ok: false, reason: 'symlink' };
    }

    const canonicalPath = await realpath(absoluteCandidate);
    signal?.throwIfAborted();
    if (!isPathInsideRoot(boundary.canonicalRoot, canonicalPath)) {
      return { ok: false, reason: 'outside-root' };
    }

    const canonicalStats = await lstat(canonicalPath, { bigint: true });
    const finalCandidate = await lstat(absoluteCandidate, { bigint: true });
    if (
      canonicalStats.isSymbolicLink() ||
      finalCandidate.isSymbolicLink() ||
      !hasSameFileIdentity(identityOf(initial), identityOf(canonicalStats)) ||
      !hasSameFileIdentity(identityOf(initial), identityOf(finalCandidate))
    ) {
      return { ok: false, reason: 'root-changed' };
    }

    return {
      ok: true,
      canonicalPath,
      stats: canonicalStats,
      identity: identityOf(canonicalStats),
    };
  } catch (error: unknown) {
    if (signal?.aborted || isAbortError(error)) {
      return { ok: false, reason: 'aborted' };
    }
    if (isMissingError(error)) {
      return { ok: false, reason: 'missing' };
    }
    return { ok: false, reason: 'inaccessible' };
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const isMissingError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error.code === 'ENOENT' || error.code === 'ENOTDIR');
