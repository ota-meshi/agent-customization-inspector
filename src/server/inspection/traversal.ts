// Ordinary recursive traversal and per-file reading of compiled traversal
// plans — the single module family (src/server/inspection/) that performs
// inspected-source filesystem I/O (QR-003, FR-019).
//
// Trusted-workspace boundary (FR-019, constitution Quality and Safety
// Standards): the inspected customization files are the user's own working
// files and are NOT modeled as an adversary. The Inspector's job is to show
// what an AI agent reading the same paths would see, so symbolic links are
// read transparently — agents resolve them when loading customization files
// (FR-024) — and no identity re-verification runs between operations, no
// detected-change taxonomy exists, and no resource registry mediates reads.
// Every operation is an ordinary read-only `node:fs/promises` call: readdir
// enumeration, stat/realpath classification, and one plain readFile per
// discovered file, with no mutation-capable API or flag. External
// modification during a scan is therefore not a threat to defend against: a
// file that disappears or cannot be read surfaces as that file's
// `file-unreadable` Diagnostic (FR-024), a NUL-containing file surfaces as
// diagnostic-only `file-content-binary` (FR-025), and a failure that is not
// confined to one file propagates ordinarily and fails the attempt without
// a commit (FR-028/FR-030). The residual limitation is inherent: reads are
// not atomic snapshots, so concurrent external writes may interleave, which
// the trusted-workspace model accepts.
import { lstat, readFile, readdir, realpath, stat } from './fs-io';
import { join } from 'node:path';
import { decodeSourceBytes } from '../../shared/entities';
import {
  assertLoadableTraversalPlan,
  createProgramLevel,
  type MatcherSegment,
  type ProgramState,
  type TraversalPlan,
} from './rules/registry';

/**
 * The closed per-file read outcome of one scan attempt
 * (spec.md § Byte Decode Outcomes, FR-024/FR-028):
 *  - 'readable'    the one completed read decoded as `utf-8` or
 *                  `utf-8-replaced` text with complete decoded content
 *  - 'binary'      at least one NUL byte; diagnostic-only, no source text
 *  - 'unreadable'  the read failed — the file disappeared after discovery,
 *                  was unreadable, or is a link whose target is missing or
 *                  unreadable
 */
export type CandidateOutcome =
  | {
      /** Readable text with its decode classification. */
      readonly kind: 'readable';
      /** Whether replacement decoding occurred; see spec.md § Byte Decode Outcomes. */
      readonly encoding: 'utf-8' | 'utf-8-replaced';
      /** Whether one leading UTF-8 BOM was recorded and removed (FR-025). */
      readonly hadLeadingBom: boolean;
      /** Complete decoded text as authored. */
      readonly sourceText: string;
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    }
  | {
      /** NUL-containing diagnostic-only content (FR-025). */
      readonly kind: 'binary';
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    }
  | {
      /** The read failed before bytes could be classified (FR-024). */
      readonly kind: 'unreadable';
    };

/**
 * One discovered candidate file with its read outcome. Raw entry-name
 * segments stay the filesystem operands while the NFC public path is
 * presentation/identity only (FR-024); neither reconstructs the other.
 */
export interface TraversalCandidate {
  /** Exact raw entry-name segments used for filesystem operations. */
  readonly rawSegments: readonly string[];
  /** Collision-free NFC display path, `/`-joined, relative to the root. */
  readonly publicPath: string;
  /** The closed per-file result; see {@link CandidateOutcome}. */
  readonly outcome: CandidateOutcome;
}

/**
 * One rejected Unicode-normalization collision group: distinct raw paths
 * normalized to the same NFC path, so no unambiguous public path exists.
 * The whole group is rejected before any member is opened and surfaces as
 * one pathless session-scoped Diagnostic (spec.md Clarifications
 * § Session 2026-07-20); the raw members here are internal evidence for the
 * scan layer and never serialize.
 */
export interface NormalizationCollision {
  /** The ambiguous NFC path shared by every member; never published. */
  readonly nfcPath: string;
  /** The distinct raw segment paths that collided. */
  readonly rawMembers: readonly (readonly string[])[];
}

/**
 * The result of one Source scan attempt (FR-002, FR-024):
 *  - 'scanned'          traversal completed; per-file outcomes and any
 *                       rejected collision groups are listed
 *  - 'root-unreadable'  the selected root does not exist or cannot be read
 *                       as a directory; the Source attempt fails with the
 *                       source-scoped Diagnostic and no partial inventory
 */
export type TraversalScanResult =
  | {
      /** Traversal completed (possibly with file-confined outcomes). */
      readonly kind: 'scanned';
      /** Deterministically ordered per-file results. */
      readonly files: readonly TraversalCandidate[];
      /** Rejected normalization-collision groups (members received no read). */
      readonly collisions: readonly NormalizationCollision[];
    }
  | {
      /** The root failed enumeration; the attempt fails (FR-002). */
      readonly kind: 'root-unreadable';
    };

/** VCS internals are excluded from traversal (contracts/inspection-path-allowlist.md). */
const VCS_INTERNALS = new Set(['.git', '.hg', '.svn']);

// Raw path key for one-read-per-attempt deduplication across plans and
// selectors (contracts/inspection-path-allowlist.md § Rule classes).
function rawKey(segments: readonly string[]): string {
  return segments.join('\u0000');
}

/** Derives the NFC public display path from raw segments (FR-024). */
export function toPublicPath(rawSegments: readonly string[]): string {
  return rawSegments.map((segment) => segment.normalize('NFC')).join('/');
}

// Reads one discovered file exactly once with an ordinary read-only
// `fs/promises` read and classifies its bytes (FR-024/FR-025). Reading goes
// through the platform's transparent symlink resolution; any read failure —
// including a broken link — is that file's file-confined outcome.
async function readCandidate(absolutePath: string): Promise<CandidateOutcome> {
  let bytes: Buffer;
  try {
    bytes = await readFile(absolutePath);
  } catch {
    return { kind: 'unreadable' };
  }
  const decoded = decodeSourceBytes(bytes);
  if (decoded.encoding === 'binary') {
    return { kind: 'binary', sizeBytes: bytes.length };
  }
  return {
    kind: 'readable',
    encoding: decoded.encoding,
    hadLeadingBom: decoded.hadLeadingBom,
    sourceText: decoded.sourceText,
    sizeBytes: bytes.length,
  };
}

// One discovered-but-not-yet-read candidate.
interface PendingCandidate {
  readonly rawSegments: readonly string[];
  // A candidate whose entry is a broken or unreadable link is already known
  // unreadable at discovery time; it still surfaces as file-unreadable.
  readonly knownUnreadable: boolean;
}

// Recursively walks one directory with ordinary reads (FR-019): raw entry
// names are the operands, VCS internals are excluded, symbolic links are
// followed transparently, and visited directories are tracked by real path
// so a link cycle terminates (FR-024). A readdir/stat failure below the root
// is not confined to one file and intentionally propagates.
async function walkDirectory(
  absoluteDir: string,
  rawSegments: readonly string[],
  states: readonly ProgramState[],
  visitedRealPaths: Set<string>,
  discovered: Map<string, PendingCandidate>,
): Promise<void> {
  // The grammar's stepping semantics live in the registry beside the
  // segment union; the walk only asks its two closed questions per entry.
  const level = createProgramLevel(states);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  for (const entry of entries) {
    if (VCS_INTERNALS.has(entry.name)) {
      continue;
    }
    const entryPath = join(absoluteDir, entry.name);
    const entrySegments = [...rawSegments, entry.name];

    // Which programs accept this raw name as their terminal regular file,
    // and which continue below it as a directory step.
    const terminalMatch = level.matchesFile(entry.name);
    const descendStates = level.statesForDirectory(entry.name);

    // Classify the entry, following links transparently (FR-024).
    let isFile = entry.isFile();
    let isDirectory = entry.isDirectory();
    if (entry.isSymbolicLink()) {
      try {
        const target = await statThroughLink(entryPath);
        isFile = target.isFile;
        isDirectory = target.isDirectory;
      } catch (error) {
        // A candidate whose link target is missing or unreadable is that
        // file's file-unreadable Diagnostic (FR-024).
        if (terminalMatch) {
          if (!discovered.has(rawKey(entrySegments))) {
            discovered.set(rawKey(entrySegments), {
              rawSegments: entrySegments,
              knownUnreadable: true,
            });
          }
          continue;
        }
        const code = (error as { code?: string }).code;
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          // A dangling link at a directory step reaches nothing, and no
          // candidate file exists to carry a diagnostic.
          continue;
        }
        // Any other classification failure on a non-candidate entry is not
        // confined to one file and fails the attempt ordinarily (FR-030).
        throw error;
      }
    }

    if (terminalMatch && isFile && !discovered.has(rawKey(entrySegments))) {
      discovered.set(rawKey(entrySegments), { rawSegments: entrySegments, knownUnreadable: false });
    }
    if (isDirectory && descendStates.length > 0) {
      // Real-path tracking over the current ancestor chain terminates link
      // cycles (FR-024): a directory is skipped only when its real path is
      // already an ancestor of this descent, so a sibling link to the same
      // physical directory still walks transparently (two public paths, one
      // target — links are not aliases). The realpath read is ordinary and
      // read-only like every other operation.
      const real = await realpath(entryPath);
      if (visitedRealPaths.has(real)) {
        continue;
      }
      visitedRealPaths.add(real);
      await walkDirectory(entryPath, entrySegments, descendStates, visitedRealPaths, discovered);
      visitedRealPaths.delete(real);
    }
  }
}

// stat-through-link classification used for symlinked entries. Split out so
// the walk reads clearly; errors propagate to the caller, which decides the
// broken-link outcome. `stat` (not lstat) resolves the link chain — the
// transparent read the trusted-workspace model requires (FR-024).
async function statThroughLink(
  absolutePath: string,
): Promise<{ isFile: boolean; isDirectory: boolean }> {
  const info = await stat(absolutePath);
  return { isFile: info.isFile(), isDirectory: info.isDirectory() };
}

// Probes one Global exact target below the admitted root without enumerating
// the root (contracts/inspection-path-allowlist.md § Global least
// privilege): only a missing entry is absent; an existing but unreachable
// entry is a candidate whose read failure surfaces per file (FR-024).
async function probeExactTarget(
  root: string,
  fixedPrefix: readonly string[],
): Promise<PendingCandidate | null> {
  const absolutePath = join(root, ...fixedPrefix);
  try {
    await lstat(absolutePath);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      // Absent target: no candidate and no sibling discovery (FR-018).
      return null;
    }
    return { rawSegments: [...fixedPrefix], knownUnreadable: true };
  }
  return { rawSegments: [...fixedPrefix], knownUnreadable: false };
}

// The Codex override-empty ordered fallback (FR-035) — the one
// content-dependent selection. "Empty" means the decoded string trims to
// zero length after one optional leading BOM was removed; a retained U+FFFD
// is non-whitespace, so utf-8-replaced text is non-empty.
async function runCodexFirstNonEmpty(
  root: string,
  targets: readonly (readonly string[])[],
): Promise<TraversalCandidate[]> {
  const [overridePrefix, fallbackPrefix] = targets;
  if (overridePrefix === undefined || fallbackPrefix === undefined) {
    throw new TypeError('codex-global-first-non-empty requires the two ordered targets');
  }
  const override = await probeExactTarget(root, overridePrefix);
  if (override !== null) {
    const outcome = override.knownUnreadable
      ? ({ kind: 'unreadable' } as const)
      : await readCandidate(join(root, ...overridePrefix));
    if (outcome.kind !== 'readable') {
      // An unreadable or binary override ends the branch with its file
      // Diagnostic and no fallback (FR-035).
      return [
        { rawSegments: overridePrefix, publicPath: toPublicPath(overridePrefix), outcome },
      ];
    }
    if (outcome.sourceText.trim().length > 0) {
      // A readable non-empty override is the single published file and
      // short-circuits without any operation on the fallback target.
      return [
        { rawSegments: overridePrefix, publicPath: toPublicPath(overridePrefix), outcome },
      ];
    }
    // A readable empty override advances to the fallback target.
  }
  const fallback = await probeExactTarget(root, fallbackPrefix);
  if (fallback === null) {
    return [];
  }
  const outcome = fallback.knownUnreadable
    ? ({ kind: 'unreadable' } as const)
    : await readCandidate(join(root, ...fallbackPrefix));
  if (outcome.kind === 'readable' && outcome.sourceText.trim().length === 0) {
    // Only a readable non-empty regular file is published at the fallback
    // position; a readable empty one publishes no Codex instruction file.
    return [];
  }
  return [{ rawSegments: fallbackPrefix, publicPath: toPublicPath(fallbackPrefix), outcome }];
}

/** Input of one Source scan attempt over compiled plans. */
export interface TraversalScanInput {
  /** The retained selected raw root — the base of every operation (FR-001). */
  readonly root: string;
  /** The compiled inspection allowlist to interpret as data (FR-019). */
  readonly plans: readonly TraversalPlan[];
}

/**
 * Runs one Source scan attempt: enumerates the compiled allowlist with an
 * ordinary recursive walk, rejects normalization-collision groups before any
 * member read, then reads every surviving discovered file exactly once
 * (FR-019, FR-024, FR-028). A missing or unreadable root returns the
 * `root-unreadable` result that fails the Source attempt (FR-002); a failure
 * not confined to one file propagates to the caller unchanged.
 */
export async function runTraversalScan(input: TraversalScanInput): Promise<TraversalScanResult> {
  for (const plan of input.plans) {
    assertLoadableTraversalPlan(plan);
  }

  // The selected root must exist and be a directory for the attempt to
  // proceed (FR-002/FR-013) — even while the shipped catalog is empty, a
  // scan of a missing or non-directory root is a failed Source attempt,
  // never an empty complete generation. `stat` is classification, not
  // enumeration, so Global exact targets keep their no-root-enumeration
  // guarantee. (An existing directory whose entries cannot be listed still
  // surfaces through the walk's own enumeration failure below.)
  try {
    if (!(await stat(input.root)).isDirectory()) {
      return { kind: 'root-unreadable' };
    }
  } catch {
    return { kind: 'root-unreadable' };
  }

  // Collect every repository program so the root is enumerated once for the
  // whole attempt; Global selectors probe or walk only their fixed targets.
  const repositoryPrograms: ProgramState[] = [];
  const subtreeWalks: { fixedPrefix: readonly string[]; remainder: readonly MatcherSegment[] }[] = [];
  const exactTargets: (readonly string[])[] = [];
  const fallbackRuns: (readonly (readonly string[])[])[] = [];
  for (const plan of input.plans) {
    if (plan.selectionPolicy === 'codex-global-first-non-empty') {
      fallbackRuns.push(plan.selectors.map((selector) => selector.fixedPrefix));
      continue;
    }
    for (const selector of plan.selectors) {
      switch (selector.mode) {
        case 'repository-program':
          repositoryPrograms.push({ program: selector.remainder, position: 0 });
          break;
        case 'global-exact':
          exactTargets.push(selector.fixedPrefix);
          break;
        case 'global-fixed-subtree':
          subtreeWalks.push({ fixedPrefix: selector.fixedPrefix, remainder: selector.remainder });
          break;
      }
    }
  }

  const discovered = new Map<string, PendingCandidate>();

  if (repositoryPrograms.length > 0) {
    const visited = new Set<string>();
    try {
      visited.add(await realpath(input.root));
    } catch {
      return { kind: 'root-unreadable' };
    }
    try {
      await walkDirectory(input.root, [], repositoryPrograms, visited, discovered);
    } catch (error) {
      // Only the root's own enumeration failure is the source-scoped FR-002
      // outcome; a deeper failure is not confined to one file and propagates.
      if (isRootEnumerationFailure(error, input.root)) {
        return { kind: 'root-unreadable' };
      }
      throw error;
    }
  }

  for (const target of exactTargets) {
    const candidate = await probeExactTarget(input.root, target);
    if (candidate !== null && !discovered.has(rawKey(candidate.rawSegments))) {
      discovered.set(rawKey(candidate.rawSegments), candidate);
    }
  }

  for (const subtree of subtreeWalks) {
    const subtreeRoot = join(input.root, ...subtree.fixedPrefix);
    let subtreeReal: string;
    try {
      subtreeReal = await realpath(subtreeRoot);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        // Only a missing fixed subtree publishes nothing and triggers no
        // sibling discovery (FR-018). Any other failure — e.g. a denied
        // parent — is not "absent": it is not confined to one file and
        // propagates as the attempt's ordinary error (FR-030).
        continue;
      }
      throw error;
    }
    await walkDirectory(
      subtreeRoot,
      [...subtree.fixedPrefix],
      [{ program: subtree.remainder, position: 0 }],
      new Set<string>([subtreeReal]),
      discovered,
    );
  }

  // Reject whole normalization-collision groups before opening any member
  // (spec.md Clarifications § Session 2026-07-20).
  const byNfcPath = new Map<string, PendingCandidate[]>();
  for (const candidate of discovered.values()) {
    const nfcPath = toPublicPath(candidate.rawSegments);
    const group = byNfcPath.get(nfcPath);
    if (group === undefined) {
      byNfcPath.set(nfcPath, [candidate]);
    } else {
      group.push(candidate);
    }
  }
  const collisions: NormalizationCollision[] = [];
  const files: TraversalCandidate[] = [];
  for (const [nfcPath, group] of byNfcPath) {
    if (group.length > 1) {
      collisions.push({ nfcPath, rawMembers: group.map((member) => member.rawSegments) });
      continue;
    }
    const candidate = group[0]!;
    const outcome = candidate.knownUnreadable
      ? ({ kind: 'unreadable' } as const)
      : await readCandidate(join(input.root, ...candidate.rawSegments));
    files.push({ rawSegments: candidate.rawSegments, publicPath: nfcPath, outcome });
  }

  for (const targets of fallbackRuns) {
    files.push(...(await runCodexFirstNonEmpty(input.root, targets)));
  }

  // Deterministic result order: public path, then raw operands — opaque IDs
  // and enumeration interleaving never supply the order.
  files.sort((left, right) =>
    left.publicPath !== right.publicPath
      ? left.publicPath < right.publicPath
        ? -1
        : 1
      : rawKey(left.rawSegments) < rawKey(right.rawSegments)
        ? -1
        : 1,
  );
  collisions.sort((left, right) => (left.nfcPath < right.nfcPath ? -1 : 1));
  return { kind: 'scanned', files, collisions };
}

// The FR-002 outcome covers exactly the selected root that does not exist or
// cannot be read as a directory. The walk enumerates the root first, so a
// failure naming the root path with an enumeration errno is the root's own.
function isRootEnumerationFailure(error: unknown, root: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { code, path } = error as { code?: string; path?: string };
  return (
    path === root &&
    (code === 'ENOENT' || code === 'ENOTDIR' || code === 'EACCES' || code === 'EPERM')
  );
}
