// The bounded companion census
// (contracts/inspection-path-allowlist.md § Bounded companion census): which
// regular files accompany an admitted candidate in its own directory.
//
// It lives apart from `traversal.ts` because it is not part of the allowlist
// walk. The walk executes the shipped selector programs and answers "which
// files may be read"; this answers "what else is in this customization's
// directory", which only a rule that declares the census wants and which no
// selector expresses. Keeping it here leaves the walk generic and makes the
// census something a scan opts into per candidate.
//
// Enumeration only: nothing here reads a byte, admits a candidate, or produces
// a diagnostic, and appearing in the list grants no read authority. The files
// listed stay what they were — relationship targets that are never read through
// those edges — so the list is not evidence that the vendor loads any of them.
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { readdir, realpath } from './fs-io';
import { VCS_INTERNALS, isVcsInternalPath, statThroughLink, toPublicPath } from './traversal';

/**
 * Lists the regular files accompanying `seedPath` in its own directory,
 * recursively, excluding the seed itself and VCS internals. Paths are relative
 * to that directory, NFC-normalized like every other published path (FR-024),
 * and sorted, so two scans of one tree publish the same list.
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
): Promise<readonly string[]> {
  const seedDirectory = dirname(seedPath);
  const rootReal = await realpath(sourceRoot);
  const seedReal = await realpath(seedDirectory);
  if (!isWithin(rootReal, seedReal)) {
    return [];
  }
  const found: string[] = [];
  await collectWithin(seedDirectory, seedPath, seedReal, rootReal, new Set([seedReal]), found);
  // Two raw names can normalize to one published path. The walk rejects such a
  // group rather than choosing between them (spec.md Clarifications § Session
  // 2026-07-20); a census has no diagnostic to publish, so it lists the
  // ambiguous path once instead of twice — two identical rows would be two the
  // reader cannot tell apart. What the list states is therefore the set of
  // paths accompanying the candidate, not the number of directory entries
  // (contracts/inspection-path-allowlist.md § Bounded companion census).
  return [
    ...new Set(found.map((absolute) => toPublicPath(relative(seedDirectory, absolute).split(sep)))),
  ].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
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
        // A dangling link accompanies nothing that can be listed. Any other
        // failure is an enumeration failure and propagates, exactly as the
        // walk's does: reporting a shorter list would state something about the
        // directory on the strength of not having read it.
        const code = (error as { code?: string }).code;
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          continue;
        }
        throw error;
      }
    }
    if (isFile) {
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
