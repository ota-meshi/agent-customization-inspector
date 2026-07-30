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
// `file-unreadable` Diagnostic (FR-024), a NUL-containing candidate surfaces
// as diagnostic-only `file-content-binary` (FR-025), and a failure that is not
// confined to one file propagates ordinarily and fails the attempt without
// a commit (FR-028/FR-030). The residual limitation is inherent: reads are
// not atomic snapshots, so concurrent external writes may interleave, which
// the trusted-workspace model accepts.
import { lstat, readFile, readdir, realpath, stat } from './fs-io';
import { isAbsolute, join, relative, sep } from 'node:path';
import { decodeSourceBytes, type ReadableFileEncoding } from '../../shared/entities';
import {
  assertLoadableTraversalPlan,
  ProgramLevel,
  normalizeSelectorOrigins,
  type MatcherSegment,
  type ProgramState,
  type SelectorOrigin,
  type TraversalPlan,
} from './rules/registry';

/**
 * The closed per-file read outcome of one scan attempt
 * (spec.md § Byte Decode Outcomes, FR-024/FR-028):
 *  - 'readable'    the one completed read decoded as `utf-8` or
 *                  `utf-8-replaced` text with complete decoded content
 *  - 'binary'      at least one NUL byte; no source text
 *  - 'unreadable'  the read failed — the file disappeared after discovery,
 *                  was unreadable, or is a link whose target is missing or
 *                  unreadable
 */
export type CandidateOutcome =
  /** A readable candidate carrying its complete decoded source. */
  | {
      /** Readable text with its decode classification. */
      readonly kind: 'readable';
      /** Whether replacement decoding occurred; see spec.md § Byte Decode Outcomes. */
      readonly encoding: ReadableFileEncoding;
      /** Whether one leading UTF-8 BOM was recorded and removed (FR-025). */
      readonly hadLeadingBom: boolean;
      /** Complete decoded text as authored. */
      readonly sourceText: string;
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    }
  /** A NUL-containing file, published without source text. */
  | {
      /** NUL-containing content (FR-025); whether it is also a Diagnostic is the publisher's split. */
      readonly kind: 'binary';
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    }
  /** A candidate whose bytes could not be read or classified. */
  | {
      /** The read failed before bytes could be classified (FR-024). */
      readonly kind: 'unreadable';
    };

/**
 * One discovered candidate file with its read outcome. Raw entry-name
 * segments stay the filesystem operands, and the public path is those names
 * `/`-joined (FR-024); the joined string is never decoded back into an
 * operand.
 */
export interface TraversalCandidate {
  /** Exact raw entry-name segments used for filesystem operations. */
  readonly rawSegments: readonly string[];
  /** The raw entry names `/`-joined, relative to the root; the public identity. */
  readonly publicPath: string;
  /**
   * Every authored selector that admitted this file, deduplicated and
   * ordered. One physical file may be admitted by several selectors or plans
   * and retains each independent provenance
   * (contracts/inspection-path-allowlist.md § Rule classes); it is still read
   * exactly once per scan attempt.
   */
  readonly admissions: readonly SelectorOrigin[];
  /** The closed per-file result; see {@link CandidateOutcome}. */
  readonly outcome: CandidateOutcome;
}

/**
 * The result of one Source scan attempt (FR-002, FR-024):
 *  - 'scanned'          traversal completed; per-file outcomes are listed
 *  - 'root-unreadable'  the selected root does not exist or cannot be read
 *                       as a directory; the Source attempt fails with the
 *                       source-scoped Diagnostic and no partial inventory
 */
export type TraversalScanResult =
  /** A completed traversal with its ordered candidates. */
  | {
      /** Traversal completed (possibly with file-confined outcomes). */
      readonly kind: 'scanned';
      /** Deterministically ordered per-file results. */
      readonly files: readonly TraversalCandidate[];
      /**
       * How many directory entries the walk looked at, so a completed scan can
       * report what it did rather than the zero its counters started at
       * (contracts/http-api.md § get-session `progress`).
       */
      readonly visitedEntries: number;
      /** Allowlisted candidate files this walk discovered (data-model.md § ScanProgress). */
      readonly candidateFiles: number;
      /**
       * Bytes this attempt accepted. Counted as they are read, because the
       * publication cannot supply it: an override read that turned out empty
       * still cost the read without publishing.
       */
      readonly readBytes: number;
    }
  /** A root that could not be enumerated as a readable directory. */
  | {
      /** The root failed enumeration; the attempt fails (FR-002). */
      readonly kind: 'root-unreadable';
    };

/**
 * VCS internals are excluded from traversal
 * (contracts/inspection-path-allowlist.md). Exported so any other enumeration
 * excludes exactly the same names rather than keeping a second list that could
 * drift from this one.
 */
export const VCS_INTERNALS = new Set(['.git', '.hg', '.svn']);

/**
 * Whether a resolved real path reaches VCS internals *below* `containerReal`.
 * The entry-name check alone is not enough: an entry named anything else can be
 * a symbolic link to `.git`, and following it would enumerate the repository's
 * object store as customization content. Descent is therefore decided on the
 * resolved path, which is the only spelling that cannot be renamed around
 * (contracts/inspection-path-allowlist.md § Traversal).
 *
 * Only the segments below the container are examined. The exclusion is about
 * what a scan descends into, not about where the user keeps the tree they
 * selected: a root whose own path happens to contain `.git` — a checkout at
 * `/srv/.git/worktree`, a temporary fixture — is an ordinary root, and testing
 * its whole absolute path would scan nothing at all.
 */
export function isVcsInternalPath(containerReal: string, realPath: string): boolean {
  const below = relative(containerReal, realPath);
  if (below === '' || isAbsolute(below)) {
    return false;
  }
  return below.split(sep).some((segment) => VCS_INTERNALS.has(segment));
}

// Raw path key for one-read-per-attempt deduplication across plans and
// selectors (contracts/inspection-path-allowlist.md § Rule classes).
function rawKey(segments: readonly string[]): string {
  return segments.join('\u0000');
}

/**
 * Derives the public Source-relative Path from raw segments (FR-024): the
 * exact entry names, joined with `/`. No spelling is normalized away — the
 * published path is the path an agent reading the same tree operates on, and
 * presentation concerns (control characters) are escaped at render time
 * without changing this stored value. An entry name is the string Node.js
 * returned for it (`fs` decodes names as UTF-8 by documented default); a
 * platform name that is not valid UTF-8 arrives replacement-decoded, and one
 * the platform cannot resolve again through that string surfaces as the
 * affected operation's ordinary failure (FR-024).
 */
export function toPublicPath(rawSegments: readonly string[]): string {
  return rawSegments.join('/');
}

/**
 * Resource-exhaustion errnos: the machine ran out of descriptors or memory,
 * which says nothing about the file being read. The Constitution requires such
 * a failure to abort the publication attempt, so it must not be folded into a
 * per-file outcome (Constitution § Quality and Safety Standards; spec.md
 * Clarifications § Session 2026-07-20).
 */
const RESOURCE_EXHAUSTION_CODES = new Set(['EMFILE', 'ENFILE', 'ENOMEM']);

/**
 * Rethrows a resource-exhaustion failure so the attempt aborts, and returns
 * otherwise so the caller can classify what is genuinely a fact about the path
 * it was reading. Every filesystem call in this module and in the companion
 * census goes through it: a rule that held only for `readFile` would report the
 * machine running out of descriptors as an unreadable file at one call site and
 * as an unreadable root at another.
 */
export function rethrowIfResourceExhaustion(error: unknown): void {
  if (RESOURCE_EXHAUSTION_CODES.has((error as { code?: string }).code ?? '')) {
    throw error;
  }
}

/**
 * Reads one discovered file exactly once with an ordinary read-only
 * `fs/promises` read and classifies its bytes (FR-024/FR-025). Reading goes
 * through the platform's transparent symlink resolution; a read failure that
 * is a fact about the file — permissions, a broken link, a directory — is that
 * file's file-confined outcome.
 *
 * Exported because the walk is not the only thing that reads a file the scan
 * publishes: `scan.ts` calls this again for each file a companion census
 * listed, and those files must be read the same way — one read, the same
 * decode, the same closed outcome — rather than through a second read path
 * that could drift from this one. The census itself reads nothing; it
 * enumerates, and the scan reads what it enumerated.
 */
export async function readCandidate(absolutePath: string): Promise<CandidateOutcome> {
  let bytes: Buffer;
  try {
    bytes = await readFile(absolutePath);
  } catch (error) {
    // Reached when the scan exhausts descriptors or memory partway through a
    // repository. Reporting `unreadable` would tell the user that the files
    // this attempt happened to reach afterwards are broken, and send them to
    // check permissions on files that are fine.
    rethrowIfResourceExhaustion(error);
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

// One discovered-but-not-yet-read candidate. `origins` accumulates across
// selectors and plans: rediscovering the same raw path adds its provenance
// without adding a second read (one read per file per attempt).
interface PendingCandidate {
  readonly rawSegments: readonly string[];
  // A candidate whose entry is a broken or unreadable link is already known
  // unreadable at discovery time; it still surfaces as file-unreadable.
  readonly knownUnreadable: boolean;
  readonly origins: SelectorOrigin[];
}

// Records one discovered candidate, merging provenance into an existing entry
// rather than replacing it, so a file admitted by two selectors keeps both.
function recordCandidate(
  discovered: Map<string, PendingCandidate>,
  candidate: PendingCandidate,
): void {
  const key = rawKey(candidate.rawSegments);
  const existing = discovered.get(key);
  if (existing === undefined) {
    discovered.set(key, candidate);
    return;
  }
  existing.origins.push(...candidate.origins);
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
  counters: { visitedEntries: number; report: ((visitedEntries: number) => void) | undefined },
  rootReal: string,
): Promise<void> {
  // The grammar's stepping semantics live in the registry beside the
  // segment union; the walk only asks its two closed questions per entry.
  const level = new ProgramLevel(states);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  counters.visitedEntries += entries.length;
  // One report per directory level: enough for a refresh mid-scan to show
  // movement, and cheap enough that the walk is not paced by its own reporting.
  counters.report?.(counters.visitedEntries);
  for (const entry of entries) {
    if (VCS_INTERNALS.has(entry.name)) {
      continue;
    }
    const entryPath = join(absoluteDir, entry.name);
    const entrySegments = [...rawSegments, entry.name];

    // Which selectors accept this raw name as their terminal regular file,
    // and which programs continue below it as a directory step.
    const fileAdmissions = level.admissionsForFile(entry.name);
    const descendStates = level.statesForDirectory(entry.name);

    // Classify the entry, following links transparently (FR-024).
    let isFile = entry.isFile();
    let isDirectory = entry.isDirectory();
    // Some filesystems — NFS without readdirplus, several FUSE drivers — return
    // entries whose type is unknown, so every predicate answers false. Dropping
    // those silently would lose a candidate or a whole subtree with no
    // diagnostic to show for it, so the type is resolved with a stat instead.
    // A failure here is treated exactly like a failed link resolution below.
    if (!isFile && !isDirectory && !entry.isSymbolicLink()) {
      try {
        const target = await statThroughLink(entryPath);
        isFile = target.isFile;
        isDirectory = target.isDirectory;
      } catch (error) {
        rethrowIfResourceExhaustion(error);
        if (fileAdmissions.length > 0) {
          recordCandidate(discovered, {
            rawSegments: entrySegments,
            knownUnreadable: true,
            origins: fileAdmissions,
          });
          continue;
        }
        const code = (error as { code?: string }).code;
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          continue;
        }
        throw error;
      }
    }
    if (entry.isSymbolicLink()) {
      try {
        const target = await statThroughLink(entryPath);
        isFile = target.isFile;
        isDirectory = target.isDirectory;
      } catch (error) {
        rethrowIfResourceExhaustion(error);
        // A candidate whose link target is missing or unreadable is that
        // file's file-unreadable Diagnostic (FR-024).
        if (fileAdmissions.length > 0) {
          recordCandidate(discovered, {
            rawSegments: entrySegments,
            knownUnreadable: true,
            origins: fileAdmissions,
          });
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

    if (fileAdmissions.length > 0 && isFile) {
      recordCandidate(discovered, {
        rawSegments: entrySegments,
        knownUnreadable: false,
        origins: fileAdmissions,
      });
    }
    if (isDirectory && descendStates.length > 0) {
      // Real-path tracking over the current ancestor chain terminates link
      // cycles (FR-024): a directory is skipped only when its real path is
      // already an ancestor of this descent, so a sibling link to the same
      // physical directory still walks transparently (two public paths, one
      // target — links are not aliases). The realpath read is ordinary and
      // read-only like every other operation.
      const real = await realpath(entryPath);
      // Excluded here as well as by name: the name check above cannot see a
      // link that reaches VCS internals under another spelling. Judged against
      // the Source root, so a root that itself lives under a `.git` path is an
      // ordinary root.
      if (isVcsInternalPath(rootReal, real) || visitedRealPaths.has(real)) {
        continue;
      }
      visitedRealPaths.add(real);
      await walkDirectory(
        entryPath,
        entrySegments,
        descendStates,
        visitedRealPaths,
        discovered,
        counters,
        rootReal,
      );
      visitedRealPaths.delete(real);
    }
  }
}

/**
 * Classifies a symbolic link by what it resolves to, following the chain with
 * `stat` rather than `lstat`. That transparency is FR-024: the Inspector shows
 * what an agent reading the same path would see, and an agent resolves links
 * too, so a link to a skill file is that skill file.
 *
 * Errors propagate rather than being classified here. Both callers turn a
 * broken link into the same answer — the walk gives the candidate a
 * `file-unreadable` diagnostic, and the census lists the entry anyway so the
 * scan's own read produces that diagnostic for it — but each does so with the
 * context this function does not have: which file it was looking at and on
 * whose behalf.
 */
export async function statThroughLink(
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
  origin: SelectorOrigin,
): Promise<PendingCandidate | null> {
  const absolutePath = join(root, ...fixedPrefix);
  const pending = (knownUnreadable: boolean): PendingCandidate => ({
    rawSegments: [...fixedPrefix],
    knownUnreadable,
    origins: [origin],
  });
  let entry;
  try {
    entry = await lstat(absolutePath);
  } catch (error) {
    rethrowIfResourceExhaustion(error);
    const code = (error as { code?: string }).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      // Absent target: no candidate and no sibling discovery (FR-018).
      return null;
    }
    return pending(true);
  }
  if (entry.isSymbolicLink()) {
    // Transparent read through the link (FR-024): a dangling or unreadable
    // target is this candidate's file-unreadable outcome, not absence.
    try {
      const target = await stat(absolutePath);
      return pending(!target.isFile());
    } catch (error) {
      rethrowIfResourceExhaustion(error);
      return pending(true);
    }
  }
  // The probe's own type information classifies a non-regular entry
  // (directory, FIFO, socket, device) as this candidate's file-unreadable
  // outcome: the one flag-free readFile cannot read it as a candidate file
  // and would block indefinitely on a FIFO (FR-024). The Repository walk
  // gets the same gate from its directory-entry types.
  return pending(!entry.isFile());
}

// The Codex override-empty ordered fallback (FR-035) — the one
// content-dependent selection. "Empty" means the decoded string trims to
// zero length after one optional leading BOM was removed; a retained U+FFFD
// is non-whitespace, so utf-8-replaced text is non-empty.
async function runCodexFirstNonEmpty(
  root: string,
  planIndex: number,
  targets: readonly (readonly string[])[],
): Promise<TraversalCandidate[]> {
  const [overridePrefix, fallbackPrefix] = targets;
  if (overridePrefix === undefined || fallbackPrefix === undefined) {
    throw new TypeError('codex-global-first-non-empty requires the two ordered targets');
  }
  const published = (
    prefix: readonly string[],
    selectorIndex: number,
    outcome: CandidateOutcome,
  ): TraversalCandidate => ({
    rawSegments: prefix,
    publicPath: toPublicPath(prefix),
    admissions: [{ planIndex, selectorIndex }],
    outcome,
  });
  const override = await probeExactTarget(root, overridePrefix, { planIndex, selectorIndex: 0 });
  if (override !== null) {
    const outcome = override.knownUnreadable
      ? ({ kind: 'unreadable' } as const)
      : await readCandidate(join(root, ...overridePrefix));
    if (outcome.kind !== 'readable') {
      // An unreadable or binary override ends the branch with its file
      // Diagnostic and no fallback (FR-035).
      return [published(overridePrefix, 0, outcome)];
    }
    if (outcome.sourceText.trim().length > 0) {
      // A readable non-empty override is the single published file and
      // short-circuits without any operation on the fallback target.
      return [published(overridePrefix, 0, outcome)];
    }
    // A readable empty override advances to the fallback target.
  }
  const fallback = await probeExactTarget(root, fallbackPrefix, { planIndex, selectorIndex: 1 });
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
  return [published(fallbackPrefix, 1, outcome)];
}

/** Input of one Source scan attempt over compiled plans. */
export interface TraversalScanInput {
  /** The retained selected raw root — the base of every operation (FR-001). */
  readonly root: string;
  /** The compiled inspection allowlist to interpret as data (FR-019). */
  readonly plans: readonly TraversalPlan[];
  /**
   * Called as the attempt works, with what it has done so far. It exists so a
   * refresh during a long scan shows movement rather than the zeros the attempt
   * was admitted with; the walk ignores what it returns and is never paced by
   * it (contracts/http-api.md § get-session `progress`).
   *
   * Every counter is the attempt's own tally rather than a projection of the
   * published result: an override read that turned out empty still cost
   * bytes, so counting the publication afterwards would understate the work.
   */
  readonly onProgress?: (update: {
    readonly phase: 'enumerating' | 'reading';
    readonly visitedEntries: number;
    readonly candidateFiles: number;
    readonly readBytes: number;
    /**
     * Attempt-local diagnostics accumulated so far (data-model.md
     * § ScanProgress). Zero through both traversal phases: the per-file
     * outcomes assembly turns into diagnostics are decided after this walk.
     */
    readonly diagnosticCount: number;
  }) => void;
}

/**
 * Runs one Source scan attempt: enumerates the compiled allowlist with an
 * ordinary recursive walk, then reads every discovered file exactly once
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
  } catch (error) {
    // Only a failure that is about this root makes the Source unreadable
    // (FR-002). An `EMFILE` or `ENOMEM` says the process ran out of a resource,
    // which is not confined to one Source and must not be reported as a
    // repository the user could fix.
    if (isRootEnumerationFailure(error, input.root)) {
      return { kind: 'root-unreadable' };
    }
    throw error;
  }

  // Collect every repository program so the root is enumerated once for the
  // whole attempt; Global selectors probe or walk only their fixed targets.
  const repositoryPrograms: ProgramState[] = [];
  const subtreeWalks: {
    fixedPrefix: readonly string[];
    remainder: readonly MatcherSegment[];
    origin: SelectorOrigin;
  }[] = [];
  const exactTargets: { fixedPrefix: readonly string[]; origin: SelectorOrigin }[] = [];
  const fallbackRuns: { planIndex: number; targets: readonly (readonly string[])[] }[] = [];
  for (const [planIndex, plan] of input.plans.entries()) {
    if (plan.selectionPolicy === 'codex-global-first-non-empty') {
      fallbackRuns.push({
        planIndex,
        targets: plan.selectors.map((selector) => selector.fixedPrefix),
      });
      continue;
    }
    for (const [selectorIndex, selector] of plan.selectors.entries()) {
      const origin: SelectorOrigin = { planIndex, selectorIndex };
      switch (selector.mode) {
        case 'repository-program':
          repositoryPrograms.push({ program: selector.remainder, position: 0, origin });
          break;
        case 'global-exact':
          exactTargets.push({ fixedPrefix: selector.fixedPrefix, origin });
          break;
        case 'global-fixed-subtree':
          subtreeWalks.push({
            fixedPrefix: selector.fixedPrefix,
            remainder: selector.remainder,
            origin,
          });
          break;
      }
    }
  }

  const discovered = new Map<string, PendingCandidate>();
  // What the walk actually looked at, so a completed scan reports its own work
  // instead of the zero the progress counters were admitted with. The candidate
  // tally is read from `discovered` at report time rather than tracked
  // separately: it is the same fact, and two counters could disagree.
  const counters = {
    visitedEntries: 0,
    report:
      input.onProgress === undefined
        ? undefined
        : (visitedEntries: number) =>
            input.onProgress?.({
              phase: 'enumerating',
              visitedEntries,
              candidateFiles: discovered.size,
              readBytes: 0,
              diagnosticCount: 0,
            }),
  };

  // A Repository scan must fail on a selected root that exists but cannot be
  // read as a directory (mode 000), not just a missing/non-directory one
  // (FR-002). The `stat` classification above accepts an unreadable
  // directory, and when the shipped catalog is empty there is no
  // repository-program walk below to surface the `readdir` failure. When any
  // selector is present the correct path already runs — a repository-program
  // walk enumerates the root and reports its own root `readdir` failure, and
  // a Global exact/subtree scan deliberately never enumerates its tool-home
  // root — so this readability probe applies only to the empty-catalog
  // Repository scan and never enumerates a Global root.
  if (
    repositoryPrograms.length === 0 &&
    exactTargets.length === 0 &&
    subtreeWalks.length === 0 &&
    fallbackRuns.length === 0
  ) {
    try {
      await readdir(input.root);
    } catch (error) {
      rethrowIfResourceExhaustion(error);
      return { kind: 'root-unreadable' };
    }
  }

  if (repositoryPrograms.length > 0) {
    const visited = new Set<string>();
    let rootReal: string;
    try {
      rootReal = await realpath(input.root);
      visited.add(rootReal);
    } catch (error) {
      rethrowIfResourceExhaustion(error);
      return { kind: 'root-unreadable' };
    }
    try {
      await walkDirectory(
        input.root,
        [],
        repositoryPrograms,
        visited,
        discovered,
        counters,
        rootReal,
      );
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
    const candidate = await probeExactTarget(input.root, target.fixedPrefix, target.origin);
    if (candidate !== null) {
      recordCandidate(discovered, candidate);
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
    try {
      await walkDirectory(
        subtreeRoot,
        [...subtree.fixedPrefix],
        [{ program: subtree.remainder, position: 0, origin: subtree.origin }],
        new Set<string>([subtreeReal]),
        discovered,
        counters,
        // This walk is bounded by the subtree it was given, so that is the
        // container the VCS exclusion is judged against.
        subtreeReal,
      );
    } catch (error) {
      // `realpath` succeeds on a regular file, so a prefix that exists but is
      // not a directory only fails at the first `readdir`. That is the same
      // no-match the missing case above is: a fixed subtree that is not a
      // directory contains nothing (FR-018). A failure anywhere below it is
      // not confined to one file and still propagates.
      // Missing or not a directory is the documented no-match (FR-018). A
      // denied or failing subtree that exists is not "absent": it is not
      // confined to one file and propagates.
      if (isMissingOrNotDirectory(error, subtreeRoot)) {
        continue;
      }
      throw error;
    }
  }

  const files: TraversalCandidate[] = [];
  // Bytes this attempt accepted, counted as they are read. The publication
  // cannot supply it: an empty override is read but not published.
  let readBytes = 0;
  for (const candidate of discovered.values()) {
    const outcome = candidate.knownUnreadable
      ? ({ kind: 'unreadable' } as const)
      : await readCandidate(join(input.root, ...candidate.rawSegments));
    readBytes += 'sizeBytes' in outcome ? outcome.sizeBytes : 0;
    input.onProgress?.({
      phase: 'reading',
      visitedEntries: counters.visitedEntries,
      candidateFiles: discovered.size,
      readBytes,
      diagnosticCount: 0,
    });
    files.push({
      rawSegments: candidate.rawSegments,
      publicPath: toPublicPath(candidate.rawSegments),
      admissions: normalizeSelectorOrigins(candidate.origins),
      outcome,
    });
  }

  // The fallback selection reads its own targets, so its results arrive already
  // decided rather than through `discovered`. They still join one published
  // set: a target a walked selector also admitted is one file with two
  // admissions, and pushing it twice would read it twice and publish it twice
  // (contracts/inspection-path-allowlist.md § Common conformance requirements).
  // Indexed by published path, so a merge can replace the entry in place and a
  // third overlapping admission still finds it. Holding the record alone would
  // leave a stale object behind after the first merge, and looking that object
  // up again would find nothing.
  const publishedAt = new Map(files.map((file, index) => [file.publicPath, index]));
  for (const run of fallbackRuns) {
    for (const selected of await runCodexFirstNonEmpty(input.root, run.planIndex, run.targets)) {
      const index = publishedAt.get(selected.publicPath);
      if (index === undefined) {
        publishedAt.set(selected.publicPath, files.length);
        files.push(selected);
        continue;
      }
      // One file, both admissions: the walk already read it, so its outcome
      // stands and only the provenance is merged.
      const existing = files[index]!;
      files[index] = {
        ...existing,
        admissions: normalizeSelectorOrigins([...existing.admissions, ...selected.admissions]),
      };
    }
  }

  // Deterministic result order: the public path, which is unique — it is the
  // raw entry names joined, and a filesystem holds one entry per name — so
  // opaque IDs and enumeration interleaving never supply the order.
  files.sort((left, right) => (left.publicPath < right.publicPath ? -1 : 1));
  return {
    kind: 'scanned',
    files,
    visitedEntries: counters.visitedEntries,
    candidateFiles: discovered.size,
    readBytes,
  };
}

// The FR-002 outcome covers exactly the selected root that does not exist or
// cannot be read as a directory. The walk enumerates the root first, so a
// failure naming the root path with an enumeration errno is the root's own.
function isMissingOrNotDirectory(error: unknown, path: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const failure = error as { code?: string; path?: string };
  return failure.path === path && (failure.code === 'ENOENT' || failure.code === 'ENOTDIR');
}

function isRootEnumerationFailure(error: unknown, root: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { code, path } = error as { code?: string; path?: string };
  // `ELOOP` belongs here for the same reason as the rest: a root that is a
  // symbolic-link cycle cannot be enumerated as a directory, and FR-002 asks
  // for the `root-unreadable` Diagnostic rather than an exception the launch
  // reports as an unexpected failure.
  return (
    path === root &&
    (code === 'ENOENT' ||
      code === 'ENOTDIR' ||
      code === 'EACCES' ||
      code === 'EPERM' ||
      code === 'ELOOP')
  );
}
