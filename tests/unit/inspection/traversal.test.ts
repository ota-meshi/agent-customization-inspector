// T019/T020: ordinary recursive traversal of the compiled inspection
// allowlist over fs/promises — enumeration, transparent symlinks with
// cycle-safe real-path tracking, VCS exclusion, raw operands as public
// paths, one flag-free read per discovered
// file per attempt, the Codex override-empty ordered fallback (FR-035),
// and root-unreadable classification (FR-002, FR-019, FR-024, FR-028).
import {
  chmodSync,
  linkSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import {
  buildCodexGlobalFixture,
  buildTraversalFixtureTree,
  collectFsMutationViolations,
  createFixtureRoot,
  snapshotTreeState,
  tryMakeFifo,
  type CodexTargetCase,
  type TraversalFixtureTree,
} from '../../fixtures/filesystem/build-filesystem-fixtures';
import { ANY_DIRECTORIES, TraversalPlan } from '../../../src/server/inspection/rules/registry';
import { isVcsInternalPath, runTraversalScan } from '../../../src/server/inspection/traversal';

// Wrap the inspection module's closed fs surface in pass-through spies:
// the product's calls stay real (fixtures are actually read) while the
// suite asserts exactly which operations ran — production-call
// instrumentation per contracts/inspection-path-allowlist.md § Symlink and read invariants. Node
// builtins cannot be intercepted from dependency modules, which is why the
// product routes its I/O through the fs-io test seam.
vi.mock('../../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

const REPOSITORY_AGENTS_PLAN = TraversalPlan.fromPrograms({ kind: 'repository' }, [
  [ANY_DIRECTORIES, 'AGENTS.md'],
]);

let tree: TraversalFixtureTree;

beforeAll(() => {
  tree = buildTraversalFixtureTree();
});

afterAll(() => {
  tree.restore();
  rmSync(tree.root, { recursive: true, force: true });
});

async function scanTree(root: string) {
  const result = await runTraversalScan({ root, plans: [REPOSITORY_AGENTS_PLAN] });
  if (result.kind !== 'scanned') {
    throw new Error(`expected a scanned result, got ${result.kind}`);
  }
  return result;
}

function readFileCallsFor(absolutePath: string): number {
  return vi.mocked(fsIo.readFile).mock.calls.filter((call) => call[0] === absolutePath).length;
}

describe('ordinary recursive walk (T019)', () => {
  it('discovers root, nested, and deep candidates while excluding VCS internals', async () => {
    const result = await scanTree(tree.root);
    const paths = result.files.map((file) => file.publicPath);
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('docs/AGENTS.md');
    expect(paths).toContain('deep/one/two/three/four/AGENTS.md');
    for (const path of paths) {
      expect(path.startsWith('.git/')).toBe(false);
      expect(path.startsWith('.hg/')).toBe(false);
      expect(path.startsWith('.svn/')).toBe(false);
    }
  });

  it('emits files in deterministic public-path order', async () => {
    const result = await scanTree(tree.root);
    const paths = result.files.map((file) => file.publicPath);
    expect(paths).toEqual([...paths].sort());
  });

  it('reads a symlinked candidate transparently through its target', async () => {
    if (!tree.capabilities.symlinks) {
      return;
    }
    const result = await scanTree(tree.root);
    const linked = result.files.find((file) => file.publicPath === 'link-file/AGENTS.md');
    expect(linked?.outcome).toMatchObject({ kind: 'readable', sourceText: 'linked content\n' });
  });

  it('walks through a directory symlink like any other directory', async () => {
    if (!tree.capabilities.symlinks) {
      return;
    }
    const result = await scanTree(tree.root);
    const viaLink = result.files.find((file) => file.publicPath === 'link-dir/AGENTS.md');
    const direct = result.files.find((file) => file.publicPath === 'real-dir/AGENTS.md');
    expect(viaLink?.outcome).toMatchObject({ kind: 'readable', sourceText: 'real dir agents\n' });
    expect(direct?.outcome).toMatchObject({ kind: 'readable', sourceText: 'real dir agents\n' });
  });

  it('yields file-unreadable for a link whose target is missing', async () => {
    if (!tree.capabilities.symlinks) {
      return;
    }
    const result = await scanTree(tree.root);
    const broken = result.files.find((file) => file.publicPath === 'broken/AGENTS.md');
    expect(broken?.outcome).toEqual({ kind: 'unreadable' });
  });

  it('terminates a directory link cycle through real-path tracking', async () => {
    if (!tree.capabilities.symlinks) {
      return;
    }
    // The fixture links cycle/a/loop back to cycle/a; without visited
    // tracking this walk would never finish (FR-024).
    const result = await scanTree(tree.root);
    const cyclePaths = result.files
      .map((file) => file.publicPath)
      .filter((path) => path.startsWith('cycle/'));
    expect(cyclePaths).toEqual(['cycle/a/AGENTS.md']);
  });

  it('treats hard links as ordinary independent files', async () => {
    const root = createFixtureRoot('inspector-hardlink');
    try {
      mkdirSync(join(root, 'hard-a'));
      mkdirSync(join(root, 'hard-b'));
      writeFileSync(join(root, 'hard-a', 'AGENTS.md'), 'hard linked\n');
      linkSync(join(root, 'hard-a', 'AGENTS.md'), join(root, 'hard-b', 'AGENTS.md'));
      const result = await scanTree(root);
      const paths = result.files.map((file) => file.publicPath);
      // No physical-identity grouping, aliasing, or read-once selection.
      expect(paths).toEqual(['hard-a/AGENTS.md', 'hard-b/AGENTS.md']);
      for (const file of result.files) {
        expect(file.outcome).toMatchObject({ kind: 'readable', sourceText: 'hard linked\n' });
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('publishes the raw entry name as the public path', async () => {
    const root = createFixtureRoot('inspector-nfd');
    try {
      const nfdName = 'Jose\u0301.md';
      mkdirSync(join(root, 'nfd'));
      writeFileSync(join(root, 'nfd', nfdName), 'nfd file\n');
      const plans = [TraversalPlan.fromPrograms({ kind: 'repository' }, [['nfd', /\.md$/u]])];
      const result = await runTraversalScan({ root, plans });
      if (result.kind !== 'scanned') {
        throw new Error('expected scanned');
      }
      expect(result.files).toHaveLength(1);
      const file = result.files[0]!;
      // The public path is the raw spelling itself, joined — the path an
      // agent reading the same tree operates on. Nothing is normalized away,
      // so the operand and the display never disagree (FR-024). A
      // normalization-preserving filesystem keeps the NFD spelling written
      // above; a normalizing one returns NFC from enumeration, and then that
      // is the raw name.
      expect(file.publicPath).toBe(`nfd/${file.rawSegments[1]!}`);
      expect([nfdName, nfdName.normalize('NFC')]).toContainEqual(file.rawSegments[1]);
      expect(file.outcome).toMatchObject({ kind: 'readable', sourceText: 'nfd file\n' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('publishes two spellings of one display name as two ordinary files', async () => {
    if (!tree.capabilities.normalizationSiblings) {
      return;
    }
    // Distinct raw entries that would render alike are still two real files
    // the agent's own filesystem holds apart, so both publish at their own
    // raw paths — there is no normalization step to make them ambiguous, and
    // nothing is rejected (FR-024).
    const plans = [TraversalPlan.fromPrograms({ kind: 'repository' }, [['siblings', /\.md$/u]])];
    const result = await runTraversalScan({ root: tree.root, plans });
    if (result.kind !== 'scanned') {
      throw new Error('expected scanned');
    }
    const spellings = result.files.filter((file) => file.publicPath.startsWith('siblings/'));
    expect(spellings).toHaveLength(2);
    expect(new Set(spellings.map((file) => file.publicPath)).size).toBe(2);
    for (const file of spellings) {
      expect(file.publicPath).toBe(`siblings/${file.rawSegments[1]!}`);
      expect(file.outcome.kind).toBe('readable');
    }
  });

  it('skips a dangling link at a directory step silently', async () => {
    const root = createFixtureRoot('inspector-dangling-dir');
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'ok\n');
      try {
        symlinkSync(join(root, 'missing-target'), join(root, 'ghost'), 'dir');
      } catch {
        return;
      }
      // 'ghost' matches no terminal token, and its target does not exist:
      // nothing is reachable there and no candidate file exists to carry a
      // diagnostic, so the walk simply continues.
      const result = await scanTree(root);
      expect(result.files.map((file) => file.publicPath)).toEqual(['AGENTS.md']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('propagates a classification failure on a non-candidate symlink', async () => {
    const root = createFixtureRoot('inspector-linkstat');
    const hidden = join(root, 'hidden');
    try {
      mkdirSync(join(hidden, 'inner'), { recursive: true });
      writeFileSync(join(root, 'AGENTS.md'), 'ok\n');
      try {
        symlinkSync(join(hidden, 'inner'), join(root, 'linked'), 'dir');
      } catch {
        return;
      }
      try {
        chmodSync(hidden, 0o000);
      } catch {
        return;
      }
      let protectionBinds = false;
      try {
        readdirSync(hidden);
      } catch {
        protectionBinds = true;
      }
      if (!protectionBinds) {
        return;
      }
      // 'linked' is no candidate file (no terminal match) and its stat
      // fails with a denial, not absence: that is not confined to one file
      // and must fail the attempt instead of silently pruning the entry.
      await expect(scanTree(root)).rejects.toThrow();
    } finally {
      try {
        chmodSync(hidden, 0o755);
      } catch {
        // The directory may not exist when fixture setup failed early.
      }
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('classifies a missing or non-directory root as root-unreadable', async () => {
    const missing = await runTraversalScan({
      root: join(tree.root, 'no-such-directory'),
      plans: [REPOSITORY_AGENTS_PLAN],
    });
    expect(missing.kind).toBe('root-unreadable');
    const asFile = await runTraversalScan({
      root: join(tree.root, 'AGENTS.md'),
      plans: [REPOSITORY_AGENTS_PLAN],
    });
    expect(asFile.kind).toBe('root-unreadable');
  });

  it('fails a missing or non-directory root even when the compiled catalog is empty', async () => {
    // An empty allowlist legitimately publishes an empty inventory, but
    // only from a root that exists as a directory (FR-002): the root check
    // does not depend on any selector reaching it.
    const missing = await runTraversalScan({
      root: join(tree.root, 'no-such-directory'),
      plans: [],
    });
    expect(missing.kind).toBe('root-unreadable');
    const asFile = await runTraversalScan({ root: join(tree.root, 'AGENTS.md'), plans: [] });
    expect(asFile.kind).toBe('root-unreadable');
    const empty = await runTraversalScan({ root: tree.root, plans: [] });
    expect(empty).toMatchObject({ kind: 'scanned', files: [] });
  });

  it('fails an existing but unreadable root even when the compiled catalog is empty', async () => {
    // FR-002: a root that exists as a directory but cannot be read (mode
    // 000) is root-unreadable, not an empty success. `stat` alone accepts it
    // and, with an empty catalog, no walk runs to surface the `readdir`
    // failure — the readability probe closes that gap.
    const root = createFixtureRoot('inspector-unreadable-root');
    try {
      chmodSync(root, 0o000);
      let protectionBinds = false;
      try {
        readdirSync(root);
      } catch {
        protectionBinds = true;
      }
      if (!protectionBinds) {
        return;
      }
      const result = await runTraversalScan({ root, plans: [] });
      expect(result.kind).toBe('root-unreadable');
    } finally {
      try {
        chmodSync(root, 0o755);
      } catch {
        // Best effort; the directory may already be gone.
      }
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('VCS-internal exclusion by resolved path', () => {
  // The predicate is pure over two realpath results, so the platform-specific
  // shapes — including the Windows cross-drive alias, which this suite cannot
  // create on a POSIX runner — are exercised directly.
  const asPath = (...segments: string[]) => segments.join(sep);

  it('excludes a resolved target under VCS internals below the container', () => {
    expect(isVcsInternalPath(asPath('', 'repo'), asPath('', 'repo', '.git', 'objects'))).toBe(true);
  });

  it('exempts the container itself and ordinary descendants', () => {
    expect(isVcsInternalPath(asPath('', 'repo'), asPath('', 'repo'))).toBe(false);
    expect(isVcsInternalPath(asPath('', 'repo'), asPath('', 'repo', 'src'))).toBe(false);
  });

  it('exempts VCS names the container carries in its own ancestry', () => {
    // A checkout at /srv/.git/worktree is an ordinary root: the shared prefix
    // is not evidence the scan descended into an object store.
    expect(
      isVcsInternalPath(
        asPath('', 'srv', '.git', 'worktree'),
        asPath('', 'srv', '.git', 'worktree', 'file'),
      ),
    ).toBe(false);
  });

  it('excludes an alias target under VCS internals outside the container', () => {
    expect(
      isVcsInternalPath(asPath('', 'container'), asPath('', 'elsewhere', '.git', 'hooks')),
    ).toBe(true);
  });

  it('leaves an installed-package path to the entry-name check alone', () => {
    // `node_modules` is excluded by entry name and nowhere else: a directory
    // the repository placed at a path of its own is the repository's, whatever
    // its link resolves to, so a resolved path running through an install tree
    // is not by itself a reason to skip it — a symbolic link at an authored
    // location is inventoried on that location's terms (FR-024;
    // contracts/inspection-path-allowlist.md).
    expect(isVcsInternalPath(asPath('', 'repo'), asPath('', 'repo', 'node_modules', 'pkg'))).toBe(
      false,
    );
    expect(
      isVcsInternalPath(asPath('', 'container'), asPath('', 'elsewhere', 'node_modules', 'pkg')),
    ).toBe(false);
  });

  it('excludes an alias target sharing no prefix with the container', () => {
    // The POSIX stand-in for a Windows cross-drive alias: `path.relative`
    // between two drives yields an absolute path, so a relative()-based check
    // would wave the target through while the same target on the container's
    // volume is excluded. Segment comparison answers both alike.
    expect(
      isVcsInternalPath(asPath('C:', 'container'), asPath('D:', 'checkout', '.git', 'objects')),
    ).toBe(true);
  });
});

describe('per-file reading (T020)', () => {
  it('classifies binary, replacement-decoded, and BOM files per the closed outcomes', async () => {
    const result = await scanTree(tree.root);
    const byPath = new Map(result.files.map((file) => [file.publicPath, file.outcome]));
    expect(byPath.get('binary-dir/AGENTS.md')).toMatchObject({ kind: 'binary' });
    expect(byPath.get('invalid-utf8/AGENTS.md')).toMatchObject({
      kind: 'readable',
      encoding: 'utf-8-replaced',
      sourceText: 'hi�\n',
    });
    expect(byPath.get('bom-dir/AGENTS.md')).toMatchObject({
      kind: 'readable',
      encoding: 'utf-8',
      hadLeadingBom: true,
      sourceText: 'bom text\n',
    });
  });

  it('skips a non-regular entry without a candidate or diagnostic', async () => {
    if (!tree.capabilities.nonRegularEntries) {
      return;
    }
    // A FIFO matches the terminal selector token by name but is not a
    // regular file, so it is no candidate at all — reading it would hang.
    const result = await scanTree(tree.root);
    expect(result.files.some((file) => file.publicPath === 'fifo-dir/AGENTS.md')).toBe(false);
  });

  it('yields file-unreadable for an unreadable file without affecting others', async () => {
    if (!tree.capabilities.unreadableEntries) {
      return;
    }
    const result = await scanTree(tree.root);
    const byPath = new Map(result.files.map((file) => [file.publicPath, file.outcome]));
    expect(byPath.get('locked/AGENTS.md')).toEqual({ kind: 'unreadable' });
    expect(byPath.get('AGENTS.md')).toMatchObject({ kind: 'readable' });
  });

  it('reads each discovered file exactly once per attempt across overlapping selectors', async () => {
    vi.mocked(fsIo.readFile).mockClear();
    const overlapping = [
      REPOSITORY_AGENTS_PLAN,
      TraversalPlan.fromPrograms({ kind: 'repository' }, [['docs', 'AGENTS.md']]),
    ];
    const result = await runTraversalScan({ root: tree.root, plans: overlapping });
    if (result.kind !== 'scanned') {
      throw new Error('expected scanned');
    }
    expect(result.files.filter((file) => file.publicPath === 'docs/AGENTS.md')).toHaveLength(1);
    expect(readFileCallsFor(join(tree.root, 'docs', 'AGENTS.md'))).toBe(1);
  });

  it('yields file-unreadable for a file that disappears between discovery and read', async () => {
    const root = createFixtureRoot('inspector-vanish');
    try {
      mkdirSync(join(root, 'vanish'));
      writeFileSync(join(root, 'vanish', 'AGENTS.md'), 'about to vanish\n');
      writeFileSync(join(root, 'AGENTS.md'), 'stays\n');
      const vanishing = join(root, 'vanish', 'AGENTS.md');
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      // Enumeration has already discovered the file; deleting it on the way
      // into its one read models the discovery/read race deterministically.
      vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
        if (path === vanishing) {
          rmSync(vanishing, { force: true });
        }
        return actual.readFile(path as never, options as never) as never;
      });
      try {
        const result = await scanTree(root);
        const byPath = new Map(result.files.map((file) => [file.publicPath, file.outcome]));
        expect(byPath.get('vanish/AGENTS.md')).toEqual({ kind: 'unreadable' });
        expect(byPath.get('AGENTS.md')).toMatchObject({
          kind: 'readable',
          sourceText: 'stays\n',
        });
      } finally {
        // mockReset restores the pass-through implementation the factory
        // installed at creation, so later tests keep reading for real.
        vi.mocked(fsIo.readFile).mockReset();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('issues zero mutation-capable calls and leaves the tree state unchanged', async () => {
    vi.mocked(fsIo.readFile).mockClear();
    const before = snapshotTreeState(tree.root);
    await scanTree(tree.root);
    const after = snapshotTreeState(tree.root);
    expect(collectFsMutationViolations(fsIo as unknown as Record<string, unknown>)).toEqual([]);
    // Content, length, identity, link, mode, and both file times are
    // unchanged; OS-only atime is recorded separately and not asserted
    // (FR-023).
    expect(after.entries).toEqual(before.entries);
  });
});

describe('global fixed-subtree walks (T019, FR-018)', () => {
  const COPILOT_PLAN = TraversalPlan.fromPrograms({ kind: 'global', member: 'copilot' }, [
    ['copilot-instructions.md'],
    ['instructions', ANY_DIRECTORIES, /\.instructions\.md$/u],
  ]);

  it('enumerates only the fixed subtree beside the exact target', async () => {
    const root = createFixtureRoot('inspector-copilot');
    try {
      writeFileSync(join(root, 'copilot-instructions.md'), 'root instructions\n');
      mkdirSync(join(root, 'instructions', 'nested'), { recursive: true });
      writeFileSync(join(root, 'instructions', 'a.instructions.md'), 'a\n');
      writeFileSync(join(root, 'instructions', 'nested', 'b.instructions.md'), 'b\n');
      writeFileSync(join(root, 'neighbor.md'), 'never a candidate\n');
      const result = await runTraversalScan({ root, plans: [COPILOT_PLAN] });
      if (result.kind !== 'scanned') {
        throw new Error('expected scanned');
      }
      expect(result.files.map((file) => file.publicPath)).toEqual([
        'copilot-instructions.md',
        'instructions/a.instructions.md',
        'instructions/nested/b.instructions.md',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('classifies a non-regular entry at the exact target as unreadable instead of reading it', async () => {
    const root = createFixtureRoot('inspector-copilot-nonfile');
    try {
      // A directory occupying the exact target path cannot be read as a
      // candidate file; the probe's own type information must classify it
      // (FR-024) instead of handing it to the one flag-free readFile —
      // which would fail on a directory and block forever on a FIFO.
      mkdirSync(join(root, 'copilot-instructions.md'));
      const result = await runTraversalScan({ root, plans: [COPILOT_PLAN] });
      if (result.kind !== 'scanned') {
        throw new Error('expected scanned');
      }
      expect(result.files.map((file) => [file.publicPath, file.outcome.kind])).toEqual([
        ['copilot-instructions.md', 'unreadable'],
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('classifies a FIFO at the exact target as unreadable without reading it', async () => {
    const root = createFixtureRoot('inspector-copilot-fifo');
    try {
      // Unlike the directory case above (which readFile rejects with EISDIR
      // anyway), a FIFO makes the probe's type gate load-bearing: a flag-free
      // readFile on a FIFO blocks forever. This case therefore fails by timeout
      // if the exact-target `knownUnreadable: !entry.isFile()` gate is removed.
      if (!tryMakeFifo(join(root, 'copilot-instructions.md'))) {
        return;
      }
      const result = await runTraversalScan({ root, plans: [COPILOT_PLAN] });
      if (result.kind !== 'scanned') {
        throw new Error('expected scanned');
      }
      expect(result.files.map((file) => [file.publicPath, file.outcome.kind])).toEqual([
        ['copilot-instructions.md', 'unreadable'],
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('treats a missing subtree as absent without sibling discovery', async () => {
    const root = createFixtureRoot('inspector-copilot-absent');
    try {
      writeFileSync(join(root, 'copilot-instructions.md'), 'root instructions\n');
      writeFileSync(join(root, 'neighbor.md'), 'never a candidate\n');
      const result = await runTraversalScan({ root, plans: [COPILOT_PLAN] });
      if (result.kind !== 'scanned') {
        throw new Error('expected scanned');
      }
      expect(result.files.map((file) => file.publicPath)).toEqual(['copilot-instructions.md']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('propagates a subtree failure that is not absence', async () => {
    const root = createFixtureRoot('inspector-copilot-denied');
    const lockedParent = join(root, 'locked');
    try {
      mkdirSync(join(lockedParent, 'instructions'), { recursive: true });
      try {
        chmodSync(lockedParent, 0o000);
      } catch {
        return;
      }
      let protectionBinds = false;
      try {
        readdirSync(lockedParent);
      } catch {
        protectionBinds = true;
      }
      if (!protectionBinds) {
        return;
      }
      // A denied parent is not a missing subtree: the failure is not
      // confined to one file and must fail the attempt as an ordinary
      // error instead of silently publishing nothing (FR-030).
      const plan = TraversalPlan.fromPrograms({ kind: 'global', member: 'copilot' }, [
        ['locked', 'instructions', ANY_DIRECTORIES, /\.instructions\.md$/u],
      ]);
      await expect(runTraversalScan({ root, plans: [plan] })).rejects.toThrow();
    } finally {
      try {
        chmodSync(lockedParent, 0o755);
      } catch {
        // The parent may not exist when fixture setup failed early.
      }
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('Codex override-empty ordered fallback (T020, FR-035)', () => {
  const CODEX_PLAN = TraversalPlan.fromPrograms(
    { kind: 'global', member: 'codex' },
    [['AGENTS.override.md'], ['AGENTS.md']],
    'codex-global-first-non-empty',
  );

  async function runCodexCase(overrideCase: CodexTargetCase, fallbackCase: CodexTargetCase) {
    const fixture = buildCodexGlobalFixture(overrideCase, fallbackCase);
    if (fixture === null) {
      return null;
    }
    try {
      vi.mocked(fsIo.readFile).mockClear();
      vi.mocked(fsIo.lstat).mockClear();
      const result = await runTraversalScan({ root: fixture.root, plans: [CODEX_PLAN] });
      if (result.kind !== 'scanned') {
        throw new Error('expected scanned');
      }
      const fallbackPath = join(fixture.root, 'AGENTS.md');
      const fallbackTouched =
        vi.mocked(fsIo.readFile).mock.calls.some((call) => call[0] === fallbackPath) ||
        vi.mocked(fsIo.lstat).mock.calls.some((call) => call[0] === fallbackPath);
      return { files: result.files, fallbackTouched, root: fixture.root };
    } finally {
      fixture.restore();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }

  it('publishes a non-empty override and never touches the fallback target', async () => {
    const run = await runCodexCase('non-empty', 'non-empty');
    expect(run?.files.map((file) => file.publicPath)).toEqual(['AGENTS.override.md']);
    expect(run?.fallbackTouched).toBe(false);
  });

  it('treats replacement-decoded override text as non-empty', async () => {
    const run = await runCodexCase('replacement-decoded', 'non-empty');
    expect(run?.files.map((file) => file.publicPath)).toEqual(['AGENTS.override.md']);
    expect(run?.fallbackTouched).toBe(false);
  });

  it('falls back for an absent override', async () => {
    const run = await runCodexCase('absent', 'non-empty');
    expect(run?.files.map((file) => file.publicPath)).toEqual(['AGENTS.md']);
  });

  it('falls back for empty, whitespace-only, and BOM-only overrides', async () => {
    for (const overrideCase of ['empty', 'whitespace-only', 'bom-only'] as const) {
      const run = await runCodexCase(overrideCase, 'non-empty');
      expect(run?.files.map((file) => file.publicPath)).toEqual(['AGENTS.md']);
    }
  });

  it('ends the branch on a binary override with its diagnostic-only outcome and no fallback', async () => {
    const run = await runCodexCase('binary', 'non-empty');
    expect(run?.files).toHaveLength(1);
    expect(run?.files[0]).toMatchObject({
      publicPath: 'AGENTS.override.md',
      outcome: { kind: 'binary' },
    });
    expect(run?.fallbackTouched).toBe(false);
  });

  it('ends the branch on an unreadable override with no fallback', async () => {
    const run = await runCodexCase('unreadable', 'non-empty');
    if (run === null) {
      return;
    }
    expect(run.files[0]).toMatchObject({
      publicPath: 'AGENTS.override.md',
      outcome: { kind: 'unreadable' },
    });
    expect(run.fallbackTouched).toBe(false);
  });

  it('ends the branch on a broken override link with no fallback', async () => {
    const run = await runCodexCase('broken-link', 'non-empty');
    if (run === null) {
      return;
    }
    expect(run.files[0]).toMatchObject({
      publicPath: 'AGENTS.override.md',
      outcome: { kind: 'unreadable' },
    });
    expect(run.fallbackTouched).toBe(false);
  });

  it('publishes nothing when both ordered targets are absent or empty', async () => {
    expect((await runCodexCase('absent', 'absent'))?.files).toEqual([]);
    expect((await runCodexCase('absent', 'empty'))?.files).toEqual([]);
    expect((await runCodexCase('empty', 'whitespace-only'))?.files).toEqual([]);
  });

  it('propagates a binary or replacement-decoded fallback outcome under an empty override', async () => {
    // Override empty → the fallback branch runs. Its outcome must propagate:
    // a binary fallback is published diagnostic-only, and a replacement-decoded
    // fallback is non-empty (a retained U+FFFD is non-whitespace) and published
    // as readable utf-8-replaced text. The rest of the matrix only ever varies
    // the override side, leaving these fallback-branch outcomes uncovered.
    const binary = await runCodexCase('empty', 'binary');
    expect(binary?.files).toHaveLength(1);
    expect(binary?.files[0]).toMatchObject({
      publicPath: 'AGENTS.md',
      outcome: { kind: 'binary' },
    });
    expect(binary?.fallbackTouched).toBe(true);

    const replacement = await runCodexCase('empty', 'replacement-decoded');
    expect(replacement?.files[0]).toMatchObject({
      publicPath: 'AGENTS.md',
      outcome: { kind: 'readable', encoding: 'utf-8-replaced' },
    });
  });

  it('publishes an unreadable or broken-link fallback with its diagnostic outcome', async () => {
    for (const fallbackCase of ['unreadable', 'broken-link'] as const) {
      const run = await runCodexCase('absent', fallbackCase);
      if (run === null) {
        continue;
      }
      expect(run.files[0]).toMatchObject({
        publicPath: 'AGENTS.md',
        outcome: { kind: 'unreadable' },
      });
    }
  });

  it('publishes nothing for a BOM-only fallback under an empty override', async () => {
    // A lone BOM trims to empty after one optional leading BOM is removed, so
    // the fallback yields no Codex instruction file (FR-035).
    const run = await runCodexCase('empty', 'bom-only');
    expect(run?.files).toEqual([]);
  });

  it('never publishes both selectors', async () => {
    for (const overrideCase of ['non-empty', 'empty', 'absent'] as const) {
      const run = await runCodexCase(overrideCase, 'non-empty');
      expect(run?.files.length).toBeLessThanOrEqual(1);
    }
  });

  it('reads exact targets without enumerating the admitted root', async () => {
    const fixture = buildCodexGlobalFixture('non-empty', 'non-empty');
    if (fixture === null) {
      return;
    }
    try {
      vi.mocked(fsIo.readdir).mockClear();
      await runTraversalScan({ root: fixture.root, plans: [CODEX_PLAN] });
      const rootReads = vi
        .mocked(fsIo.readdir)
        .mock.calls.filter((call) => String(call[0]).startsWith(fixture.root));
      expect(rootReads).toEqual([]);
    } finally {
      fixture.restore();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
