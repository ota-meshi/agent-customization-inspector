// T055: the Repository scan end to end — from the synchronous zero-I/O
// generation 0 through the committed Codex SKILL inventory, the file-confined
// diagnostic matrix, the source-scoped root failure, and the failures that are
// not confined to one file (FR-001, FR-002, FR-024, FR-028, FR-030).
//
// The suite starts from generation 0 rather than from a scan on purpose: the
// Source the first scan reads is the one bootstrap already created, and the
// root it reads is the retained raw selection — never the escaped display
// boundary, which grants no read authority.
import { chmodSync, linkSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../src/server/inspection/fs-io';
import {
  FIXTURE_SECRET_LITERAL,
  buildCodexSkillFixture,
  createRepositoryFixtureRoot,
} from '../fixtures/repositories/build-fixtures';
import { CODEX_REPOSITORY_RULES } from '../../src/server/inspection/rules/codex';
import { REPOSITORY_INSPECTION_RULES, runSourceScan } from '../../src/server/inspection/scan';
import { SessionCoordinator, createInspectionSession } from '../../src/server/session/session';

// Pass-through spies over the closed fs surface, so the suite can prove which
// root was actually read (contracts/inspection-path-allowlist.md § Symlink and read invariants).
vi.mock('../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

const cleanups: (() => void)[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function bootstrap(root: string) {
  const session = createInspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
    selectedRepositoryRoot: root,
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

/** Runs one accepted attempt through the coordinator exactly as the host does. */
async function scanOnce(
  context: ReturnType<typeof bootstrap>,
  trigger: 'startup' | 'request' = 'startup',
) {
  const sourceId = context.session.internal.repositorySourceId;
  const admitted = context.coordinator.admitScan(
    sourceId,
    trigger === 'startup'
      ? { kind: 'startup', operationId: null }
      : { kind: 'request', operationId: 'op-1' },
  );
  if (admitted.kind !== 'admitted') {
    throw new Error('expected admission');
  }
  const publication = await runSourceScan({
    sourceId,
    root: context.session.internal.selectedRepositoryRoot,
    rootFailureOwner: trigger === 'startup' ? 'repository' : `published-source:${sourceId}`,
  });
  if (publication.kind === 'publishable') {
    await context.coordinator.completeScan(admitted.scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
    });
  } else {
    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'diagnostic',
      diagnostic: publication.diagnostic,
    });
  }
  return { sourceId, scanRequestId: admitted.scanRequestId, publication };
}

describe('generation 0 exists before any filesystem operation (FR-002)', () => {
  it('contains exactly one enabled idle Repository Source with no I/O', () => {
    const root = createRepositoryFixtureRoot('inspector-scan-gen0');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    vi.clearAllMocks();
    const { session } = bootstrap(root);
    const snapshot = session.snapshot();

    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.sources).toHaveLength(1);
    expect(snapshot.sources[0]).toMatchObject({
      kind: 'repository',
      tool: null,
      enabled: true,
      status: 'idle',
      generation: 0,
      scanRequestId: null,
      progress: null,
      diagnosticIds: [],
    });
    expect(snapshot.sources[0]!.sourceId).toMatch(/^[A-Za-z0-9_-]{22}$/u);
    expect(snapshot.files).toEqual([]);
    expect(snapshot.diagnostics).toEqual([]);
    // The public boundary is an escaped label plus its origin, and nothing
    // else: the retained raw root stays internal and is the only read operand.
    expect(snapshot.sources[0]!.boundary.origin).toBe('process-cwd');
    expect(Object.keys(snapshot.sources[0]!.boundary).sort()).toEqual([
      'displayRoot',
      'origin',
    ]);
    for (const name of ['lstat', 'readFile', 'readdir', 'realpath', 'stat'] as const) {
      expect(vi.mocked(fsIo[name])).not.toHaveBeenCalled();
    }
  });

  it('escapes a root the shell would treat as several words into one inert label', () => {
    const parent = createRepositoryFixtureRoot('inspector-scan-escape');
    cleanups.push(() => rmSync(parent, { recursive: true, force: true }));
    const root = join(parent, 'my repo');
    mkdirSync(root, { recursive: true });
    const { session } = bootstrap(root);

    const { displayRoot } = session.snapshot().sources[0]!.boundary;
    // The space is escaped, so the label cannot be pasted back as a path and
    // is visibly a presentation value rather than a locator (FR-002).
    expect(displayRoot).not.toContain(' ');
    expect(displayRoot).toContain('\\u0020');
  });

  it('keeps the Source identity stable across a commit while rekeying file IDs', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-stable');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const originalSourceId = context.session.snapshot().sources[0]!.sourceId;

    await scanOnce(context);
    const first = context.session.snapshot();
    expect(first.sources[0]!.sourceId).toBe(originalSourceId);
    const firstIds = first.files.map((file) => file.fileId);

    await scanOnce(context, 'request');
    const second = context.session.snapshot();
    expect(second.sources[0]!.sourceId).toBe(originalSourceId);
    expect(second.repositoryGeneration).toBe(2);
    // Every generation-owned ID is regenerated, so a client holding
    // generation-N handles must refetch rather than silently read N+1 data.
    for (const fileId of second.files.map((file) => file.fileId)) {
      expect(firstIds).not.toContain(fileId);
    }
  });
});

describe('the scan reads the retained raw selected root', () => {
  it('bases every filesystem operation on that root and commits its skills', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-root');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    for (const call of vi.mocked(fsIo.readdir).mock.calls) {
      expect(String(call[0]).startsWith(fixture.root)).toBe(true);
    }
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual([
      ...fixture.expectedSkillPaths,
    ]);
  });

  it('publishes rows in the contracted order: source kind, path, then file ID', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-order');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const paths = context.session.snapshot().files.map((file) => file.sourceRelativePath);
    expect(paths).toEqual([...paths].sort());
  });
});

describe('recognition is atomic per admitted candidate (FR-005)', () => {
  it('publishes one skill row per declared name, naming its file by ID', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-recognize');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    const row = snapshot.skills.find((entry) => entry.declaredName === 'greet');
    const file = snapshot.files.find(
      (candidate) => candidate.sourceRelativePath === '.agents/skills/greet/SKILL.md',
    );
    // The declared name is the fixture's own frontmatter value, carried end to
    // end from the file through the recognizer to the row (FR-007), and it is
    // the row's own identity rather than a field on the file.
    expect(row).toEqual({
      declaredName: 'greet',
      definitions: [
        {
          fileId: file?.fileId,
          tools: ['codex'],
          // The census is recursive and excludes the seed: `greet/` holds the
          // admitted `SKILL.md`, a sibling `README.md`, and `nested/SKILL.md`
          // (a near miss that is never admitted but is still a file beside the
          // skill), so both accompany it.
          companionFiles: [
            '.agents/skills/greet/README.md',
            '.agents/skills/greet/nested/SKILL.md',
          ],
          diagnosticIds: [],
        },
      ],
      // One definition resolves nothing, so the row states no rule.
      sameNameResolutions: [],
    });
    // The file publishes its own facts and nothing about what it was
    // recognized as; the row above is where that lives.
    if (file?.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect('recognitions' in file).toBe(false);
    expect(file.parseSummary).toBe('not-applicable');
  });

  it('never puts authored source or a validity verdict in a session summary', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-secret');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const serialized = JSON.stringify(context.session.snapshot());
    // The secret is in the fixture's authored source and in the committed
    // generation, but the snapshot's inventory rows must not carry it: source
    // text is served only through the acknowledgement-gated detail route.
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toMatch(/"valid"|"invalid"|"compliant"|"effective"/u);
  });
});

describe('physical identity and mid-scan change (T055)', () => {
  it('publishes each hard link as its own file with no identity grouping', async () => {
    // Two paths to one inode are two discovered files: the Inspector has no
    // physical-identity grouping, because an agent reading either path reads a
    // skill and both are separately authored locations.
    const root = createRepositoryFixtureRoot('inspector-scan-hardlink');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/first'), { recursive: true });
    mkdirSync(join(root, '.agents/skills/second'), { recursive: true });
    writeFileSync(join(root, '.agents/skills/first/SKILL.md'), '---\nname: shared\n---\n', 'utf8');
    linkSync(join(root, '.agents/skills/first/SKILL.md'), join(root, '.agents/skills/second/SKILL.md'));

    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual([
      '.agents/skills/first/SKILL.md',
      '.agents/skills/second/SKILL.md',
    ]);
    // One declared name, two definitions: the row's unit is the name, and both
    // files declare it.
    expect(snapshot.skills).toHaveLength(1);
    expect(snapshot.skills[0]!.definitions).toHaveLength(2);
    // Distinct file identities, so neither is a projection of the other.
    expect(new Set(snapshot.files.map((file) => file.fileId)).size).toBe(2);
  });

  it('publishes a file that disappeared between discovery and reading', async () => {
    // The walk found it; the read did not. That is file-confined (FR-028): the
    // candidate publishes as `unknown` with its diagnostic, and every other
    // file still commits in the same partial generation.
    const fixture = buildCodexSkillFixture('inspector-scan-vanished');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const vanishing = join(fixture.root, '.agents/skills/greet/SKILL.md');
    const readFile = vi.mocked(fsIo.readFile);
    const original = readFile.getMockImplementation()!;
    readFile.mockImplementation(async (path, ...rest) => {
      if (String(path) === vanishing) {
        const error: NodeJS.ErrnoException = new Error('ENOENT: no such file');
        error.code = 'ENOENT';
        throw error;
      }
      return original(path, ...rest);
    });

    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    const vanished = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/greet/SKILL.md',
    );
    expect(vanished?.encoding).toBe('unknown');
    expect(vanished?.diagnosticIds.length).toBeGreaterThan(0);
    // Unaffected files still published, so the outcome is partial rather than a
    // failed attempt.
    expect(snapshot.files.length).toBeGreaterThan(1);
    expect(snapshot.sources[0]!.status).toBe('partial');
  });
});

describe('progress moves while the scan is running', () => {
  it('advances phase and entries before the attempt commits', async () => {
    // A refresh mid-scan must show where the attempt is. Without live reports
    // the counters stay at the zeros an admission starts them with until the
    // commit replaces them wholesale.
    const fixture = buildCodexSkillFixture('inspector-scan-live-progress');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const sourceId = context.session.internal.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const seen: { phase: string; visitedEntries: number }[] = [];
    await runSourceScan({
      sourceId,
      root: fixture.root,
      rootFailureOwner: 'repository',
      onProgress: (update) => {
        context.coordinator.reportProgress(admitted.scanRequestId, update);
        const source = context.session.snapshot().sources[0]!;
        seen.push({
          phase: source.progress!.phase,
          visitedEntries: source.progress!.visitedEntries,
        });
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    // The counter only ever grows, and the last report is past enumeration.
    expect(seen.at(-1)!.visitedEntries).toBeGreaterThan(0);
    expect(seen.map((entry) => entry.phase)).toContain('recognizing');
    expect(seen.every((entry, index) => index === 0 || entry.visitedEntries >= seen[index - 1]!.visitedEntries)).toBe(true);
  });
});

describe('completed progress reports the attempt, not its starting zeros', () => {
  it('publishes the entries walked, files published, bytes read, and diagnostics', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-progress');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const source = context.session.snapshot().sources[0]!;
    expect(source.progress?.phase).toBe('complete');
    // Every counter has to reflect the work. They are admitted at zero, and
    // leaving them there would report "0 files" beside a published inventory.
    expect(source.progress?.candidateFiles).toBe(context.session.snapshot().files.length);
    expect(source.progress?.visitedEntries).toBeGreaterThan(source.progress!.candidateFiles);
    expect(source.progress?.readBytes).toBeGreaterThan(0);
    expect(source.progress?.diagnosticCount).toBe(
      context.session.snapshot().diagnostics.filter((entry) => entry.fileId !== null).length,
    );
  });
});

describe('the inventory unit is the kind, not the file (T1078)', () => {
  /** A repository whose skills declare the names each case needs. */
  function skillsDeclaring(prefix: string, named: Readonly<Record<string, string>>) {
    const root = createRepositoryFixtureRoot(prefix);
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    for (const [directory, frontmatter] of Object.entries(named)) {
      mkdirSync(join(root, '.agents/skills', directory), { recursive: true });
      writeFileSync(join(root, '.agents/skills', directory, 'SKILL.md'), frontmatter, 'utf8');
    }
    return root;
  }

  it('groups two files declaring one name into one row with two definitions', async () => {
    // The name is the unit, and it need not match the directory: `deploy/` and
    // `ship/` both declare `release`, so the inventory has one row for it.
    const root = skillsDeclaring('inspector-scan-same-name', {
      deploy: '---\nname: release\n---\n',
      ship: '---\nname: release\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    expect(snapshot.skills).toHaveLength(1);
    const [row] = snapshot.skills;
    expect(row!.declaredName).toBe('release');
    // Definitions are ordered by their file's own path, never by an opaque ID.
    expect(row!.definitions.map((definition) => definition.fileId)).toEqual(
      ['.agents/skills/deploy/SKILL.md', '.agents/skills/ship/SKILL.md'].map(
        (path) => snapshot.files.find((file) => file.sourceRelativePath === path)?.fileId,
      ),
    );
    // Two definitions resolve differently per product, so the row states each
    // statement instead of ordering them (FR-007). Codex keeps both.
    expect(row!.sameNameResolutions).toEqual([{ tool: 'codex', resolution: 'all-remain' }]);
  });

  it('publishes two rows for two names, each stating no resolution', async () => {
    const root = skillsDeclaring('inspector-scan-two-names', {
      deploy: '---\nname: release\n---\n',
      greet: '---\nname: hello\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    // Rows are ordered by their own key — the declared name — so nothing
    // opaque decides what the user sees first.
    expect(snapshot.skills.map((entry) => entry.declaredName)).toEqual(['hello', 'release']);
    expect(snapshot.skills.every((entry) => entry.sameNameResolutions.length === 0)).toBe(true);
  });

  it('keeps a skill that declares no name out of every named row', async () => {
    // Two files with no name are not one skill: having no name is not an
    // identity to share, so each is its own row and neither joins `release`.
    const root = skillsDeclaring('inspector-scan-nameless', {
      deploy: '---\nname: release\n---\n',
      anonymous: '# no frontmatter\n',
      unnamed: '---\ndescription: none\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    expect(snapshot.skills.map((entry) => entry.declaredName)).toEqual(['release', null, null]);
    for (const entry of snapshot.skills) {
      expect(entry.definitions).toHaveLength(1);
    }
  });

  it('states each file fact once and repeats none of them per definition', async () => {
    const root = skillsDeclaring('inspector-scan-one-place', {
      deploy: '---\nname: release\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    const [definition] = snapshot.skills[0]!.definitions;
    // A definition names its file and nothing more: the path, size, encoding,
    // and file diagnostics all live on the file itself, so the two can never
    // disagree.
    expect(Object.keys(definition!).sort()).toEqual([
      'companionFiles',
      'diagnosticIds',
      'fileId',
      'tools',
    ]);
    expect(snapshot.files.filter((file) => file.fileId === definition!.fileId)).toHaveLength(1);
  });
});

describe('file-confined outcomes keep the generation publishable (FR-028)', () => {
  it('records an unreadable file per file while every other file commits', async () => {
    const root = createRepositoryFixtureRoot('inspector-scan-unreadable');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/ok'), { recursive: true });
    mkdirSync(join(root, '.agents/skills/locked'), { recursive: true });
    writeFileSync(join(root, '.agents/skills/ok/SKILL.md'), 'ok\n');
    const locked = join(root, '.agents/skills/locked/SKILL.md');
    writeFileSync(locked, 'locked\n');
    chmodSync(locked, 0o000);
    cleanups.push(() => chmodSync(locked, 0o644));

    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    const ok = snapshot.files.find((file) => file.sourceRelativePath.endsWith('ok/SKILL.md'));
    expect(ok?.encoding).toBe('utf-8');
    const lockedRow = snapshot.files.find((file) =>
      file.sourceRelativePath.endsWith('locked/SKILL.md'),
    );
    // A root-owned process can read a mode-000 file, so the mode is not always
    // the way to make one unreadable. Rather than skipping the assertion — which
    // would let the whole case pass without testing anything — fall back to
    // failing the read itself, so the unreadable branch is always exercised.
    if (lockedRow?.encoding === 'unknown') {
      expect(snapshot.sources[0]!.status).toBe('partial');
      expect(
        snapshot.diagnostics.filter((entry) => entry.code === 'file-unreadable'),
      ).not.toHaveLength(0);
      return;
    }
    const readFile = vi.mocked(fsIo.readFile);
    const original = readFile.getMockImplementation()!;
    readFile.mockImplementation(async (path, ...rest) => {
      if (String(path) === locked) {
        const error: NodeJS.ErrnoException = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      }
      return original(path, ...rest);
    });
    const forced = bootstrap(root);
    await scanOnce(forced);
    const forcedSnapshot = forced.session.snapshot();
    expect(
      forcedSnapshot.files.find((file) => file.sourceRelativePath.endsWith('locked/SKILL.md'))
        ?.encoding,
    ).toBe('unknown');
    expect(forcedSnapshot.sources[0]!.status).toBe('partial');
    expect(
      forcedSnapshot.diagnostics.filter((entry) => entry.code === 'file-unreadable'),
    ).not.toHaveLength(0);
  });

  it('reads a symlinked skill through its target and diagnoses a broken link', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-links');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    if (!fixture.capabilities.symlinks) {
      return;
    }
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    const linked = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/linked/SKILL.md',
    );
    // Transparent read: the inspector shows what an agent resolving the same
    // path would see, so the link is an ordinary readable file (FR-024).
    expect(linked?.encoding).toBe('utf-8');

    const broken = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/broken/SKILL.md',
    );
    expect(broken?.encoding).toBe('unknown');
    expect(broken?.diagnosticIds).toHaveLength(1);
    const diagnostic = snapshot.diagnostics.find(
      (entry) => entry.diagnosticId === broken?.diagnosticIds[0],
    );
    expect(diagnostic).toMatchObject({
      code: 'file-unreadable',
      sourceRelativePath: '.agents/skills/broken/SKILL.md',
    });
    expect(snapshot.sources[0]!.status).toBe('partial');
  });
});

describe('an unreadable root fails the Source attempt (FR-002)', () => {
  it('publishes the source-scoped diagnostic and no partial inventory', async () => {
    const missing = join(createRepositoryFixtureRoot('inspector-scan-missing'), 'absent');
    const context = bootstrap(missing);
    const { publication } = await scanOnce(context);

    expect(publication.kind).toBe('source-failed');
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.files).toEqual([]);
    expect(snapshot.sources[0]!.status).toBe('failed');
    expect(snapshot.repositoryFailureDiagnosticId).not.toBeNull();
    expect(
      snapshot.diagnostics.find(
        (entry) => entry.diagnosticId === snapshot.repositoryFailureDiagnosticId,
      ),
    ).toMatchObject({ code: 'root-unreadable', fileId: null, sourceRelativePath: null });
  });
});

describe('a failure not confined to one file aborts the attempt (FR-030)', () => {
  it('propagates ordinarily, commits nothing, and retains the last snapshot', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-throw');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();
    expect(committed.repositoryGeneration).toBe(1);

    // A deep enumeration failure is not confined to one file: it is never
    // converted into a Diagnostic, and no partial result is invented from the
    // candidates already discovered.
    const sourceId = context.session.internal.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-fatal',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    vi.mocked(fsIo.readdir).mockImplementationOnce(() => {
      throw new Error('injected enumeration failure');
    });
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
      }),
    ).rejects.toThrow('injected enumeration failure');

    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: 'injected enumeration failure',
    });
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(1);
    expect(after.files.map((file) => file.fileId)).toEqual(
      committed.files.map((file) => file.fileId),
    );
    expect(after.snapshotState).toBe('stale-after-fatal-rescan');
    expect(after.staleFailures[0]).toMatchObject({
      sourceId,
      failureRef: { kind: 'error', message: 'injected enumeration failure' },
      baseGeneration: 1,
    });
  });
});

describe('publication authority and relationship targets', () => {
  it('discards a late result after revocation without touching the commit', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-revoked');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const sourceId = context.session.internal.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    context.coordinator.revokePublicationAuthority(admitted.scanRequestId);
    const publication = await runSourceScan({
      sourceId,
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    await context.coordinator.completeScan(admitted.scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
    });
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.sources[0]!.status).toBe('idle');
  });

  it('reads no relationship target: only the shipped plans are executed', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-targets');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();
    await scanOnce(context);

    // The one shipped rule is the only source of read authority; a path
    // mentioned inside an authored file never becomes a candidate.
    expect(REPOSITORY_INSPECTION_RULES.map((compiled) => compiled.rule.ruleId)).toEqual(
      CODEX_REPOSITORY_RULES.map((compiled) => compiled.rule.ruleId),
    );
    const opened = vi
      .mocked(fsIo.readFile)
      .mock.calls.map((call) => String(call[0]).slice(fixture.root.length + 1));
    for (const path of opened) {
      expect(path.endsWith('/SKILL.md')).toBe(true);
    }
  });
});
