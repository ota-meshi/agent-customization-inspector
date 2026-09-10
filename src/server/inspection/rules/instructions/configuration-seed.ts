// The one configuration seed read every vendor's configuration-read logic
// performs (T1090): probe the exact pinned path, and return the decoded text of
// a present, readable seed — through the same single read path as every
// published file — beside the read it performed, so the scan can seed the
// walk's classification cache with it and the seed's own candidacy reuses this
// read instead of opening the file a second time (T282).
//
// Shared because two vendors read a seed the same way: Codex's
// `.codex/config.toml` and Gemini CLI's `.gemini/settings.json` are both one
// pinned file whose declarations decide what the walk targets, and what
// differs — the format, the key, the plan — is each vendor's own module beside
// this one. One read path rather than two that happen to agree.
import {
  PATH_CONDITION_FAILURE_CODES,
  isVcsInternalPath,
  pathUnderRoot,
  readCandidate,
  rethrowIfEnvironmentFailure,
  statThroughLink,
  type SeededCandidateRead,
} from '../../traversal';
import { realpath } from '../../fs-io';

/**
 * One seed read: the decoded text when the seed is present and readable, or
 * null when it configures nothing, beside the read the walk is seeded with.
 */
export interface ConfigurationSeed {
  /** The decoded text of a present, readable, regular-file seed; null otherwise. */
  readonly sourceText: string | null;
  /** The read performed, for the walk's classification cache; null when no read happened. */
  readonly seededRead: SeededCandidateRead | null;
}

/**
 * Reads one configuration seed for a vendor's configuration-read logic
 * (T1090).
 *
 * A seed this reader cannot decode configures nothing, whichever way it fails:
 * absent, unreadable, binary, or a non-regular entry at the pinned path. That
 * is not a claim withheld from the reader, because the seed is a candidate of
 * its own — the same path a static rule of the vendor admits — so the walk
 * probes it and publishes whatever it classifies there, and an unreadable one
 * carries `file-unreadable` in a partial generation (FR-028). A read that did
 * happen is seeded, so the walk classifies from this reader's bytes rather
 * than opening the file again.
 */
export async function readConfigurationSeed(
  root: string,
  seedSegments: readonly string[],
  continueScan: () => boolean,
): Promise<ConfigurationSeed> {
  // Appended without normalizing (`pathUnderRoot`), like every walk probe and
  // the committed-file launch: `join` would collapse a root's `link/..`
  // lexically while the walk's reads resolve it through the link, so the seed
  // would configure the scan from a different directory's file than the one
  // the walk publishes as the carrier candidate.
  const absolutePath = pathUnderRoot(root, seedSegments);
  let target;
  try {
    // Through the link, like every other read (FR-024): a seed reached by a
    // symbolic link is the file it resolves to.
    target = await statThroughLink(absolutePath);
  } catch (error) {
    // Reached by every repository that ships no seed at the path, by one whose
    // seed is a dangling link, and by one whose seed this process may not
    // stat. All three configure nothing, and none of them is a statement this
    // function has to make about the file: the walk admits the same path as a
    // candidate and publishes what it finds there, so a seed that could not be
    // read is reported as that file's own outcome.
    //
    // Only a failure stating the seed's own condition configures nothing;
    // an environmental `EIO`/`ESTALE` propagates as the attempt's ordinary
    // error (traversal.ts § PATH_CONDITION_FAILURE_CODES), because
    // reporting the machine's moment as "this repository declares nothing"
    // would commit a complete generation missing every configured target —
    // exactly what the environment-failure rethrow already prevents.
    rethrowIfEnvironmentFailure(error);
    const code = (error as { code?: string }).code;
    if (code === undefined || !PATH_CONDITION_FAILURE_CODES.has(code)) {
      throw error;
    }
    return { sourceText: null, seededRead: null };
  }
  if (!continueScan()) {
    // Authority left while the stat settled (disable or shutdown): the VCS
    // realpaths and the read below are each their own filesystem promise,
    // and revocation stops every new one (data-model.md § ScanAttempt). A
    // seed that configures nothing is a late result the commit gates
    // discard.
    return { sourceText: null, seededRead: null };
  }
  if (!target.isFile) {
    // A directory, FIFO, socket, or device at the pinned path configures
    // nothing. The type is decided before the read because the one flag-free
    // `readFile` below would block indefinitely on a FIFO — the same gate
    // `probeExactTarget` applies to an exact target, and the walk gets from
    // its directory-entry types.
    return { sourceText: null, seededRead: null };
  }
  try {
    // The walk decides descent on resolved real paths, so a vendor directory
    // that is a symbolic link into `.git` never becomes a candidate
    // (`isVcsInternalPath`). Configuration must refuse the same spelling:
    // without this gate, the read that configures the scan would come from
    // the VCS store the walk itself excludes, and the derived plans would
    // rest on bytes no candidate can ever publish.
    //
    // The judged path is the seed's parent directory, exactly the walk's own
    // granularity: descent is what the walk resolves, while a *file* entry
    // that is itself a link is inventoried on its authored location's terms
    // (FR-024, traversal.ts § walkDirectory) — so a seed that is a link into
    // `.git` is still a candidate the walk publishes, and refusing to read it
    // here would derive nothing from a carrier whose declaration the
    // inventory shows.
    const rootReal = await realpath(root);
    if (!continueScan()) {
      // See the post-stat check above: the parent realpath is its own
      // filesystem promise.
      return { sourceText: null, seededRead: null };
    }
    if (
      isVcsInternalPath(rootReal, await realpath(pathUnderRoot(root, seedSegments.slice(0, -1))))
    ) {
      return { sourceText: null, seededRead: null };
    }
  } catch (error) {
    // The same closed judgement as the stat above: a seed removed between
    // the probe and the resolution configures nothing, while an
    // environmental failure propagates.
    rethrowIfEnvironmentFailure(error);
    const code = (error as { code?: string }).code;
    if (code === undefined || !PATH_CONDITION_FAILURE_CODES.has(code)) {
      throw error;
    }
    return { sourceText: null, seededRead: null };
  }
  if (!continueScan()) {
    // See the post-stat check above: the candidate read is its own
    // filesystem promise.
    return { sourceText: null, seededRead: null };
  }
  const outcome = await readCandidate(absolutePath);
  return {
    sourceText: outcome.kind === 'readable' ? outcome.sourceText : null,
    seededRead: { rawSegments: seedSegments, outcome },
  };
}
