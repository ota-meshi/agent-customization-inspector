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
import { access, fsConstants, lstat, readFile, readdir, realpath, stat } from './fs-io';
import { sep } from 'node:path';
import { decodeSourceBytes, type ReadableFileEncoding } from '../../shared/entities';
import {
  assertLoadableTraversalPlan,
  ProgramLevel,
  normalizeSelectorOrigins,
  type ConfiguredDerivedPlan,
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
 * One candidate read a stage-one configuration reader already performed,
 * handed to the walk so the same physical file is never read twice in one
 * attempt (T282): the walk's classification cache is pre-populated with it,
 * and the reader's bytes join the attempt's tally. Produced today by the
 * Codex configuration read for `.codex/config.toml`, whose path the walk
 * also admits as the `codex.repo.config` candidate.
 */
export interface SeededCandidateRead {
  /** The exact path segments of the file the reader opened, as its rule spells them. */
  readonly rawSegments: readonly string[];
  /** The reader's classification, exactly as the walk would have produced it. */
  readonly outcome: CandidateOutcome;
}

/**
 * What one vendor's stage-one configuration read contributes to the coming
 * scan (T1090): the derived plans its configuration activated, and the
 * candidate reads it performed while deciding them, seeded into the walk so
 * one physical file is read once per attempt ({@link SeededCandidateRead}).
 */
export interface ConfigurationReadResult {
  /** The derived rules the configuration activated, with their plans. */
  readonly plans: readonly ConfiguredDerivedPlan[];
  /** The candidate reads the reader performed, for the walk's cache. */
  readonly seededReads: readonly SeededCandidateRead[];
}

/**
 * One discovered candidate file with its read outcome. The segments the plan
 * retained stay the filesystem operands, and the public path is those
 * segments `/`-joined (FR-024); the joined string is never decoded back into
 * an operand.
 *
 * Where a segment comes from is the plan's, not this type's: a walk keeps the
 * entry name the enumeration returned, and a targeted fixed path — which
 * enumerates no parent — keeps the rule's own immutable spelling
 * ({@link probeExactTarget}). `raw` in the field name says the segment is
 * unescaped and unnormalized, which both are; it does not say it was
 * enumerated.
 */
export interface TraversalCandidate {
  /** The exact segments used for filesystem operations. */
  readonly rawSegments: readonly string[];
  /** Those segments `/`-joined, relative to the root; the public identity. */
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
      /**
       * Allowlisted candidate files this attempt has identified (data-model.md
       * § ScanProgress), from each of the three ways a plan reaches one: a
       * recursive walk of a directory plan, one exact target a plan names
       * directly, and the ordered targets a first-non-empty plan probes until
       * one of them decides. The first two are recorded as discoveries; only the
       * last is counted where it is probed, because a decided-against target is
       * never recorded. Identified rather than read: an entry whose unreadable
       * outcome the walk or the probe already established is counted with the
       * rest and never opened, and the figure keeps growing across the phase
       * boundary instead of restarting from what has been read so far.
       */
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
 * VCS internals: the repository's own machinery rather than customizations
 * authored in it, excluded wherever the walk would reach them — by entry name
 * as an entry is met, and on the resolved real path through
 * {@link isVcsInternalPath} (contracts/inspection-path-allowlist.md).
 * Exported so any other enumeration excludes exactly the same names rather
 * than keeping a second list that could drift from this one.
 *
 * Matched as the filesystem spelled the entry. On a case-insensitive volume a
 * directory Git manages can be spelled `.GIT`, and this walk enters it: what
 * decides is the volume's own name resolution, which no platform check
 * answers — macOS ships both kinds of volume — and folding case by platform
 * would hide a `.GIT` a reader authored on a case-sensitive one. The outcome
 * of entering is that a customization file inside VCS machinery is listed,
 * which is over-listing on a surface whose whole claim is that being listed is
 * not being loaded; nothing is executed and nothing outside the selected root
 * is read.
 */
export const VCS_INTERNALS = new Set(['.git', '.hg', '.svn']);

/**
 * Installed-package directory names the walk never enters
 * (contracts/inspection-path-allowlist.md).
 *
 * A `node_modules` directory holds packages a package manager installed, so a
 * customization file inside one belongs to the package that shipped it and is
 * reproduced from the manifest and lockfile rather than authored in the
 * repository under inspection. A product may still read such a file at
 * runtime — Claude Code discovers a `CLAUDE.md` in any subdirectory it reads a
 * file in — so this narrows what the inventory reports rather than describing
 * what an agent can load.
 *
 * Two things separate this from the VCS internals above. It is decided once
 * the entry's type is resolved, because the exclusion is about a directory: an
 * entry of this name that resolves to a regular file is an ordinary file. And
 * it is decided by entry name alone, never on the resolved real path: reaching
 * an object store is wrong however the walk got there, while a directory the
 * repository placed at a path of its own is the repository's, whatever its
 * link resolves to — a symbolic link at an authored location is inventoried on
 * that location's terms, the same reason links are followed transparently at
 * all (FR-024).
 *
 * Decided by name rather than by any ignore file the repository carries: an
 * ignore file states what its own tooling skips, which is a different question
 * and a moving one, and reading it would make the inventory depend on a file
 * the reader did not write for this purpose. Another ecosystem's
 * installed-dependency directory arrives with the report that names it.
 */
export const INSTALLED_PACKAGE_DIRECTORIES = new Set(['node_modules']);

/**
 * Whether any step of a declared, Source-relative path names a directory the
 * walk never descends into — VCS internals or an installed-package directory
 * (contracts/inspection-path-allowlist.md § Bounded companion census).
 *
 * This is the spelling half of the census exclusion, answered from the
 * declared segments alone with no I/O: a plugin root comes from a catalog
 * entry's declared source, so `./.git/pkg` and `./node_modules/pkg` are
 * spellings a file can ask for, and the caller that would otherwise enumerate
 * ancestors to validate such a spelling must refuse it first — the census
 * publishes nothing from these directories, so listing inside them buys
 * nothing and a permission error there would fail a scan over a place the
 * inventory never reports (FR-029).
 */
export function hasExcludedDirectorySegment(segments: readonly string[]): boolean {
  return segments.some(
    (segment) => VCS_INTERNALS.has(segment) || INSTALLED_PACKAGE_DIRECTORIES.has(segment),
  );
}

/**
 * Whether a resolved real path reaches VCS internals the container's own path
 * does not already carry. The entry-name check alone is not enough: an entry
 * named anything else can be a symbolic link to `.git`, and following it would
 * enumerate the repository's object store as customization content. Descent is
 * therefore decided on the resolved path, which is the only spelling that
 * cannot be renamed around (contracts/inspection-path-allowlist.md
 * § Traversal).
 *
 * The container's shared prefix is exempt, segment for segment. The exclusion
 * is about what a scan descends into, not about where the user keeps the tree
 * they selected: a root whose own path happens to contain `.git` — a checkout
 * at `/srv/.git/worktree`, a temporary fixture — is an ordinary root, and
 * testing its whole absolute path would scan nothing at all. The comparison is
 * by exact segments rather than `path.relative`, whose result for two Windows
 * paths on different drives is an absolute path with no shared prefix at all —
 * an alias resolving to another volume's `.git` must answer the same way the
 * same alias on the container's own volume does.
 */
export function isVcsInternalPath(containerReal: string, realPath: string): boolean {
  const containerSegments = containerReal.split(sep);
  const realSegments = realPath.split(sep);
  let shared = 0;
  while (
    shared < containerSegments.length &&
    shared < realSegments.length &&
    containerSegments[shared] === realSegments[shared]
  ) {
    shared += 1;
  }
  return realSegments.slice(shared).some((segment) => VCS_INTERNALS.has(segment));
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
 * The closed environment-failure errnos: the machine ran out of descriptors or
 * memory, the device failed, or the mount handle went stale. Each says
 * something about the machine and nothing about the file being read, and the
 * Constitution requires such a failure to abort the publication attempt rather
 * than be folded into a per-file outcome (Constitution § Quality and Safety
 * Standards; FR-029).
 *
 * Why these five and not a judgement about causes: the alternative is what a
 * per-file outcome would say. `file-unreadable` tells the reader the file may
 * have been removed or its permissions may deny reading, and that the other
 * files were unaffected. On `EIO` or `ESTALE` all three are wrong — the file
 * is fine, and whether the rest of the tree was read is exactly what a failing
 * device or a vanished mount makes unknowable — so publishing a partial
 * generation over one would state a condition of the machine as a property of
 * the reader's content. This is one closed set, not a second allowlist beside
 * another: every other errno stays classified by where the failure occurred
 * (spec.md § Clarifications, the file-size and partial-generation answer).
 */
const ENVIRONMENT_FAILURE_CODES = new Set(['EMFILE', 'ENFILE', 'ENOMEM', 'EIO', 'ESTALE']);

/**
 * Rethrows an environment failure so the attempt aborts, and returns otherwise
 * so the caller can classify what is genuinely a fact about the path it was
 * reading. A rule that held only for `readFile` would report the machine
 * running out of descriptors as an unreadable file at one call site and as an
 * unreadable root at another, so no `catch` here or in the companion census
 * turns a filesystem failure into an outcome for a path without first ruling
 * these errnos out. Most call this. The root and fixed-subtree catches rule them
 * out by construction instead: each converts only its own closed errno set —
 * missing, not a directory, unreadable, a link cycle — which these codes are not
 * in, and rethrows everything else.
 */
export function rethrowIfEnvironmentFailure(error: unknown): void {
  if (ENVIRONMENT_FAILURE_CODES.has((error as { code?: string }).code ?? '')) {
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
    // Reached when the machine fails partway through a repository: it ran out
    // of descriptors or memory, the device failed, or the mount handle went
    // stale. Reporting `unreadable` would send the reader to check permissions
    // on a file that is fine and claim the other files were unaffected, which
    // is the one thing such a failure makes unknowable.
    //
    // Everything else is this file's own `unreadable` outcome, by the closed
    // model: at the single-file boundary a failure is "classified by where the
    // failure occurred rather than by inspecting its cause", and the one
    // closed cause check is the environment-failure set above (spec.md
    // § Clarifications, file-size limits and partial-generation answers).
    rethrowIfEnvironmentFailure(error);
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
// so a link cycle terminates (FR-024).
//
// Error policy below the root, in the order the branches ask it. A
// environment-failure errno is a condition of the machine rather than of the
// entry, so it aborts the attempt (FR-029, {@link rethrowIfEnvironmentFailure}).
// A failure on an entry some selector admits as a file is that file's
// `file-unreadable` Diagnostic (FR-024). A missing entry at a step no
// candidate stands on — `ENOENT`/`ENOTDIR` from the classification stat or
// from the descent realpath — is skipped, and the attempt publishes what it
// did reach: a live checkout moves under a read-only walk, and the
// release-evidence manifest fixes that outcome as case
// `sc004.directory-mutation.during-enumeration`, whose expected outcome is
// that such a walk "leaves the attempt publishable" — so aborting here would
// reduce an SC-004 denominator, which spec.md § Release-Evidence Fixture
// Governance admits only through a manifest-version increment and review.
// This skip is not the exact-target conversion spec.md's expected-absence
// clarification confines to the Global exact-file rules: no branch here
// produces the closed `absent` outcome, and that same clarification's "no
// `entry-disappeared` or race-detection taxonomy" is what forbids giving a
// vanished directory step an outcome of its own. Every other failure is not
// confined to one file and propagates (FR-030).
async function walkDirectory(
  absoluteDir: string,
  rawSegments: readonly string[],
  states: readonly ProgramState[],
  visitedRealPaths: Set<string>,
  discovered: Map<string, PendingCandidate>,
  counters: { visitedEntries: number; report: ((visitedEntries: number) => void) | undefined },
  rootReal: string,
  continueScan: () => boolean,
): Promise<void> {
  if (!continueScan()) {
    // Authority left the attempt mid-walk (disable or shutdown): this
    // directory's readdir is a new operation the revocation stops, and what
    // was discovered so far is discarded by the commit gates either way.
    return;
  }
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
    if (!continueScan()) {
      // Authority left mid-directory (disable or shutdown): the remaining
      // entries' stat and realpath calls are each a new filesystem promise the
      // revocation stops (data-model.md § ScanAttempt "stops new scheduling"),
      // and what was discovered is discarded by the commit gates either way.
      return;
    }
    if (VCS_INTERNALS.has(entry.name)) {
      continue;
    }
    // Appended, never `join`ed: the walk's base descends from the admitted
    // root, whose own `..` spelling must keep the operating system's
    // resolution ({@link pathUnderRoot}).
    const entryPath = pathUnderRoot(absoluteDir, [entry.name]);
    const entrySegments = [...rawSegments, entry.name];

    // Which selectors accept this raw name as their terminal regular file,
    // and which programs continue below it as a directory step.
    const fileAdmissions = level.admissionsForFile(entry.name);
    const descendStates = level.statesForDirectory(entry.name);

    // An entry no selector admits and no program descends into decides
    // nothing, so its type is never resolved. Classifying it anyway is what
    // let a neighbour the plan does not name — a self-referential symlink
    // beside an admitted hook file, an entry whose `stat` fails for any
    // non-file-confined reason — abort the whole attempt from a path the
    // scan had no business asking about.
    if (fileAdmissions.length === 0 && descendStates.length === 0) {
      continue;
    }

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
        rethrowIfEnvironmentFailure(error);
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
        rethrowIfEnvironmentFailure(error);
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
    if (isDirectory && INSTALLED_PACKAGE_DIRECTORIES.has(entry.name)) {
      // Decided here rather than beside the VCS name check above, because this
      // exclusion is about a directory: an entry of this name that resolves to
      // a regular file is an ordinary file, and a `.codex/config.toml` naming
      // it as a configured instruction basename admits it like any other.
      continue;
    }
    if (isDirectory && descendStates.length > 0) {
      if (!continueScan()) {
        // Authority left while this entry's classification stat settled: the
        // descent realpath is its own filesystem promise, and revocation
        // stops each one (data-model.md § ScanAttempt "stops new
        // scheduling").
        return;
      }
      // Real-path tracking over the current ancestor chain terminates link
      // cycles (FR-024): a directory is skipped only when its real path is
      // already an ancestor of this descent, so a sibling link to the same
      // physical directory still walks transparently (two public paths, one
      // target — links are not aliases). The realpath read is ordinary and
      // read-only like every other operation.
      let real: string;
      try {
        real = await realpath(entryPath);
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          // The directory went away between its own classification and this
          // descent — a writer on a live checkout: a build finishing, a branch
          // switch. It reaches nothing now, which is the same answer the
          // classification above gives a directory step that reaches nothing,
          // and the attempt publishes what it did reach rather than failing
          // the Source over a tree that moved (FR-030; the walk's error
          // policy above states why this is not an ignored failure).
          continue;
        }
        // Any other failure is not confined to this entry and fails the
        // attempt ordinarily (FR-030).
        throw error;
      }
      // VCS internals are excluded here as well as by name: the name check
      // above cannot see a link that reaches an object store under another
      // spelling, and enumerating one is wrong however the walk got there.
      // `node_modules` is deliberately not re-checked on the resolved path — a
      // directory the repository placed at a path of its own is the
      // repository's, whatever its link resolves to. Judged against the Source
      // root, so a root that itself lives under a `.git` path is an ordinary
      // root.
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
        continueScan,
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

/**
 * The path of `segments` below `root`, appended without normalizing either.
 *
 * `node:path.join` is deliberately not used. It collapses `..` lexically,
 * while the operating system resolves it after following whatever the previous
 * component was — so for a root ending in `link/..` the two disagree, and the
 * scan would read a directory other than the one admission checked. Measured:
 * with `link` a symbolic link, `stat(root)` reaches the link target's parent
 * while `join(root, 'AGENTS.md')` reaches the link's own parent, and the two
 * hold different files.
 *
 * Appending keeps the platform's own path handling in charge of the whole
 * string, which is what the root's resolution semantics surviving to the read
 * means — and what the consent preview promises by freezing the captured
 * string without normalizing it (spec.md § Clarifications, FR-002).
 *
 * Exported because the session builds the same absolute path when it hands a
 * committed file to an application on the reader's machine
 * (`session.ts` § openCommittedFile): a second construction there would let a
 * launch reach a file the scan never read, which is this rule's whole subject.
 */
export function pathUnderRoot(root: string, segments: readonly string[]): string {
  // A root that already ends in a separator would otherwise produce a doubled
  // one. `/` and `C:\` become the empty string and `C:`, which is what makes
  // the append below reach `/name` and `C:\name`.
  const base = root.endsWith(sep) ? root.slice(0, -sep.length) : root;
  return [base, ...segments].join(sep);
}

// Probes one Global exact target below the admitted root without enumerating
// the root (contracts/inspection-path-allowlist.md § Global least
// privilege): only a missing entry is absent; an existing but unreachable
// entry is a candidate whose read failure surfaces per file (FR-024).
//
// The selection is the operating system's own name resolution, not a
// comparison against an enumerated entry name — there is no enumeration to
// compare against. Measured on macOS/APFS: `lstat` of `AGENTS.override.md`
// succeeds for a file stored as `agents.override.md`, and the candidate is
// published under the selector's literal. That is the contracted meaning of an
// exact-target row rather than a gap: a vendor asking the same filesystem for
// the same literal opens the same file, so the row states what that vendor
// reads. `realpath` would recover the stored name, and is deliberately not
// used for it: it resolves symbolic links too, so a linked target would be
// published under a name outside the Source.
async function probeExactTarget(
  root: string,
  fixedPrefix: readonly string[],
  origin: SelectorOrigin,
  continueScan: () => boolean,
): Promise<PendingCandidate | null> {
  const absolutePath = pathUnderRoot(root, fixedPrefix);
  const pending = (knownUnreadable: boolean): PendingCandidate => ({
    rawSegments: [...fixedPrefix],
    knownUnreadable,
    origins: [origin],
  });
  let entry;
  try {
    entry = await lstat(absolutePath);
  } catch (error) {
    rethrowIfEnvironmentFailure(error);
    const code = (error as { code?: string }).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      // Absent target: no candidate and no sibling discovery (FR-018).
      return null;
    }
    // Anything else is this one target's own outcome: a denial, a directory
    // where a file was named, a broken link. The machine's own failures left
    // through the line above, which is the same closed set
    // {@link readCandidate} applies to the same file.
    return pending(true);
  }
  if (entry.isSymbolicLink()) {
    if (!continueScan()) {
      // Authority left while the lstat settled (disable or shutdown): the
      // through-the-link stat is its own filesystem promise, and revocation
      // stops each one (data-model.md § ScanAttempt). No candidate: the
      // revoked attempt's results are discarded by the commit gates either
      // way, so nothing is fabricated for a probe that never finished.
      return null;
    }
    // Transparent read through the link (FR-024): a dangling or unreadable
    // target is this candidate's file-unreadable outcome, not absence.
    try {
      const target = await stat(absolutePath);
      return pending(!target.isFile());
    } catch (error) {
      // The same closed judgement as the `lstat` above, for the same one
      // file: an environment failure aborts the attempt, and every other
      // failure — a dangling link, a denied target — is this candidate's own
      // file-unreadable outcome.
      rethrowIfEnvironmentFailure(error);
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
  classifyOnce: (
    rawSegments: readonly string[],
    knownUnreadable: boolean,
  ) => Promise<CandidateOutcome>,
  continueScan: () => boolean,
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
  const override = await probeExactTarget(
    root,
    overridePrefix,
    { planIndex, selectorIndex: 0 },
    continueScan,
  );
  if (override !== null) {
    const outcome = await classifyOnce(overridePrefix, override.knownUnreadable);
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
  if (!continueScan()) {
    // Authority left while the override branch settled: the fallback probe is
    // a new filesystem promise the revocation stops, and a revoked attempt's
    // selection is discarded by the commit gates either way.
    return [];
  }
  const fallback = await probeExactTarget(
    root,
    fallbackPrefix,
    { planIndex, selectorIndex: 1 },
    continueScan,
  );
  if (fallback === null) {
    return [];
  }
  const outcome = await classifyOnce(fallbackPrefix, fallback.knownUnreadable);
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
  /**
   * Whether the attempt may still publish, asked before each new filesystem
   * operation: disable or shutdown "stops new scheduling" without a
   * cancellation signal — the one read already in flight finishes, and the
   * walk simply starts no further readdir, probe, or candidate read once
   * authority is gone (data-model.md § ScanAttempt; contracts/http-api.md
   * § Concurrency and lifecycle). Absent means authority always holds.
   */
  readonly continueScan?: () => boolean;
  /** The compiled inspection allowlist to interpret as data (FR-019). */
  readonly plans: readonly TraversalPlan[];
  /**
   * Candidate reads a configuration reader already performed in stage one —
   * the Codex `.codex/config.toml` read that decided the fallback plans —
   * seeded into this walk's classification cache, so the one physical file
   * the reader opened is never opened again by the walk that admits it as a
   * candidate: one read, one text, one byte count, and a generation whose
   * fallback plan and published carrier cannot disagree about the file's
   * contents (contracts/inspection-path-allowlist.md § Common conformance
   * requirements, T282).
   */
  readonly seededReads?: readonly SeededCandidateRead[];
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
 * The closed failure codes that state a path's own condition — missing, not
 * a directory, denied, or a link cycle — as opposed to an environmental
 * failure such as `EIO` or `ESTALE`, which describes the machine's moment
 * rather than the repository's state. A root or configuration-seed probe
 * converts only these into its deterministic answer; anything else
 * propagates as the attempt's ordinary error, exactly as a deeper walk
 * failure does (FR-030: commit nothing, retain the prior snapshot).
 */
export const PATH_CONDITION_FAILURE_CODES: ReadonlySet<string> = new Set([
  'ENOENT',
  'ENOTDIR',
  'EACCES',
  'EPERM',
  'ELOOP',
]);

/**
 * Runs one Source scan attempt: enumerates the compiled allowlist — walking a
 * directory plan, probing the exact target of a plan that names one, and
 * probing a selection-policy plan's targets in order — then classifies every
 * candidate it identified exactly once: one read each, except where a walk or a
 * probe already established the file is unreadable (FR-019, FR-024, FR-028). A
 * missing or unreadable root returns the `root-unreadable` result that fails the
 * Source attempt (FR-002); a failure not confined to one file propagates to the
 * caller unchanged.
 */
export async function runTraversalScan(input: TraversalScanInput): Promise<TraversalScanResult> {
  const continueScan = input.continueScan ?? ((): boolean => true);
  for (const plan of input.plans) {
    assertLoadableTraversalPlan(plan);
  }

  if (!continueScan()) {
    // Authority left before the first operation (disable or shutdown): the
    // root's own stat is a new filesystem operation the revocation stops,
    // and the empty result is discarded by the commit gates either way — an
    // honest empty walk, never the root-unreadable verdict of a root nobody
    // looked at.
    return { kind: 'scanned', files: [], visitedEntries: 0, candidateFiles: 0, readBytes: 0 };
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
    // And readable-and-searchable, the same pair consent admitted a Global
    // root by (`global-admission.ts`). The Repository walk would meet an
    // unreadable root at its own first `readdir`, but a Global plan probes
    // exact targets and fixed subtrees without ever enumerating the member
    // root — so without this, a home whose mode changed after consent would
    // publish `complete` from whatever exact files still opened, reporting a
    // directory this process can no longer read as a directory it read
    // whole. Classification, not enumeration: the no-root-enumeration
    // guarantee holds (contracts/inspection-path-allowlist.md § Global least
    // privilege).
    if (!continueScan()) {
      // The `stat` above suspended this attempt; a disable or shutdown
      // accepted while it ran revoked the authority this `access` would start
      // new Source I/O under (T1007). Asked here rather than only before the
      // `stat`, because the revocation the check exists for arrives during an
      // await — and answered with the same empty walk the pre-stat check
      // gives, never the root-unreadable verdict of a root nobody looked at.
      return { kind: 'scanned', files: [], visitedEntries: 0, candidateFiles: 0, readBytes: 0 };
    }
    await access(input.root, fsConstants.R_OK | fsConstants.X_OK);
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
  const firstNonEmptyRuns: { planIndex: number; targets: readonly (readonly string[])[] }[] = [];
  for (const [planIndex, plan] of input.plans.entries()) {
    if (plan.selectionPolicy === 'codex-global-first-non-empty') {
      firstNonEmptyRuns.push({
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
  // Stage one's bytes precede the walk (the scan reports them before calling
  // in), so every report here starts from them: a mid-walk `enumerating`
  // update must not show fewer bytes than the report that preceded the walk
  // (data-model.md § ScanProgress: the counters are monotonically
  // non-decreasing within an attempt).
  const seededBytes = (input.seededReads ?? []).reduce(
    (total, seeded) => total + ('sizeBytes' in seeded.outcome ? seeded.outcome.sizeBytes : 0),
    0,
  );
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
              readBytes: seededBytes,
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
    firstNonEmptyRuns.length === 0
  ) {
    try {
      await readdir(input.root);
    } catch (error) {
      // The same closed judgement the stat catch above makes: only a
      // failure stating this root's own condition is the deterministic
      // `root-unreadable`; an environmental `EIO`/`ESTALE` propagates as
      // the attempt's ordinary error (FR-030).
      if (isRootEnumerationFailure(error, input.root)) {
        return { kind: 'root-unreadable' };
      }
      throw error;
    }
  }

  if (repositoryPrograms.length > 0 && continueScan()) {
    const visited = new Set<string>();
    let rootReal: string;
    try {
      rootReal = await realpath(input.root);
      visited.add(rootReal);
    } catch (error) {
      // The same closed judgement as the probes above (FR-030): an
      // environmental failure propagates instead of becoming the root's
      // own condition.
      if (!isRootEnumerationFailure(error, input.root)) {
        throw error;
      }
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
        continueScan,
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
    if (!continueScan()) {
      // See walkDirectory: no further probe starts once authority is gone.
      break;
    }
    const candidate = await probeExactTarget(
      input.root,
      target.fixedPrefix,
      target.origin,
      continueScan,
    );
    if (candidate !== null) {
      recordCandidate(discovered, candidate);
    }
  }

  for (const subtree of subtreeWalks) {
    if (!continueScan()) {
      // See walkDirectory: no further subtree realpath or walk starts once
      // authority is gone.
      break;
    }
    const subtreeRoot = pathUnderRoot(input.root, subtree.fixedPrefix);
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
        continueScan,
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
  // Bytes this attempt accepted, counted as they are read, starting from the
  // stage-one reads that arrived already performed. The publication cannot
  // supply it: an empty override is read but not published.
  let readBytes = seededBytes;
  // Candidates a first-non-empty plan classified without recording them as
  // discoveries: it probes its targets in order and publishes only the one that
  // decides. Counted here so the published figure covers them, while a walk's
  // discoveries and a directly named exact target — both recorded — are counted
  // from `discovered`. The two sets are disjoint by construction:
  // this counts a key the walk never recorded, which is what keeps
  // `candidateFiles` one growing quantity across both phases rather than two
  // different ones (data-model.md § ScanProgress: the counters are
  // monotonically non-decreasing within an attempt).
  let firstNonEmptyCandidates = 0;
  const candidateCount = (): number => discovered.size + firstNonEmptyCandidates;
  // Every candidate this attempt classified, by raw key — one read each, except
  // where a walk or a probe already established the file is unreadable, which
  // reaches no filesystem call. The recorded candidates below and
  // a first-non-empty selection both go through it, so a file two selectors
  // reach is classified once: a second read would count its bytes twice, and —
  // because a first-non-empty plan publishes the target it decided on from what
  // it read — could decide on bytes that differ from the ones published.
  // Reporting lives here too, so classifying one candidate is what produces a
  // progress update whichever selector asked for it: an attempt whose only work
  // is a first-non-empty target would otherwise report nothing at all.
  const outcomes = new Map<string, CandidateOutcome>();
  // Stage one's own reads arrive pre-classified (see `seededReads`): the
  // cache answer is what makes the walk's later admission of the same path a
  // lookup instead of a second read. Their bytes are already in the tally —
  // `readBytes` starts from `seededBytes` above.
  for (const seeded of input.seededReads ?? []) {
    outcomes.set(rawKey(seeded.rawSegments), seeded.outcome);
  }
  const classifyOnce = async (
    rawSegments: readonly string[],
    knownUnreadable: boolean,
  ): Promise<CandidateOutcome> => {
    const key = rawKey(rawSegments);
    const cached = outcomes.get(key);
    if (cached !== undefined) {
      // No read, no new work, nothing to report.
      return cached;
    }
    if (!discovered.has(key)) {
      firstNonEmptyCandidates += 1;
    }
    const outcome =
      knownUnreadable || !continueScan()
        ? // A revoked attempt reads no further candidate; the unreadable
          // outcome it records here is discarded with the rest of the
          // attempt's results by the commit gates.
          ({ kind: 'unreadable' } as const)
        : await readCandidate(pathUnderRoot(input.root, rawSegments));
    outcomes.set(key, outcome);
    readBytes += 'sizeBytes' in outcome ? outcome.sizeBytes : 0;
    input.onProgress?.({
      phase: 'reading',
      visitedEntries: counters.visitedEntries,
      candidateFiles: candidateCount(),
      readBytes,
      diagnosticCount: 0,
    });
    return outcome;
  };
  for (const candidate of discovered.values()) {
    const outcome = await classifyOnce(candidate.rawSegments, candidate.knownUnreadable);
    files.push({
      rawSegments: candidate.rawSegments,
      publicPath: toPublicPath(candidate.rawSegments),
      admissions: normalizeSelectorOrigins(candidate.origins),
      outcome,
    });
  }

  // A first-non-empty selection classifies its own targets and publishes only
  // the one that decided, so its results arrive already decided rather than as
  // entries in `discovered`. They still join one published set: a target
  // another selector also admitted is one file with two admissions, and pushing
  // it twice would publish that file twice, each copy carrying half of where it
  // came from
  // (contracts/inspection-path-allowlist.md § Common conformance requirements).
  // Only the publication needs merging — both paths classify through
  // `classifyOnce`, so the second one is answered from its cache and reads
  // nothing.
  // Indexed by published path, so a merge can replace the entry in place and a
  // third overlapping admission still finds it. Holding the record alone would
  // leave a stale object behind after the first merge, and looking that object
  // up again would find nothing.
  const publishedAt = new Map(files.map((file, index) => [file.publicPath, index]));
  for (const run of firstNonEmptyRuns) {
    if (!continueScan()) {
      // See walkDirectory: no further probe starts once authority is gone.
      break;
    }
    for (const selected of await runCodexFirstNonEmpty(
      input.root,
      run.planIndex,
      run.targets,
      classifyOnce,
      continueScan,
    )) {
      const index = publishedAt.get(selected.publicPath);
      if (index === undefined) {
        publishedAt.set(selected.publicPath, files.length);
        files.push(selected);
        continue;
      }
      // One file, both admissions: `classifyOnce` answered both with the same
      // outcome, so there is nothing to reconcile and only the provenance is
      // merged.
      const existing = files[index]!;
      files[index] = {
        ...existing,
        admissions: normalizeSelectorOrigins([...existing.admissions, ...selected.admissions]),
      };
    }
  }

  // Deterministic result order: the public path, which is unique — it is the
  // file's own segments joined, and a filesystem holds one entry per name — so
  // opaque IDs and enumeration interleaving never supply the order.
  files.sort((left, right) => (left.publicPath < right.publicPath ? -1 : 1));
  return {
    kind: 'scanned',
    files,
    visitedEntries: counters.visitedEntries,
    // The same growing quantity the reports carried: everything recorded as a
    // discovery plus what a first-non-empty plan classified without recording.
    // `discovered.size` alone would leave that plan's targets out of the count
    // while their bytes were in `readBytes`.
    candidateFiles: candidateCount(),
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

/**
 * Whether `error` says this exact root cannot be read as a directory (FR-002).
 *
 * Exported for the Global admission boundary, which asks the same question
 * about a proposed vendor home before any batch exists: the two must classify
 * a root identically, and a second copy of this list would be the place they
 * drift. Every other failure is not confined to one root and propagates.
 */
export function isRootEnumerationFailure(error: unknown, root: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { code, path } = error as { code?: string; path?: string };
  // `ELOOP` belongs in the set for the same reason as the rest: a root that
  // is a symbolic-link cycle cannot be enumerated as a directory, and FR-002
  // asks for the `root-unreadable` Diagnostic rather than an exception the
  // launch reports as an unexpected failure.
  return path === root && code !== undefined && PATH_CONDITION_FAILURE_CODES.has(code);
}

/**
 * Where one path physically is, or null when the filesystem cannot say — a
 * path that does not exist, or one a link cycle or a permission stops
 * `realpath` from resolving.
 *
 * The editor probe compares spellings, and a spelling is not always where the
 * path leads: a Repository root reached through a symbolic link is read
 * wherever the link points, and a `PATH` entry or configured editor spelled
 * outside the Repository can lead into it. An executable at either is
 * inspected content that a lexical comparison alone would offer and then start
 * (FR-020, FR-022); a root that is a link to `/` is the case that makes the
 * first reachable rather than theoretical. Both callers are the launcher
 * exclusion — startup for the Repository root (`cli.ts`), the probe for each
 * candidate (`file-opener.ts` § outsideInspectedRoots) — and the resolution
 * lives here because filesystem I/O does (QR-003). A proposed personal-setup
 * root is never passed, because FR-013 forbids touching one before the reader
 * has consented to it.
 *
 * Once per candidate, at the moment the candidate is judged — not again
 * between the judgment and the launch. Re-resolving to see whether the answer
 * moved is the repeated identity re-verification FR-019 forbids: the
 * workspace is one the reader already trusts, so what this closes is a link
 * an ordinary checkout has, not a writer racing the probe.
 *
 * Null for a path condition — the closed set {@link PATH_CONDITION_FAILURE_CODES}
 * states, which is the same set the root's own enumeration failure is
 * classified by — because that is an answer about the path rather than a
 * failure of the machine: the caller still has the spelling, and a root
 * nothing can resolve is one the first scan is about to report as unreadable
 * through its own `root-unreadable` Diagnostic (FR-002). One set rather than
 * a narrower one here, because the two questions have one answer: a root
 * whose canonicalization is denied is a root whose `readdir` is denied, so
 * throwing for it would replace that Diagnostic with a startup failure that
 * has no host and no page behind it — `cli.ts` resolves the Repository root
 * before a session exists.
 *
 * Every other failure propagates. Converting an `EIO` into "unresolvable"
 * would hand a caller the same answer a missing path gives, and the launcher
 * exclusion decides on that answer: failure to establish a physical location
 * must not authorize a launcher, and an unexpected filesystem failure is the
 * request's ordinary error rather than a path condition
 * (contracts/http-api.md § open-file; spec.md § Clarifications — a rejected
 * operation that is not a file-confined outcome propagates to the boundary
 * that owns the trigger).
 * @param path an inspected root exactly as it was selected, or one launcher
 *   candidate exactly as the machine spelled it
 */
export async function resolvePhysicalLocation(path: string): Promise<string | null> {
  try {
    return await realpath(path);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== undefined && PATH_CONDITION_FAILURE_CODES.has(code)) {
      return null;
    }
    throw error;
  }
}
