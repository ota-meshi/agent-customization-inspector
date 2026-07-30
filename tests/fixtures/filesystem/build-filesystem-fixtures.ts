// T018: deterministic cross-platform filesystem fixtures for the inspection
// traversal suites (FR-019, FR-023, FR-024, FR-028, FR-035). This module
// builds the canonical fixture trees — symbolic links to files and
// directories including broken links, link cycles, non-regular entries,
// deep trees, VCS internals, unreadable entries, NUL-containing binary
// files, invalid-UTF-8 and BOM files, and the Codex override/fallback
// content cases — and provides the before/after tree-state snapshot used to
// prove zero product-issued mutation. Call instrumentation itself lives in
// the test files, which replace `src/server/inspection/fs-io.ts` with
// pass-through spies via `vi.mock`; the {@link collectFsMutationViolations}
// helper here evaluates those spies
// (contracts/inspection-path-allowlist.md § Common conformance
// requirements #12).
//
// Capability gating keeps the fixtures deterministic across platforms:
// symlink creation can be unavailable on Windows without developer mode,
// mode-based unreadability does not bind for an elevated user, FIFOs are
// POSIX-only, and normalization-preserving filesystems (ext4, NTFS) can
// hold NFC/NFD sibling spellings while normalizing ones (APFS) cannot.
// Each helper reports whether its case could be materialized so suites
// skip exactly the unprovable cases instead of faking them.
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** What the current platform/filesystem could actually materialize. */
export interface FixtureCapabilities {
  /** Symbolic-link cases (file/dir/broken/cycle) were created. */
  readonly symlinks: boolean;
  /** A mode-0 unreadable file was created and actually binds for this user. */
  readonly unreadableEntries: boolean;
  /** A FIFO (non-regular entry) was created. */
  readonly nonRegularEntries: boolean;
  /** NFC and NFD sibling spellings coexist (normalization-preserving FS). */
  readonly normalizationSiblings: boolean;
}

/** One built fixture tree plus the capabilities it materialized. */
export interface TraversalFixtureTree {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist in this tree. */
  readonly capabilities: FixtureCapabilities;
  /** Restores modes so the harness can remove the tree afterwards. */
  readonly restore: () => void;
}

/** Creates one unique fixture root under the OS temporary directory. */
export function createFixtureRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

const CONTENT: Record<string, Uint8Array> = {
  root: Buffer.from('root agents\n', 'utf8'),
  docs: Buffer.from('docs agents\n', 'utf8'),
  deep: Buffer.from('deep agents\n', 'utf8'),
  linked: Buffer.from('linked content\n', 'utf8'),
  realDir: Buffer.from('real dir agents\n', 'utf8'),
  cycle: Buffer.from('cycle agents\n', 'utf8'),
  binary: Buffer.from([0x62, 0x00, 0x69, 0x6e]),
  invalidUtf8: Buffer.from([0x68, 0x69, 0xff, 0x0a]),
  bom: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('bom text\n', 'utf8')]),
  locked: Buffer.from('locked\n', 'utf8'),
};

// Writes one fixture file, creating parents. All fixture writes happen in
// this harness module before the product runs; the product itself must
// never mutate the tree (FR-023).
function writeFixtureFile(root: string, relative: readonly string[], bytes: Uint8Array): void {
  const absolute = join(root, ...relative);
  mkdirSync(join(root, ...relative.slice(0, -1)), { recursive: true });
  writeFileSync(absolute, bytes);
}

function trySymlink(target: string, linkPath: string, kind?: 'dir'): boolean {
  try {
    mkdirSync(join(linkPath, '..'), { recursive: true });
    symlinkSync(target, linkPath, kind);
    return true;
  } catch {
    return false;
  }
}

// A mode-0 file does not bind for root (or on Windows ACL semantics), so
// the capability is verified by an actual read attempt.
function tryMakeUnreadable(absolutePath: string): boolean {
  try {
    chmodSync(absolutePath, 0o000);
  } catch {
    return false;
  }
  try {
    readFileSync(absolutePath);
    return false;
  } catch {
    return true;
  }
}

/**
 * Creates a FIFO (named pipe) at `absolutePath`, returning whether it
 * succeeded. Exported so tests can materialize a non-regular entry at an exact
 * target: reading a FIFO with a flag-free `readFile` blocks forever, which is
 * what makes it, and not a directory, the case that actually exercises the
 * probe's type gate.
 */
export function tryMakeFifo(absolutePath: string): boolean {
  if (process.platform === 'win32') {
    return false;
  }
  try {
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    execFileSync('mkfifo', [absolutePath], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// NFD and NFC spellings of the same visible name. On a
// normalization-preserving filesystem they are two distinct siblings; on a
// normalizing one the second write lands on the first file.
const NFD_NAME = 'José.md';
const NFC_NAME = 'José.md'.normalize('NFC');

function tryMakeNormalizationSiblings(directory: string): boolean {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, NFD_NAME), 'nfd spelling\n');
  writeFileSync(join(directory, NFC_NAME), 'nfc spelling\n');
  const entries = readdirSync(directory);
  return entries.length === 2;
}

/**
 * Builds the canonical traversal fixture tree used by the T019/T020/T021
 * suites. Every case a `./**` + `AGENTS.md` descendant-inventory selector
 * can prove lives here; abort-class cases (an unreadable directory) are
 * added separately by {@link addUnreadableDirectory} because they fail a
 * whole attempt rather than one file.
 */
export function buildTraversalFixtureTree(prefix = 'inspector-traversal'): TraversalFixtureTree {
  const root = createFixtureRoot(prefix);
  writeFixtureFile(root, ['AGENTS.md'], CONTENT['root']!);
  writeFixtureFile(root, ['docs', 'AGENTS.md'], CONTENT['docs']!);
  writeFixtureFile(root, ['deep', 'one', 'two', 'three', 'four', 'AGENTS.md'], CONTENT['deep']!);
  // VCS internals are excluded from traversal wholesale.
  writeFixtureFile(root, ['.git', 'AGENTS.md'], CONTENT['root']!);
  writeFixtureFile(root, ['.hg', 'AGENTS.md'], CONTENT['root']!);
  writeFixtureFile(root, ['.svn', 'AGENTS.md'], CONTENT['root']!);
  writeFixtureFile(root, ['binary-dir', 'AGENTS.md'], CONTENT['binary']!);
  writeFixtureFile(root, ['invalid-utf8', 'AGENTS.md'], CONTENT['invalidUtf8']!);
  writeFixtureFile(root, ['bom-dir', 'AGENTS.md'], CONTENT['bom']!);

  // Symlink family: file link, directory link, broken link, and a directory
  // cycle. The link targets sit under names the AGENTS.md selector cannot
  // match so linked content is discoverable only through its link.
  writeFixtureFile(root, ['real', 'CONTENT.md'], CONTENT['linked']!);
  writeFixtureFile(root, ['real-dir', 'AGENTS.md'], CONTENT['realDir']!);
  writeFixtureFile(root, ['cycle', 'a', 'AGENTS.md'], CONTENT['cycle']!);
  const symlinks =
    trySymlink(join(root, 'real', 'CONTENT.md'), join(root, 'link-file', 'AGENTS.md')) &&
    trySymlink(join(root, 'real-dir'), join(root, 'link-dir'), 'dir') &&
    trySymlink(join(root, 'missing-target.md'), join(root, 'broken', 'AGENTS.md')) &&
    trySymlink(join(root, 'cycle', 'a'), join(root, 'cycle', 'a', 'loop'), 'dir');

  const lockedPath = join(root, 'locked', 'AGENTS.md');
  writeFixtureFile(root, ['locked', 'AGENTS.md'], CONTENT['locked']!);
  const unreadableEntries = tryMakeUnreadable(lockedPath);

  const nonRegularEntries = tryMakeFifo(join(root, 'fifo-dir', 'AGENTS.md'));
  if (!nonRegularEntries) {
    // Keep the directory shape stable even when the FIFO is unsupported so
    // enumeration order does not depend on the capability.
    mkdirSync(join(root, 'fifo-dir'), { recursive: true });
  }

  const normalizationSiblings = tryMakeNormalizationSiblings(join(root, 'siblings'));

  return {
    root,
    capabilities: { symlinks, unreadableEntries, nonRegularEntries, normalizationSiblings },
    restore: () => {
      if (unreadableEntries) {
        chmodSync(lockedPath, 0o644);
      }
    },
  };
}

/**
 * Adds an unreadable directory below the given root. An unreadable
 * directory is not a file-confined outcome: enumeration below it fails the
 * whole attempt, so this case never joins the standard tree. Returns null
 * when mode-based unreadability does not bind (e.g. an elevated user).
 */
export function addUnreadableDirectory(root: string): { restore: () => void } | null {
  const directory = join(root, 'locked-dir');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'AGENTS.md'), 'inside locked dir\n');
  try {
    chmodSync(directory, 0o000);
  } catch {
    return null;
  }
  try {
    readdirSync(directory);
    chmodSync(directory, 0o755);
    return null;
  } catch {
    return { restore: () => chmodSync(directory, 0o755) };
  }
}

/** One Codex override/fallback content case (FR-035). */
export type CodexTargetCase =
  | 'absent'
  | 'empty'
  | 'whitespace-only'
  | 'bom-only'
  | 'non-empty'
  | 'replacement-decoded'
  | 'binary'
  | 'unreadable'
  | 'broken-link';

const CODEX_CASE_BYTES: Record<Exclude<CodexTargetCase, 'absent' | 'broken-link'>, Uint8Array> = {
  empty: Buffer.alloc(0),
  'whitespace-only': Buffer.from(' \n\t\n', 'utf8'),
  'bom-only': Buffer.from([0xef, 0xbb, 0xbf]),
  'non-empty': Buffer.from('codex instructions\n', 'utf8'),
  // 0xFF decodes to U+FFFD, which is non-whitespace, so the file is
  // non-empty under the FR-035 emptiness rule.
  'replacement-decoded': Buffer.from([0xff]),
  binary: Buffer.from([0x00]),
  unreadable: Buffer.from('unreachable\n', 'utf8'),
};

/**
 * Builds one Codex Global home fixture with the requested override and
 * fallback target cases applied independently (FR-035 conformance:
 * contracts/inspection-path-allowlist.md § conformance item 4). Returns
 * null when a requested case cannot be materialized on this platform.
 */
export function buildCodexGlobalFixture(
  overrideCase: CodexTargetCase,
  fallbackCase: CodexTargetCase,
): { root: string; restore: () => void } | null {
  const root = createFixtureRoot('inspector-codex');
  const restores: (() => void)[] = [];
  for (const [name, targetCase] of [
    ['AGENTS.override.md', overrideCase],
    ['AGENTS.md', fallbackCase],
  ] as const) {
    if (targetCase === 'absent') {
      continue;
    }
    const absolute = join(root, name);
    if (targetCase === 'broken-link') {
      if (!trySymlink(join(root, 'missing-codex-target.md'), absolute)) {
        return null;
      }
      continue;
    }
    writeFileSync(absolute, CODEX_CASE_BYTES[targetCase]);
    if (targetCase === 'unreadable') {
      if (!tryMakeUnreadable(absolute)) {
        return null;
      }
      restores.push(() => chmodSync(absolute, 0o644));
    }
  }
  return { root, restore: () => restores.forEach((restore) => restore()) };
}

/** Snapshot of one entry's externally observable state (FR-023 evidence). */
export interface EntryStateSnapshot {
  /** Root-relative `/`-joined path of the entry. */
  readonly path: string;
  /** lstat classification: file, directory, symlink, or other. */
  readonly kind: 'file' | 'directory' | 'symlink' | 'other';
  /** Byte length for files. */
  readonly sizeBytes: number;
  /** Permission mode bits. */
  readonly mode: number;
  /** Hard-link count (identity/link state). */
  readonly nlink: number;
  /** Inode identity where the platform provides one. */
  readonly ino: number;
  /** Modification time (content change evidence). */
  readonly mtimeMs: number;
  /** Metadata change time (mode/owner/xattr change evidence). */
  readonly ctimeMs: number;
  /** Link target for symlinks. */
  readonly linkTarget: string | null;
  /** SHA-256-free content fingerprint: the raw bytes for readable files. */
  readonly contentHex: string | null;
}

/**
 * Recursive before/after state snapshot for mutation evidence (FR-023,
 * QR-002): content, length, identity, link state, mode, and both file
 * times, with OS-only atime recorded separately so a read-side access-time
 * change is never counted as a product mutation. Node.js exposes no stable
 * cross-platform xattr/ACL API, so those attributes are observed indirectly
 * through `ctimeMs` (any xattr/ACL change updates the change time).
 */
export function snapshotTreeState(root: string): {
  entries: readonly EntryStateSnapshot[];
  atimes: Readonly<Record<string, number>>;
} {
  const entries: EntryStateSnapshot[] = [];
  const atimes: Record<string, number> = {};
  const walk = (absolute: string, relative: string): void => {
    const info = lstatSync(absolute);
    const kind = info.isSymbolicLink()
      ? 'symlink'
      : info.isDirectory()
        ? 'directory'
        : info.isFile()
          ? 'file'
          : 'other';
    let contentHex: string | null = null;
    if (kind === 'file') {
      try {
        contentHex = Buffer.from(readFileSync(absolute)).toString('hex');
      } catch {
        // An unreadable fixture file keeps a null fingerprint; length and
        // times still witness non-mutation.
        contentHex = null;
      }
    }
    entries.push({
      path: relative,
      kind,
      sizeBytes: info.size,
      mode: info.mode,
      nlink: info.nlink,
      ino: info.ino,
      mtimeMs: info.mtimeMs,
      ctimeMs: info.ctimeMs,
      linkTarget: kind === 'symlink' ? readlinkSync(absolute) : null,
      contentHex,
    });
    atimes[relative] = info.atimeMs;
    if (kind === 'directory') {
      for (const entry of readdirSync(absolute).sort()) {
        walk(join(absolute, entry), relative === '' ? entry : `${relative}/${entry}`);
      }
    }
  };
  walk(root, '');
  entries.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return { entries, atimes };
}

/**
 * The exact read-only operation surface `src/server/inspection/fs-io.ts`
 * exposes to the product (FR-023). The ESLint inspection-io-boundary rule
 * keeps every other production module away from `node:fs`, so this list is
 * the entire product-reachable filesystem surface for inspected sources; a
 * mutation-capable name appearing on that module is itself a violation.
 */
export const READ_ONLY_FS_SURFACE = ['lstat', 'readFile', 'readdir', 'realpath', 'stat'] as const;

/**
 * Evaluates the instrumented `fs-io` module after a product run: the
 * export surface is exactly the closed read-only set, and every `readFile`
 * call is flag-free (a bare path argument, which Node opens read-only, and
 * no options bag that could carry a mutation-capable `flag`). Returns the
 * violations so the owning test asserts an empty list and reports exactly
 * what leaked.
 */
export function collectFsMutationViolations(fsIo: Record<string, unknown>): string[] {
  const violations: string[] = [];
  const exported = Object.keys(fsIo)
    .filter((name) => typeof fsIo[name] === 'function')
    .sort();
  if (JSON.stringify(exported) !== JSON.stringify([...READ_ONLY_FS_SURFACE])) {
    violations.push(`fs-io exports ${exported.join(', ')} instead of the closed read-only set`);
  }
  const readFileSpy = fsIo['readFile'] as { mock?: { calls: unknown[][] } } | undefined;
  for (const call of readFileSpy?.mock?.calls ?? []) {
    const options = call[1];
    if (options !== undefined && options !== null) {
      violations.push(`readFile received options ${JSON.stringify(options)}`);
    }
  }
  return violations;
}
