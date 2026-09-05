// The bounded companion census
// (contracts/inspection-path-allowlist.md § Bounded companion census): which
// regular files accompany an admitted candidate in its own directory.
//
// It lives apart from `traversal.ts` because it is not part of the allowlist
// walk. The walk executes the shipped selector programs and answers "which
// files may be read"; this answers "what else is in this customization's
// directory", which no selector expresses and which only a directory-shaped
// recognized kind wants — the recognizer decides from the kind it recognized,
// and no rule declares a census (contracts/inspection-path-allowlist.md
// § Bounded companion census). Keeping it here leaves the walk generic.
//
// The census enumerates; it does not admit. A file it lists becomes readable
// because it is part of the customization the census bounds — a skill is its
// `SKILL.md` plus the scripts, references, and assets beside it, and a tool that
// showed the entry point but not the files it ships would not be showing the
// customization. What listing still does not do is make a file a *candidate*:
// it acquires no rule, no recognition, no kind, and no place in an inventory of
// its own, and nothing outside this bounded directory becomes readable through
// it (contracts/inspection-path-allowlist.md § Bounded companion census).
//
// Nothing here reads a byte either: this module answers which files accompany
// the candidate and where they are, and the scan does the reading through the
// one read path every other file goes through.
import { isAbsolute, relative, sep } from 'node:path';
import { readdir, realpath } from './fs-io';
import {
  pathUnderRoot,
  INSTALLED_PACKAGE_DIRECTORIES,
  VCS_INTERNALS,
  hasExcludedDirectorySegment,
  isVcsInternalPath,
  rethrowIfEnvironmentFailure,
  statThroughLink,
  toPublicPath,
} from './traversal';

/**
 * One file accompanying an admitted candidate in its own directory.
 *
 * The raw absolute path is the one kept fact — it is the filesystem operand
 * and is never published — and the display path is derived from it on read,
 * because the two address one entry and holding both would be two states
 * that can disagree (FR-024).
 */
export class CompanionFile {
  /** The census root the display path is relative to. */
  readonly #censusRoot: string;

  /** The raw absolute path the scan reads from; never published. */
  public readonly absolutePath: string;

  /** Records one enumerated entry against the directory it was found under. */
  public constructor(censusRoot: string, absolutePath: string) {
    this.#censusRoot = censusRoot;
    this.absolutePath = absolutePath;
  }

  /**
   * Display path relative to the census root — the exact entry names joined
   * with `/`, derived from the entry's own absolute path exactly as the
   * traversal derives every published path (FR-024).
   */
  public get censusRelativePath(): string {
    return toPublicPath(relative(this.#censusRoot, this.absolutePath).split(sep));
  }
}

/**
 * Lists the regular files under `censusRoot`, recursively, excluding VCS
 * internals and installed-package directories, exactly as the walk excludes them (traversal.ts). Display paths are
 * relative to the census root, spelled with the exact entry names like every
 * other published path (FR-024), and sorted, so two scans of one tree publish
 * the same list.
 *
 * The census root is the caller's rather than this function's, because where a
 * customization's directory sits relative to its entry point is a fact about
 * the kind: a skill's `SKILL.md` sits at the skill's own root, while a plugin
 * root carries its manifest one directory below it. The caller decides once and
 * passes both spellings of that directory — this one operates on the raw
 * absolute path, and the addresses the caller builds use its own public prefix,
 * so no published path is decoded back into a filesystem operand (FR-024).
 *
 * The result is relative to the census root rather than to the Source: the
 * caller holds the customization's own Source-relative prefix and prefixes it,
 * so no Source-relative path is re-derived here. `sourceRoot` is not for
 * naming — it is the containment boundary.
 *
 * The list rather than a count is the census result, because the count is
 * `length` and keeping both would be two states that can disagree.
 *
 * The walk starts at a directory the caller named and descends only into
 * directories that really are inside it. That alone does not
 * keep it inside the Source: a skill directory may itself be a symbolic link
 * out of the tree, and its real path would then become a census root somewhere
 * else entirely. So the census root is first required to be inside the Source
 * root's own real path, and a candidate reached through such a link accompanies
 * nothing — the Source is the boundary of what was authorized for inspection,
 * and what lies outside it belongs to no Source.
 *
 * Containment is what bounds this walk: the ordinary traversal is bounded
 * by the selector program, which stops descending once no selector can still
 * match, while a census has no selector and would otherwise follow a link to
 * an ancestor and report the whole repository as one skill's companions. Real
 * paths are tracked the way the ordinary walk tracks them, so a link back into
 * the subtree terminates rather than being walked forever.
 *
 * A symbolic link to a file is listed at the entry's own path, because the
 * entry is what sits in the directory and an agent reading it would resolve the
 * link the same way (FR-024). Only descent is contained; listing is not.
 *
 * An enumeration failure propagates rather than being swallowed, exactly as it
 * does in the ordinary walk: a `readdir` or `realpath` error below the root is
 * not confined to one file, and returning the empty list would publish "nothing
 * accompanies this skill" — a statement about the directory — on the strength of
 * a permission or I/O error. The empty list has one meaning, and this is not it.
 */
export async function listCompanionFiles(
  sourceRoot: string,
  censusRoot: string,
  continueScan: () => boolean = () => true,
): Promise<CompanionCensusResult> {
  if (!continueScan()) {
    // Authority left between the caller's loop-head check and this census
    // (the stat it performed in between settled late): the containment
    // realpath is a new filesystem promise the revocation stops. The result
    // is a late one the commit gates discard, so the verdict it carries is
    // never published either way.
    return { rootContained: true, files: [] };
  }
  const rootReal = await realpath(sourceRoot);
  if (!continueScan()) {
    // Authority left between the two containment realpaths (disable or
    // shutdown, scan.ts § assembleScanPublication authorityHolds): the second
    // is a new filesystem promise the revocation stops (data-model.md
    // § ScanAttempt), and the empty list is a late result the commit gates
    // discard rather than a published census.
    return { rootContained: true, files: [] };
  }
  const censusReal = await realpath(censusRoot);
  if (!isWithin(rootReal, censusReal)) {
    // The verdict travels with the empty list rather than folding into it:
    // "this root's real path is outside the Source" is the census's own
    // established fact, and what lies beyond the boundary belongs to no
    // Source — so a candidate another rule admitted below the same spelling
    // must not be attributed to this root either
    // (contracts/inspection-path-allowlist.md § Bounded companion census).
    // An empty contained directory reads the same as itself, which is why a
    // boolean is published and not derived from `files.length`.
    return { rootContained: false, files: [] };
  }
  if (isExcludedDirectory(relative(sourceRoot, censusRoot), relative(rootReal, censusReal))) {
    return { rootContained: true, files: [] };
  }
  const found: string[] = [];
  await collectWithin(censusRoot, censusReal, rootReal, new Set([censusReal]), found, continueScan);
  return {
    rootContained: true,
    files: found
      .map((absolute) => new CompanionFile(censusRoot, absolute))
      .toSorted((left, right) => (left.censusRelativePath < right.censusRelativePath ? -1 : 1)),
  };
}

/**
 * One census's answer: the files the directory holds, and whether the
 * directory's own real path sits inside the Source at all. The two are one
 * result because the second decides what the first's emptiness means — an
 * escaped root has no files *by verdict*, and the session must not rebuild a
 * membership the census refused (session.ts § pluginRootFilesOf).
 */
export interface CompanionCensusResult {
  /** False exactly when the census root's real path escapes the Source root's. */
  readonly rootContained: boolean;
  /** The files enumerated below a contained root, sorted; empty otherwise. */
  readonly files: readonly CompanionFile[];
}

/**
 * Whether the census root sits where the ordinary walk never descends: inside
 * VCS internals, or inside a directory a package manager filled.
 *
 * The descent below excludes both, so without this the exclusion would depend
 * on where a census started. It is the census root that can be named rather
 * than reached — a plugin root comes from a catalog entry's declared source, so
 * `./.git` and `./node_modules/pkg` are spellings a file can ask for, where the
 * walk could never have arrived at either — and a root inside one of them would
 * publish an object store or an installed package as the files a plugin ships
 * (contracts/inspection-path-allowlist.md § Bounded companion census).
 *
 * Held to the descent's own rule, each half in the descent's own terms
 * (`collectWithin`): VCS internals are excluded by the spelling *and* by where
 * it resolves, because a link is how a declaration reaches an object store
 * under an ordinary name, while an installed-package directory is excluded by
 * the spelling alone, because that name is what a package manager fills and a
 * directory that merely resolves into one is not it. Both are read as the
 * segments below the Source root, so a Source whose own path carries such a
 * segment is an ordinary Source, exactly as `isVcsInternalPath` judges it.
 *
 * `relative` is safe for both arguments because containment is established
 * first: two paths on different Windows volumes never reach this.
 */
function isExcludedDirectory(declaredSteps: string, resolvedSteps: string): boolean {
  return (
    hasExcludedDirectorySegment(declaredSteps.split(sep)) ||
    resolvedSteps.split(sep).some((segment) => VCS_INTERNALS.has(segment))
  );
}

/**
 * Whether `candidate` is `container` itself or lies below it, both given as real
 * paths. `relative` rather than a prefix comparison: a filesystem root already
 * ends in a separator, so appending one would ask whether a path starts with
 * `//` and answer "outside" for every path on the volume.
 */
function isWithin(container: string, candidate: string): boolean {
  if (candidate === container) {
    return true;
  }
  const step = relative(container, candidate);
  if (step === '' || isAbsolute(step)) {
    // An absolute step means the two share no root at all — on Windows, a
    // different volume.
    return step === '';
  }
  // Only a `..` *segment* leaves the container. Testing the prefix alone would
  // read a legitimate entry named `..assets` as an escape.
  return step !== '..' && !step.startsWith(`..${sep}`);
}

/**
 * One directory level of {@link listCompanionFiles}. `censusReal` is the real
 * path of the census root and bounds every descent below it.
 */
async function collectWithin(
  directory: string,
  censusReal: string,
  rootReal: string,
  visitedRealPaths: Set<string>,
  found: string[],
  continueScan: () => boolean,
): Promise<void> {
  if (!continueScan()) {
    // Authority left before this level's enumeration (the census caller's
    // authorityHolds, scan.ts): the readdir is a new filesystem promise the
    // revocation stops (data-model.md § ScanAttempt), and the partial list is
    // a late result the commit gates discard.
    return;
  }
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!continueScan()) {
      // Authority left mid-directory: each remaining entry's stat or realpath
      // is a new filesystem promise the revocation stops, exactly as the
      // ordinary walk stops between entries (traversal.ts § walkDirectory).
      return;
    }
    if (VCS_INTERNALS.has(entry.name)) {
      continue;
    }
    // Appended, never `join`ed: the base descends from the admitted root,
    // whose own `..` spelling must keep the operating system's resolution
    // ({@link pathUnderRoot}).
    const entryPath = pathUnderRoot(directory, [entry.name]);
    let isFile = entry.isFile();
    let isDirectory = entry.isDirectory();
    // A link, or an entry whose type this filesystem does not report — NFS
    // without readdirplus, several FUSE drivers — has to be resolved. Dropping
    // an unresolved entry would understate the directory silently.
    if (entry.isSymbolicLink() || (!isFile && !isDirectory)) {
      try {
        const target = await statThroughLink(entryPath);
        isFile = target.isFile;
        isDirectory = target.isDirectory;
      } catch (error) {
        // Resource exhaustion is a fact about the machine rather than about
        // this entry, so it aborts the attempt (FR-029). Everything else is
        // this entry's own outcome: a link whose target is gone, and one whose
        // target the process may not stat, are both entries a reader can see
        // and an agent would try to open, so they are listed as files rather
        // than dropped. Listing sends them down the one read path every
        // published file takes, which answers `file-unreadable` and says so
        // (FR-024, FR-028). Dropping them would show a skill missing a file its
        // own directory has, and failing the scan would let one entry's
        // permissions decide that the repository has no inventory at all.
        rethrowIfEnvironmentFailure(error);
        isFile = true;
        isDirectory = false;
      }
    }
    if (isFile) {
      found.push(entryPath);
      continue;
    }
    if (isDirectory) {
      if (INSTALLED_PACKAGE_DIRECTORIES.has(entry.name)) {
        // Decided once the type is resolved, because this exclusion is about a
        // directory: a regular file of that name inside a skill's directory is
        // one of the files that ship with the skill, and dropping it would
        // show a skill missing a file its own directory has.
        continue;
      }
      if (!continueScan()) {
        // Authority left while this entry's stat settled: the descent
        // realpath is its own filesystem promise, and revocation stops each
        // one (data-model.md § ScanAttempt "stops new scheduling").
        return;
      }
      const real = await realpath(entryPath);
      // A directory whose real path is outside the census root is not part of
      // this customization's directory, however it is reached. VCS internals
      // are excluded on the resolved path too: the name check above cannot see
      // a link that reaches `.git` under another spelling, and a census that
      // followed one would report the object store as a skill's companions.
      // An installed-package directory is excluded by name alone, exactly as
      // the walk excludes it (traversal.ts).
      if (!isWithin(censusReal, real) || isVcsInternalPath(rootReal, real)) {
        continue;
      }
      if (visitedRealPaths.has(real)) {
        continue;
      }
      visitedRealPaths.add(real);
      await collectWithin(entryPath, censusReal, rootReal, visitedRealPaths, found, continueScan);
      visitedRealPaths.delete(real);
    }
  }
}
