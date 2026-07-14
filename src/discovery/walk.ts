import { opendir } from 'node:fs/promises';
import path from 'node:path';

import type { DiagnosticCollector } from '../core/diagnostics.js';
import { DEFAULT_SCAN_LIMITS, resolveSourceScanLimits, type ScanLimits } from '../core/limits.js';
import type { SourceDescriptor } from '../core/model.js';
import type { DiscoveryEntry } from '../core/registry.js';
import {
  createVirtualPathFromSegments,
  splitPortableRelativePath,
} from '../sources/virtual-path.js';
import {
  createRootBoundary,
  hasSameFileIdentity,
  inspectBoundaryEntry,
  type FileIdentity,
  type RootBoundary,
} from './root-boundary.js';

const DEFAULT_SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.next',
  '.nuxt',
  '.output',
  '.svn',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'target',
]);

export interface FileSnapshot {
  readonly identity: FileIdentity;
  readonly byteLength: bigint;
  readonly modifiedNanoseconds: bigint;
  readonly changedNanoseconds: bigint;
}

/**
 * Private authority used only by discovery and core reads. Absolute paths are
 * kept in private fields and disappear under JSON serialization.
 */
export class PrivateFileLocator {
  readonly #boundary: RootBoundary;
  readonly #absolutePath: string;
  readonly #snapshot: FileSnapshot;

  constructor(boundary: RootBoundary, absolutePath: string, snapshot: FileSnapshot) {
    this.#boundary = boundary;
    this.#absolutePath = absolutePath;
    this.#snapshot = snapshot;
  }

  /** Internal use only. Never place this value in a diagnostic or model. */
  get boundary(): RootBoundary {
    return this.#boundary;
  }

  /** Internal use only. Never place this value in a diagnostic or model. */
  get absolutePath(): string {
    return this.#absolutePath;
  }

  get snapshot(): FileSnapshot {
    return this.#snapshot;
  }

  toJSON(): undefined {
    return undefined;
  }
}

export interface DiscoveredFile {
  /** Safe data that may cross the adapter boundary. */
  readonly entry: DiscoveryEntry;
  /** Filesystem authority that must remain inside discovery/core. */
  readonly locator: PrivateFileLocator;
}

export interface WalkDirectoryOptions {
  readonly rootPath: string;
  /** Prevalidated boundary reused by a trusted multi-candidate source scan. */
  readonly boundary?: RootBoundary;
  readonly source: SourceDescriptor;
  readonly diagnostics: DiagnosticCollector;
  readonly limits?: ScanLimits;
  readonly signal?: AbortSignal;
  readonly skippedDirectoryNames?: ReadonlySet<string>;
  /** Optional trusted source-relative directory at which traversal begins. */
  readonly startRelativePath?: string;
  /** Trusted metadata-only filter applied before file-size diagnostics/locators. */
  readonly includeFile?: (path: {
    readonly relativePath: string;
    readonly basename: string;
    readonly depth: number;
  }) => boolean;
}

export interface WalkDirectoryResult {
  readonly files: readonly DiscoveredFile[];
  readonly directoryEntriesVisited: number;
  readonly complete: boolean;
  readonly aborted: boolean;
}

export interface DiscoverExactFileOptions {
  readonly rootPath: string;
  /** Prevalidated boundary reused by a trusted multi-candidate source scan. */
  readonly boundary?: RootBoundary;
  readonly relativePath: string;
  readonly source: SourceDescriptor;
  readonly diagnostics: DiagnosticCollector;
  readonly limits?: ScanLimits;
  readonly signal?: AbortSignal;
}

export interface DiscoverExactFileResult {
  readonly file?: DiscoveredFile;
  readonly directoryEntriesVisited: number;
  readonly complete: boolean;
  readonly aborted: boolean;
}

interface PendingDirectory {
  readonly absolutePath: string;
  readonly segments: readonly string[];
  readonly depth: number;
  readonly identity: FileIdentity;
}

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const safeVirtualPath = (virtualBase: string, segments: readonly string[]): string | undefined =>
  segments.length === 0 ? undefined : tryCreatePublicPath(virtualBase, segments)?.virtualPath;

const tryCreatePublicPath = (
  virtualBase: string,
  segments: readonly string[],
): ReturnType<typeof createVirtualPathFromSegments> | undefined => {
  try {
    return createVirtualPathFromSegments(virtualBase, segments);
  } catch {
    return undefined;
  }
};

const revalidateRootBoundary = async (
  boundary: RootBoundary,
  signal?: AbortSignal,
): Promise<'ok' | 'aborted' | 'changed'> => {
  const inspected = await inspectBoundaryEntry(boundary, boundary.rootPath, signal);
  if (!inspected.ok) {
    return inspected.reason === 'aborted' ? 'aborted' : 'changed';
  }
  return inspected.stats.isDirectory() && hasSameFileIdentity(boundary.identity, inspected.identity)
    ? 'ok'
    : 'changed';
};

const boundaryMatchesRoot = (boundary: RootBoundary, rootPath: string): boolean => {
  const absoluteRoot = path.resolve(rootPath);
  return absoluteRoot === boundary.rootPath || absoluteRoot === boundary.canonicalRoot;
};

/**
 * Iteratively walks one canonical source root. Every entry is lstat'ed,
 * symlinks are skipped, and entry/depth/file limits are enforced before an
 * item becomes a discovery candidate.
 */
export async function walkDirectory(options: WalkDirectoryOptions): Promise<WalkDirectoryResult> {
  const limits = resolveSourceScanLimits(
    options.limits ?? DEFAULT_SCAN_LIMITS,
    options.source.layer,
  );
  const skippedDirectories = options.skippedDirectoryNames ?? DEFAULT_SKIPPED_DIRECTORIES;
  if (options.boundary !== undefined && !boundaryMatchesRoot(options.boundary, options.rootPath)) {
    options.diagnostics.add({
      code: 'DISCOVERY_ROOT_BOUNDARY_MISMATCH',
      severity: 'error',
      message: 'A discovery root did not match its canonical boundary and was rejected.',
    });
    return { files: [], directoryEntriesVisited: 0, complete: false, aborted: false };
  }
  let startSegments: readonly string[];
  try {
    startSegments =
      options.startRelativePath === undefined || options.startRelativePath === '.'
        ? []
        : splitPortableRelativePath(options.startRelativePath);
  } catch {
    options.diagnostics.add({
      code: 'DISCOVERY_INVALID_RELATIVE_PATH',
      severity: 'warning',
      message: 'A configured discovery path was invalid and was skipped.',
    });
    return { files: [], directoryEntriesVisited: 0, complete: false, aborted: false };
  }
  const boundaryResult =
    options.boundary === undefined
      ? await createRootBoundary(options.rootPath, options.signal)
      : ({ ok: true, boundary: options.boundary } as const);

  if (!boundaryResult.ok) {
    if (boundaryResult.reason !== 'aborted') {
      options.diagnostics.add({
        code: rootDiagnosticCode(boundaryResult.reason),
        severity: 'error',
        message: rootDiagnosticMessage(boundaryResult.reason),
      });
    }
    return {
      files: [],
      directoryEntriesVisited: 0,
      complete: false,
      aborted: boundaryResult.reason === 'aborted',
    };
  }

  const boundary = boundaryResult.boundary;
  const rootState = await revalidateRootBoundary(boundary, options.signal);
  if (rootState !== 'ok') {
    if (rootState === 'changed') {
      options.diagnostics.add({
        code: 'DISCOVERY_ROOT_CHANGED',
        severity: 'error',
        message: 'The selected source root changed during validation.',
      });
    }
    return {
      files: [],
      directoryEntriesVisited: 0,
      complete: false,
      aborted: rootState === 'aborted',
    };
  }
  let directoryEntriesVisited = 0;
  let startAbsolutePath = boundary.canonicalRoot;
  let startIdentity = boundary.identity;

  for (let index = 0; index < startSegments.length; index += 1) {
    if (options.signal?.aborted) {
      return {
        files: [],
        directoryEntriesVisited,
        complete: false,
        aborted: true,
      };
    }
    if (directoryEntriesVisited >= limits.maxDirectoryEntries) {
      options.diagnostics.add({
        code: 'DISCOVERY_ENTRY_LIMIT_REACHED',
        severity: 'warning',
        message: 'The source directory-entry limit was reached.',
      });
      return {
        files: [],
        directoryEntriesVisited,
        complete: false,
        aborted: false,
      };
    }

    directoryEntriesVisited += 1;
    const prefix = startSegments.slice(0, index + 1);
    const publicPath = tryCreatePublicPath(options.source.virtualBase, prefix);
    if (publicPath === undefined) {
      options.diagnostics.add({
        code: 'DISCOVERY_PUBLIC_PATH_LIMIT_REACHED',
        severity: 'warning',
        message: 'A configured path exceeded the public path limit and was skipped.',
      });
      return {
        files: [],
        directoryEntriesVisited,
        complete: false,
        aborted: false,
      };
    }

    const inspected = await inspectBoundaryEntry(
      boundary,
      path.join(startAbsolutePath, startSegments[index]!),
      options.signal,
    );
    if (!inspected.ok) {
      if (inspected.reason === 'missing') {
        return {
          files: [],
          directoryEntriesVisited,
          complete: true,
          aborted: false,
        };
      }
      if (inspected.reason === 'aborted') {
        return {
          files: [],
          directoryEntriesVisited,
          complete: false,
          aborted: true,
        };
      }
      options.diagnostics.add({
        code: entryDiagnosticCode(inspected.reason),
        severity: inspected.reason === 'outside-root' ? 'error' : 'warning',
        message: entryDiagnosticMessage(inspected.reason),
        virtualPath: publicPath.virtualPath,
      });
      return {
        files: [],
        directoryEntriesVisited,
        complete: false,
        aborted: false,
      };
    }
    if (!inspected.stats.isDirectory()) {
      options.diagnostics.add({
        code: 'DISCOVERY_EXPECTED_DIRECTORY',
        severity: 'warning',
        message: 'A configured discovery directory was not a directory and was skipped.',
        virtualPath: publicPath.virtualPath,
      });
      return {
        files: [],
        directoryEntriesVisited,
        complete: false,
        aborted: false,
      };
    }

    startAbsolutePath = inspected.canonicalPath;
    startIdentity = inspected.identity;
  }

  const pending: PendingDirectory[] = [
    {
      absolutePath: startAbsolutePath,
      segments: startSegments,
      depth: 0,
      identity: startIdentity,
    },
  ];
  const files: DiscoveredFile[] = [];
  let complete = true;
  let aborted = false;
  let entryLimitReached = false;

  while (pending.length > 0 && !entryLimitReached) {
    if (options.signal?.aborted) {
      aborted = true;
      complete = false;
      break;
    }

    const directory = pending.pop()!;
    const children: Array<{ name: string }> = [];

    const inspectedDirectory = await inspectBoundaryEntry(
      boundary,
      directory.absolutePath,
      options.signal,
    );
    if (
      !inspectedDirectory.ok ||
      !inspectedDirectory.stats.isDirectory() ||
      !hasSameFileIdentity(directory.identity, inspectedDirectory.identity)
    ) {
      if (!inspectedDirectory.ok && inspectedDirectory.reason === 'aborted') {
        aborted = true;
        complete = false;
        break;
      }

      complete = false;
      const virtualPath = safeVirtualPath(options.source.virtualBase, directory.segments);
      options.diagnostics.add({
        code: 'DISCOVERY_DIRECTORY_CHANGED',
        severity: 'warning',
        message: 'A directory changed during traversal and was skipped.',
        ...(virtualPath === undefined ? {} : { virtualPath }),
      });
      continue;
    }

    try {
      // Node's public Dir API exposes neither a no-follow open nor fstat. Revalidate
      // the path identity immediately after opening and after listing; failed child
      // validation reports only the already-public parent path, never its basename.
      const handle = await opendir(inspectedDirectory.canonicalPath);
      try {
        const afterOpen = await inspectBoundaryEntry(
          boundary,
          directory.absolutePath,
          options.signal,
        );
        if (
          !afterOpen.ok ||
          !afterOpen.stats.isDirectory() ||
          !hasSameFileIdentity(directory.identity, afterOpen.identity)
        ) {
          if (!afterOpen.ok && afterOpen.reason === 'aborted') {
            aborted = true;
            complete = false;
            break;
          }
          complete = false;
          const virtualPath = safeVirtualPath(options.source.virtualBase, directory.segments);
          options.diagnostics.add({
            code: 'DISCOVERY_DIRECTORY_CHANGED',
            severity: 'warning',
            message: 'A directory changed while it was being opened and was skipped.',
            ...(virtualPath === undefined ? {} : { virtualPath }),
          });
          continue;
        }

        for await (const child of handle) {
          if (options.signal?.aborted) {
            aborted = true;
            complete = false;
            break;
          }
          if (directoryEntriesVisited >= limits.maxDirectoryEntries) {
            entryLimitReached = true;
            complete = false;
            options.diagnostics.add({
              code: 'DISCOVERY_ENTRY_LIMIT_REACHED',
              severity: 'warning',
              message: 'The source directory-entry limit was reached.',
            });
            break;
          }

          directoryEntriesVisited += 1;
          children.push({ name: child.name });
        }
      } finally {
        // Async iteration normally closes the handle. close() can report
        // ERR_DIR_CLOSED after a normal or early exit, which is harmless.
        await handle.close().catch(() => undefined);
      }
    } catch (error: unknown) {
      if (options.signal?.aborted || isAbortError(error)) {
        aborted = true;
        complete = false;
        break;
      }

      complete = false;
      const virtualPath = safeVirtualPath(options.source.virtualBase, directory.segments);
      options.diagnostics.add({
        code: 'DISCOVERY_DIRECTORY_UNREADABLE',
        severity: 'warning',
        message: 'A directory could not be read and was skipped.',
        ...(virtualPath === undefined ? {} : { virtualPath }),
      });
      continue;
    }

    if (aborted) {
      break;
    }

    const afterListing = await inspectBoundaryEntry(
      boundary,
      directory.absolutePath,
      options.signal,
    );
    if (
      !afterListing.ok ||
      !afterListing.stats.isDirectory() ||
      !hasSameFileIdentity(directory.identity, afterListing.identity)
    ) {
      if (!afterListing.ok && afterListing.reason === 'aborted') {
        aborted = true;
        complete = false;
        break;
      }
      complete = false;
      const virtualPath = safeVirtualPath(options.source.virtualBase, directory.segments);
      options.diagnostics.add({
        code: 'DISCOVERY_DIRECTORY_CHANGED',
        severity: 'warning',
        message: 'A directory changed while it was being listed and was skipped.',
        ...(virtualPath === undefined ? {} : { virtualPath }),
      });
      continue;
    }

    children.sort((left, right) => compareStrings(left.name, right.name));
    const childDirectories: PendingDirectory[] = [];

    for (const child of children) {
      if (options.signal?.aborted) {
        aborted = true;
        complete = false;
        break;
      }

      const segments = [...directory.segments, child.name];
      const publicPath = tryCreatePublicPath(options.source.virtualBase, segments);
      if (publicPath === undefined) {
        complete = false;
        options.diagnostics.add({
          code: 'DISCOVERY_PUBLIC_PATH_LIMIT_REACHED',
          severity: 'warning',
          message:
            'An entry could not be represented within the public path limits and was skipped.',
        });
        continue;
      }
      const absolutePath = path.join(directory.absolutePath, child.name);
      const includedAsFile =
        options.includeFile === undefined ||
        options.includeFile({
          relativePath: publicPath.relativePath,
          basename: publicPath.basename,
          depth: directory.depth + 1,
        });
      const inspected = await inspectBoundaryEntry(boundary, absolutePath, options.signal);

      if (!inspected.ok) {
        if (inspected.reason === 'aborted') {
          aborted = true;
          complete = false;
          break;
        }

        if (options.includeFile !== undefined && !includedAsFile) {
          continue;
        }

        complete = false;
        const parentVirtualPath = safeVirtualPath(options.source.virtualBase, directory.segments);
        options.diagnostics.add({
          code: entryDiagnosticCode(inspected.reason),
          severity: inspected.reason === 'outside-root' ? 'error' : 'warning',
          message: entryDiagnosticMessage(inspected.reason),
          ...(parentVirtualPath === undefined ? {} : { virtualPath: parentVirtualPath }),
        });
        continue;
      }

      const childDepth = directory.depth + 1;

      if (inspected.stats.isDirectory()) {
        if (skippedDirectories.has(child.name.toLowerCase())) {
          continue;
        }
        // A candidate-scoped walk does not open a directory whose children
        // would all be beyond the declared candidate depth.
        if (options.includeFile !== undefined && childDepth >= limits.maxDepth) {
          continue;
        }
        if (childDepth > limits.maxDepth) {
          complete = false;
          options.diagnostics.add({
            code: 'DISCOVERY_DEPTH_LIMIT_REACHED',
            severity: 'warning',
            message: 'A directory exceeded the source depth limit and was skipped.',
            virtualPath: publicPath.virtualPath,
          });
          continue;
        }

        childDirectories.push({
          absolutePath: inspected.canonicalPath,
          segments,
          depth: childDepth,
          identity: inspected.identity,
        });
        continue;
      }

      if (!includedAsFile) {
        continue;
      }

      if (!inspected.stats.isFile()) {
        complete = false;
        options.diagnostics.add({
          code: 'DISCOVERY_NON_REGULAR_FILE_SKIPPED',
          severity: 'warning',
          message: 'A non-regular filesystem entry was skipped.',
          virtualPath: publicPath.virtualPath,
        });
        continue;
      }

      if (childDepth > limits.maxDepth) {
        complete = false;
        options.diagnostics.add({
          code: 'DISCOVERY_DEPTH_LIMIT_REACHED',
          severity: 'warning',
          message: 'A file exceeded the source depth limit and was skipped.',
          virtualPath: publicPath.virtualPath,
        });
        continue;
      }

      if (inspected.stats.size > BigInt(limits.maxFileBytes)) {
        complete = false;
        options.diagnostics.add({
          code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED',
          severity: 'warning',
          message: 'A file exceeded the per-file byte limit and was skipped.',
          virtualPath: publicPath.virtualPath,
        });
        continue;
      }

      const byteLength = Number(inspected.stats.size);
      const entry: DiscoveryEntry = {
        source: options.source,
        relativePath: publicPath.relativePath,
        virtualPath: publicPath.virtualPath,
        basename: publicPath.basename,
        byteLength,
      };

      files.push({
        entry,
        locator: new PrivateFileLocator(boundary, inspected.canonicalPath, {
          identity: inspected.identity,
          byteLength: inspected.stats.size,
          modifiedNanoseconds: inspected.stats.mtimeNs,
          changedNanoseconds: inspected.stats.ctimeNs,
        }),
      });
    }

    if (aborted) {
      break;
    }

    // Push in reverse so the lexical first directory is visited first by the
    // LIFO stack. Complete, under-limit walks are deterministic.
    childDirectories.sort((left, right) =>
      compareStrings(left.segments.at(-1)!, right.segments.at(-1)!),
    );
    for (let index = childDirectories.length - 1; index >= 0; index -= 1) {
      pending.push(childDirectories[index]!);
    }
  }

  files.sort((left, right) => compareStrings(left.entry.relativePath, right.entry.relativePath));

  return {
    files,
    directoryEntriesVisited,
    complete,
    aborted,
  };
}

/**
 * Probes one allowlisted source-relative file without enumerating its parent
 * directory. Every path component is checked separately so an intermediate
 * symlink cannot be used to reach another location.
 */
export async function discoverExactFile(
  options: DiscoverExactFileOptions,
): Promise<DiscoverExactFileResult> {
  const limits = resolveSourceScanLimits(
    options.limits ?? DEFAULT_SCAN_LIMITS,
    options.source.layer,
  );
  let segments: readonly string[];
  if (options.boundary !== undefined && !boundaryMatchesRoot(options.boundary, options.rootPath)) {
    options.diagnostics.add({
      code: 'DISCOVERY_ROOT_BOUNDARY_MISMATCH',
      severity: 'error',
      message: 'A discovery root did not match its canonical boundary and was rejected.',
    });
    return { directoryEntriesVisited: 0, complete: false, aborted: false };
  }
  try {
    segments = splitPortableRelativePath(options.relativePath);
  } catch {
    options.diagnostics.add({
      code: 'DISCOVERY_INVALID_RELATIVE_PATH',
      severity: 'warning',
      message: 'A configured discovery path was invalid and was skipped.',
    });
    return { directoryEntriesVisited: 0, complete: false, aborted: false };
  }

  if (segments.length > limits.maxDepth) {
    options.diagnostics.add({
      code: 'DISCOVERY_DEPTH_LIMIT_REACHED',
      severity: 'warning',
      message: 'A configured file exceeded the source depth limit and was skipped.',
    });
    return { directoryEntriesVisited: 0, complete: false, aborted: false };
  }

  const boundaryResult =
    options.boundary === undefined
      ? await createRootBoundary(options.rootPath, options.signal)
      : ({ ok: true, boundary: options.boundary } as const);
  if (!boundaryResult.ok) {
    if (boundaryResult.reason !== 'aborted') {
      options.diagnostics.add({
        code: rootDiagnosticCode(boundaryResult.reason),
        severity: 'error',
        message: rootDiagnosticMessage(boundaryResult.reason),
      });
    }
    return {
      directoryEntriesVisited: 0,
      complete: false,
      aborted: boundaryResult.reason === 'aborted',
    };
  }

  const boundary = boundaryResult.boundary;
  const rootState = await revalidateRootBoundary(boundary, options.signal);
  if (rootState !== 'ok') {
    if (rootState === 'changed') {
      options.diagnostics.add({
        code: 'DISCOVERY_ROOT_CHANGED',
        severity: 'error',
        message: 'The selected source root changed during validation.',
      });
    }
    return {
      directoryEntriesVisited: 0,
      complete: false,
      aborted: rootState === 'aborted',
    };
  }
  let currentPath = boundary.canonicalRoot;
  let directoryEntriesVisited = 0;

  for (let index = 0; index < segments.length; index += 1) {
    if (options.signal?.aborted) {
      return { directoryEntriesVisited, complete: false, aborted: true };
    }
    if (directoryEntriesVisited >= limits.maxDirectoryEntries) {
      options.diagnostics.add({
        code: 'DISCOVERY_ENTRY_LIMIT_REACHED',
        severity: 'warning',
        message: 'The source directory-entry limit was reached.',
      });
      return { directoryEntriesVisited, complete: false, aborted: false };
    }

    directoryEntriesVisited += 1;
    const prefix = segments.slice(0, index + 1);
    const publicPath = tryCreatePublicPath(options.source.virtualBase, prefix);
    if (publicPath === undefined) {
      options.diagnostics.add({
        code: 'DISCOVERY_PUBLIC_PATH_LIMIT_REACHED',
        severity: 'warning',
        message: 'A configured path exceeded the public path limit and was skipped.',
      });
      return { directoryEntriesVisited, complete: false, aborted: false };
    }

    const inspected = await inspectBoundaryEntry(
      boundary,
      path.join(currentPath, segments[index]!),
      options.signal,
    );
    if (!inspected.ok) {
      if (inspected.reason === 'missing') {
        return { directoryEntriesVisited, complete: true, aborted: false };
      }
      if (inspected.reason === 'aborted') {
        return { directoryEntriesVisited, complete: false, aborted: true };
      }
      options.diagnostics.add({
        code: entryDiagnosticCode(inspected.reason),
        severity: inspected.reason === 'outside-root' ? 'error' : 'warning',
        message: entryDiagnosticMessage(inspected.reason),
        virtualPath: publicPath.virtualPath,
      });
      return { directoryEntriesVisited, complete: false, aborted: false };
    }

    const isFinal = index === segments.length - 1;
    if (!isFinal) {
      if (!inspected.stats.isDirectory()) {
        options.diagnostics.add({
          code: 'DISCOVERY_EXPECTED_DIRECTORY',
          severity: 'warning',
          message: 'A configured discovery path crossed a non-directory and was skipped.',
          virtualPath: publicPath.virtualPath,
        });
        return { directoryEntriesVisited, complete: false, aborted: false };
      }
      currentPath = inspected.canonicalPath;
      continue;
    }

    if (!inspected.stats.isFile()) {
      options.diagnostics.add({
        code: 'DISCOVERY_NON_REGULAR_FILE_SKIPPED',
        severity: 'warning',
        message: 'A configured candidate was not a regular file and was skipped.',
        virtualPath: publicPath.virtualPath,
      });
      return { directoryEntriesVisited, complete: false, aborted: false };
    }
    if (inspected.stats.size > BigInt(limits.maxFileBytes)) {
      options.diagnostics.add({
        code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED',
        severity: 'warning',
        message: 'A file exceeded the per-file byte limit and was skipped.',
        virtualPath: publicPath.virtualPath,
      });
      return { directoryEntriesVisited, complete: false, aborted: false };
    }

    const entry: DiscoveryEntry = {
      source: options.source,
      relativePath: publicPath.relativePath,
      virtualPath: publicPath.virtualPath,
      basename: publicPath.basename,
      byteLength: Number(inspected.stats.size),
    };
    const file: DiscoveredFile = {
      entry,
      locator: new PrivateFileLocator(boundary, inspected.canonicalPath, {
        identity: inspected.identity,
        byteLength: inspected.stats.size,
        modifiedNanoseconds: inspected.stats.mtimeNs,
        changedNanoseconds: inspected.stats.ctimeNs,
      }),
    };
    return { file, directoryEntriesVisited, complete: true, aborted: false };
  }

  return { directoryEntriesVisited, complete: false, aborted: false };
}

export function isLocatorSnapshotCurrent(
  locator: PrivateFileLocator,
  snapshot: FileSnapshot,
): boolean {
  const expected = locator.snapshot;
  return (
    hasSameFileIdentity(expected.identity, snapshot.identity) &&
    expected.byteLength === snapshot.byteLength &&
    expected.modifiedNanoseconds === snapshot.modifiedNanoseconds &&
    expected.changedNanoseconds === snapshot.changedNanoseconds
  );
}

const rootDiagnosticCode = (
  reason: Exclude<
    Awaited<ReturnType<typeof createRootBoundary>> extends infer Result
      ? Result extends { ok: false; reason: infer Reason }
        ? Reason
        : never
      : never,
    'aborted'
  >,
): string =>
  reason === 'symlink-root'
    ? 'DISCOVERY_SYMLINK_ROOT_REJECTED'
    : reason === 'not-directory'
      ? 'DISCOVERY_ROOT_NOT_DIRECTORY'
      : reason === 'root-changed'
        ? 'DISCOVERY_ROOT_CHANGED'
        : 'DISCOVERY_ROOT_UNREADABLE';

const rootDiagnosticMessage = (
  reason: 'inaccessible' | 'not-directory' | 'root-changed' | 'symlink-root',
): string =>
  reason === 'symlink-root'
    ? 'The selected source root is a symbolic link and was rejected.'
    : reason === 'not-directory'
      ? 'The selected source root is not a directory.'
      : reason === 'root-changed'
        ? 'The selected source root changed during validation.'
        : 'The selected source root could not be read.';

const entryDiagnosticCode = (
  reason: 'inaccessible' | 'missing' | 'outside-root' | 'root-changed' | 'symlink',
): string =>
  reason === 'symlink'
    ? 'DISCOVERY_SYMLINK_SKIPPED'
    : reason === 'outside-root'
      ? 'DISCOVERY_OUTSIDE_ROOT_SKIPPED'
      : reason === 'root-changed' || reason === 'missing'
        ? 'DISCOVERY_ENTRY_CHANGED'
        : 'DISCOVERY_ENTRY_UNREADABLE';

const entryDiagnosticMessage = (
  reason: 'inaccessible' | 'missing' | 'outside-root' | 'root-changed' | 'symlink',
): string =>
  reason === 'symlink'
    ? 'A symbolic link was skipped.'
    : reason === 'outside-root'
      ? 'An entry outside the canonical source root was skipped.'
      : reason === 'root-changed' || reason === 'missing'
        ? 'An entry changed during validation and was skipped.'
        : 'An entry could not be inspected and was skipped.';

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
