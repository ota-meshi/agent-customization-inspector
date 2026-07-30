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
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { readdir, realpath } from './fs-io';
import {
  VCS_INTERNALS,
  isVcsInternalPath,
  rethrowIfResourceExhaustion,
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
 * Lists the regular files accompanying `seedPath` in its own directory,
 * recursively, excluding the seed itself and VCS internals. Display paths are
 * relative to that directory, spelled with the exact entry names like every
 * other published path (FR-024), and sorted, so two scans of one tree publish
 * the same list.
 *
 * The result is relative to the census root rather than to the Source: the
 * caller holds the candidate's own Source-relative Path and prefixes it, so no
 * Source-relative path is re-derived here. `sourceRoot` is not for naming — it
 * is the containment boundary.
 *
 * The list rather than a count is the census result, because the count is
 * `length` and keeping both would be two states that can disagree.
 *
 * The walk starts at a directory the allowlist traversal already reached and
 * descends only into directories that really are inside it. That alone does not
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
  seedPath: string,
): Promise<readonly CompanionFile[]> {
  const seedDirectory = dirname(seedPath);
  const rootReal = await realpath(sourceRoot);
  const seedReal = await realpath(seedDirectory);
  if (!isWithin(rootReal, seedReal)) {
    return [];
  }
  const found: string[] = [];
  await collectWithin(seedDirectory, seedPath, seedReal, rootReal, new Set([seedReal]), found);
  return found
    .map((absolute) => new CompanionFile(seedDirectory, absolute))
    .toSorted((left, right) => (left.censusRelativePath < right.censusRelativePath ? -1 : 1));
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
 * One directory level of {@link listCompanionFiles}. `seedReal` is the real
 * path of the census root and bounds every descent below it.
 */
async function collectWithin(
  directory: string,
  seedPath: string,
  seedReal: string,
  rootReal: string,
  visitedRealPaths: Set<string>,
  found: string[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (VCS_INTERNALS.has(entry.name)) {
      continue;
    }
    const entryPath = join(directory, entry.name);
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
        rethrowIfResourceExhaustion(error);
        isFile = true;
        isDirectory = false;
      }
    }
    if (isFile) {
      // The seed is what the caller's row already names; every path is the
      // exact entry spelling, and a filesystem holds one entry per name, so
      // the raw comparison is the whole exclusion.
      if (entryPath !== seedPath) {
        found.push(entryPath);
      }
      continue;
    }
    if (isDirectory) {
      const real = await realpath(entryPath);
      // A directory whose real path is outside the census root is not part of
      // this customization's directory, however it is reached. VCS internals
      // are excluded on the resolved path too: the name check above cannot see
      // a link that reaches `.git` under another spelling, and a census that
      // followed one would report the object store as a skill's companions.
      if (!isWithin(seedReal, real) || isVcsInternalPath(rootReal, real)) {
        continue;
      }
      if (visitedRealPaths.has(real)) {
        continue;
      }
      visitedRealPaths.add(real);
      await collectWithin(entryPath, seedPath, seedReal, rootReal, visitedRealPaths, found);
      visitedRealPaths.delete(real);
    }
  }
}
