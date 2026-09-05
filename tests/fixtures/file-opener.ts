// The `FileOpener` double every session under test is built with (T1123).
//
// A session holds the opener so that what a snapshot offers and what an open
// request can launch stay one fact, which means constructing a session names
// one. No suite may launch an application on the machine running it, so this
// records the launches it was asked for instead of performing them, and a test
// asserting which application a request reached reads that record.
import type { FileOpener } from '../../src/server/host/file-opener';
import type { FileOpenTarget } from '../../src/shared/api-types';

/** One launch a session asked the opener for. */
export interface RecordedFileOpen {
  /** The absolute path the session resolved from the committed file. */
  readonly absolutePath: string;
  /** The application the request named. */
  readonly target: FileOpenTarget;
}

/**
 * A {@link FileOpener} that performs nothing and remembers everything. The
 * offered targets are constructor input so a suite can build both machines
 * that matter: one with an editor installation and one without.
 */
export class RecordingFileOpener implements FileOpener {
  /** Every launch this opener was asked for, in request order. */
  public readonly launches: RecordedFileOpen[] = [];

  /** The applications this double claims the machine has. */
  public readonly targets: readonly FileOpenTarget[];

  /** Holds the offered targets; defaults to a machine that has both. */
  public constructor(
    targets: readonly FileOpenTarget[] = ['visual-studio-code', 'default-application'],
  ) {
    this.targets = targets;
  }

  /**
   * Records the request instead of launching anything, and refuses a target
   * this double does not offer — the real opener's own behavior, since it can
   * only launch an application it resolved. A double that accepted what the
   * real one refuses would hide exactly the mistake a suite is here to catch.
   */
  public async openFile(absolutePath: string, target: FileOpenTarget): Promise<void> {
    for (const offered of this.targets) {
      if (offered === target) {
        this.launches.push({ absolutePath, target });
        return;
      }
    }
    throw new Error(`this machine has no ${target} installation to open the file in`);
  }
}
