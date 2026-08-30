// T915: the failure model end to end, one case per layer a failure can come
// from (FR-028, FR-029, FR-030).
//
// The product's whole error policy is one distinction: a failure that is a
// fact about one file becomes that file's Diagnostic in a `partial`
// generation, and every other failure aborts the attempt and is reported as
// the failed request's own error. Nothing in between exists — no cause
// classification, no retry, no recovered result — so the layer a failure
// arrives from is what these cases enumerate: the platform (descriptors
// exhausted), the filesystem (one file's read), the decoder (one file's
// bytes), the parser (one file's declarations), assembly (a recognition
// operation), and publication (the commit boundary).
//
// The per-family suites already assert the confined half inside their own
// inventories (`repository-scan.test.ts`); what this file owns is the matrix
// itself, plus the three claims no family owns: how a failed request reports,
// that an ownerless automatic rejection reaches the caller, and that no
// capacity ceiling, verdict, or hard cancellation exists anywhere in it.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
// The builtin behind the fs-io seam: an injection that passes every other
// path through must call this, not the spy it is installed on.
import { readFile as realReadFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../src/server/inspection/fs-io';
import {
  buildAllToolSkillFixture,
  buildCodexInstructionFixture,
  buildUnifiedHookFixture,
} from '../fixtures/repositories/build-fixtures';
import { runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { RecordingFileOpener } from '../fixtures/file-opener';

// Pass-through spies over the closed fs surface, so a case can replace one
// path's answer and leave every other read real.
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

/** One session and coordinator over `root`, exactly as the host bootstraps them. */
function bootstrap(root: string) {
  const session = new InspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

/**
 * Runs one accepted attempt through the coordinator as the host does, and
 * returns what the attempt produced. A publishable outcome commits; a
 * deterministic root failure is reported through `failScan`, which is the
 * trigger-owning boundary's job rather than the scan's.
 */
async function scanOnce(
  context: ReturnType<typeof bootstrap>,
  trigger: 'startup' | 'request' = 'startup',
) {
  const sourceId = context.session.repositorySourceId;
  const admitted = context.coordinator.admitScan(
    sourceId,
    trigger === 'startup'
      ? { kind: 'startup', operationId: null }
      : { kind: 'request', operationId: 'op-rescan' },
  );
  if (admitted.kind !== 'admitted') {
    throw new Error('expected admission');
  }
  const publication = await runSourceScan({
    sourceId,
    root: context.session.selectedRepositoryRoot,
    rootFailureOwner: trigger === 'startup' ? 'repository' : `published-source:${sourceId}`,
    scope: 'repository',
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
      censusEscapedDirectories: publication.censusEscapedDirectories,
    });
  } else {
    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'diagnostic',
      diagnostic: publication.diagnostic,
    });
  }
  return { sourceId, scanRequestId: admitted.scanRequestId, publication };
}

describe('which layer a failure comes from decides whose failure it is (T915)', () => {
  it('confines one file’s read failure to that file and commits the generation partial', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-read');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const target = join(fixture.root, ...fixture.injectionTargetPath.split('/'));
    // Permissions are a fact about one file, so the walk classifies the file
    // `unreadable` and the attempt keeps going (FR-028).
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === target) {
        throw Object.assign(new Error('injected read failure'), { code: 'EACCES' });
      }
      return realReadFile(path, options as never);
    });

    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(1);
    const targetFile = snapshot.files.find(
      (file) => file.sourceRelativePath === fixture.injectionTargetPath,
    );
    expect(targetFile?.encoding).toBe('unknown');
    expect(targetFile?.diagnosticIds).toHaveLength(1);
    // Every other file still published: a confined failure costs its own file
    // and nothing else. The tree's own deterministic diagnostic-only paths are
    // excluded — they are unreadable by construction, which is what makes them
    // the baseline this injection adds exactly one file to.
    expect(snapshot.files.length).toBeGreaterThan(1);
    for (const file of snapshot.files) {
      if (
        file.sourceRelativePath !== fixture.injectionTargetPath &&
        !fixture.diagnosticOnlyPaths.includes(file.sourceRelativePath)
      ) {
        expect(file.encoding, file.sourceRelativePath).not.toBe('unknown');
      }
    }
  });

  it('confines the decoder’s answer to the file it decoded', async () => {
    // The decoder never aborts an attempt: NUL bytes make a file binary — its
    // own diagnostic, no source text — while bytes that merely fail to decode
    // as UTF-8 publish as replaced text, which is a complete read rather than
    // a failure.
    const fixture = buildAllToolSkillFixture('inspector-runtime-decode');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    for (const [directory, bytes] of [
      ['binary', Buffer.from([0x23, 0x00])],
      ['replaced', Buffer.from([0x23, 0x20, 0xff, 0x0a])],
    ] as const) {
      mkdirSync(join(fixture.root, '.agents/skills', directory), { recursive: true });
      writeFileSync(join(fixture.root, '.agents/skills', directory, 'SKILL.md'), bytes);
    }
    const context = bootstrap(fixture.root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const snapshot = context.session.snapshot();
    const binary = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/binary/SKILL.md',
    );
    expect(binary?.encoding).toBe('binary');
    expect(binary?.diagnosticIds).toHaveLength(1);
    const replaced = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/replaced/SKILL.md',
    );
    expect(replaced?.encoding).toBe('utf-8-replaced');
    expect(replaced?.diagnosticIds).toEqual([]);
  });

  it('confines a parser failure to its file, publishing every other declaration', async () => {
    // The unified hook tree carries a document no reading can resolve — an
    // object that simply stops — beside carriers that parse. The failure is
    // the file's, so the generation commits partial with the other carriers'
    // declarations intact (FR-028).
    const fixture = buildUnifiedHookFixture('inspector-runtime-parse');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    const parseFailures = snapshot.diagnostics.filter(
      (diagnostic) => diagnostic.code === 'recognition-parse-failed',
    );
    expect(parseFailures.length).toBeGreaterThan(0);
    // The rows the readable carriers declared are all there: a parse failure
    // takes its own file's declarations and no others.
    expect(snapshot.hooks.some((entry) => entry.event !== null)).toBe(true);
  });

  it('aborts the attempt when the platform runs out of descriptors', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-emfile');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();

    // Exhausted descriptors are a process condition, not a fact about the
    // file the walk happened to reach: reporting it as that file's outcome
    // would send a reader to check permissions on a file that is fine.
    const target = join(fixture.root, ...fixture.injectionTargetPath.split('/'));
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === target) {
        throw Object.assign(new Error('injected exhaustion'), { code: 'EMFILE' });
      }
      return realReadFile(path, options as never);
    });
    await expect(
      runSourceScan({
        sourceId: context.session.repositorySourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${context.session.repositorySourceId}`,
        scope: 'repository',
      }),
    ).rejects.toThrow('injected exhaustion');
    // Nothing committed and nothing lost: the prior generation stands.
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(committed.repositoryGeneration);
    expect(after.files).toEqual(committed.files);
  });

  it('aborts the attempt when an assembly operation throws, retaining the prior commit', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-assembly');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();

    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-assembly',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    // The rejection is the injected object itself: a wrapper would be a
    // domain catch, and a second recognition after a swallowed first would be
    // a recovery (FR-029).
    const injected = new Error('injected assembly failure');
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
        scope: 'repository',
        recognize: () => {
          throw injected;
        },
      }),
    ).rejects.toBe(injected);

    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: injected.message,
    });
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(committed.repositoryGeneration);
    expect(after.files).toEqual(committed.files);
    expect(after.skills).toEqual(committed.skills);
    expect(after.snapshotState).toBe('stale-after-fatal-rescan');
  });
});

describe('a failed request is reported as its own error (T915, FR-030)', () => {
  it('creates no job when the admission itself is refused', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-preaccept');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const sourceId = context.session.repositorySourceId;
    const running = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-first',
    });
    if (running.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    // A second request while one is running is refused before anything runs:
    // the refusal is the request's own answer, and it creates no job to fail
    // later and no state to clean up.
    const refused = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-second',
    });
    expect(refused.kind).not.toBe('admitted');
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.staleFailures).toEqual([]);
    // The running attempt is still the only one the Source names.
    expect(snapshot.sources[0]!.scanRequestId).toBe(running.scanRequestId);
  });

  it('retains the prior commit and the request’s own message when an accepted job fails', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-postaccept');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();

    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-fatal',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: 'the operation this request ran rejected',
    });

    const after = context.session.snapshot();
    // The commit stands, and the stale overlay carries the failed request's
    // real message under its own ID — never a rewritten or classified one.
    expect(after.repositoryGeneration).toBe(committed.repositoryGeneration);
    expect(after.snapshotState).toBe('stale-after-fatal-rescan');
    expect(after.staleFailures).toHaveLength(1);
    expect(after.staleFailures[0]!.baseGeneration).toBe(committed.repositoryGeneration);
    expect(after.staleFailures[0]!.failureRef).toEqual({
      kind: 'error',
      message: 'the operation this request ran rejected',
    });
  });

  it('lets an ownerless automatic rejection reach the caller with the prior commit intact', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-ownerless');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();

    // The automatic scan belongs to no request, so a rejection inside it has
    // no request to be reported through: it propagates to the caller, which
    // is the process top level, and the scan swallows nothing on the way out.
    const injected = new Error('injected startup failure');
    await expect(
      runSourceScan({
        sourceId: context.session.repositorySourceId,
        root: fixture.root,
        rootFailureOwner: 'repository',
        scope: 'repository',
        recognize: () => {
          throw injected;
        },
      }),
    ).rejects.toBe(injected);
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(committed.repositoryGeneration);
    expect(after.files).toEqual(committed.files);
    expect(after.snapshotState).toBe('current');
  });
});

describe('no ceiling, no verdict, and no cancellation claim (T915, FR-029)', () => {
  it('publishes what it walked and read, with no limit or verdict beside it', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-counts');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    // Counts, not thresholds: capacity is the environment's, so a publication
    // states what the attempt did and never a ceiling it stopped at, a
    // truncation, or a judgement about what it found (FR-029, QR-001).
    expect(publication.visitedEntries).toBeGreaterThan(0);
    expect(publication.readBytes).toBeGreaterThan(0);
    const keys = Object.keys(publication).toSorted();
    expect(keys).toEqual([
      'candidateFiles',
      'censusEscapedDirectories',
      'diagnostics',
      'files',
      'kind',
      'outcome',
      'readBytes',
      'recognitions',
      'visitedEntries',
    ]);
    const serialized = JSON.stringify(publication).toLowerCase();
    for (const word of ['truncat', 'ceiling', 'threshold', 'valid', 'invalid', 'severity']) {
      expect(serialized, word).not.toContain(word);
    }
  });

  it('discards a revoked attempt’s late result while the work itself finishes', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-revoked');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();

    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-revoked',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    // Revocation takes the right to commit, not the work: nothing cancels the
    // read that is already running, and the attempt resolves normally.
    context.coordinator.revokePublicationAuthority(admitted.scanRequestId);
    const publication = await runSourceScan({
      sourceId,
      root: fixture.root,
      rootFailureOwner: `published-source:${sourceId}`,
      scope: 'repository',
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
      censusEscapedDirectories: publication.censusEscapedDirectories,
    });

    // The late result committed nothing and the Source reverted to exactly
    // its pre-admission state: no generation, no stale overlay, no request ID
    // left behind.
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(committed.repositoryGeneration);
    expect(after.files).toEqual(committed.files);
    expect(after.snapshotState).toBe('current');
    expect(after.staleFailures).toEqual([]);
    expect(after.sources[0]!.scanRequestId).toBe(committed.sources[0]!.scanRequestId);
    expect(after.sources[0]!.status).toBe(committed.sources[0]!.status);
    // And no operation claims to stop work: the coordinator's surface offers
    // revocation, not cancellation.
    const surface = Object.getOwnPropertyNames(
      Object.getPrototypeOf(context.coordinator) as object,
    );
    for (const name of surface) {
      expect(name.toLowerCase(), name).not.toContain('cancel');
      expect(name.toLowerCase(), name).not.toContain('abort');
    }
  });
});

describe('a domain operation that throws is the request’s, unchanged (T922)', () => {
  it('aborts a rescan when the configuration read a derivation rests on fails', async () => {
    const fixture = buildCodexInstructionFixture('inspector-runtime-derivation');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();
    // The derived fallbacks are the tree's own: the configuration read is what
    // produces them, so the committed generation must hold them before this
    // case can say anything about losing them.
    expect(committed.instructions.length).toBeGreaterThan(0);

    // The configuration layer's read fails with a condition that is not one
    // file's — descriptors, not permissions — while every other read stays
    // real. The derivation cannot run, and no cause inspection turns that into
    // a diagnostic or a partial commit (FR-029).
    const layer = join(fixture.root, '.codex', 'config.toml');
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === layer) {
        throw Object.assign(new Error('injected configuration read failure'), { code: 'EMFILE' });
      }
      return realReadFile(path, options as never);
    });
    const sourceId = context.session.repositorySourceId;
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
        scope: 'repository',
      }),
    ).rejects.toThrow('injected configuration read failure');
    // The prior generation is what a reader still has: an aborted attempt
    // publishes nothing, not even the part that had already succeeded.
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(committed.repositoryGeneration);
    expect(after.instructions).toEqual(committed.instructions);
  });

  it('fails an open request with its own error and touches no committed state', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-open');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    // A machine that offers one application: asking for the other is what
    // makes the opener reject, the same way the real one rejects a target it
    // could not resolve.
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(['visual-studio-code']),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
    await scanOnce(context);
    const committed = session.snapshot();

    // The opener is a domain operation of one request. Its rejection is that
    // request's answer — the real error, unclassified — and the session it
    // was asked from is exactly as it was.
    await expect(
      session.openCommittedFile(
        fixture.expectedPublishedPaths[0]!,
        'repository',
        'default-application',
      ),
    ).rejects.toThrow('no default-application installation');
    expect(session.snapshot()).toEqual(committed);
  });

  it('answers a detail request for a path this generation lost with nothing', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    // A stale identity is answered, not thrown at: the file is not in this
    // generation, which is a fact the caller renders rather than a failure of
    // the request (contracts/http-api.md § get-file-detail).
    expect(context.session.fileDetail('.agents/skills/gone/SKILL.md', 'repository')).toBeNull();
    expect(
      context.session.hookCarrierDetail('.agents/skills/gone/SKILL.md', 'repository'),
    ).toBeNull();
    expect(
      context.session.mcpCarrierDetail('.agents/skills/gone/SKILL.md', 'repository'),
    ).toBeNull();
  });
});

describe('a diagnostic is constructed or the commit does not happen (T923)', () => {
  it('publishes exactly the diagnostics the attempt produced, minting none of its own', () => {
    // Retention and serialization: the records a commit publishes are the ones
    // the scan built, by identity of their IDs. A session that dropped one
    // would leave a file pointing at a record nobody can read, and one that
    // minted one would publish a finding no read produced.
    const fixture = buildAllToolSkillFixture('inspector-runtime-diagnostic');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    return scanOnce(context).then(({ publication }) => {
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      const snapshot = context.session.snapshot();
      expect(snapshot.diagnostics.map((diagnostic) => diagnostic.diagnosticId).toSorted()).toEqual(
        publication.diagnostics.map((diagnostic) => diagnostic.diagnosticId).toSorted(),
      );
      // And every reference resolves: a file's `diagnosticIds` name records
      // this same snapshot publishes, so nothing is left dangling by the
      // serialization.
      const published = new Set(snapshot.diagnostics.map((diagnostic) => diagnostic.diagnosticId));
      for (const file of snapshot.files) {
        for (const diagnosticId of file.diagnosticIds) {
          expect(published.has(diagnosticId), file.sourceRelativePath).toBe(true);
        }
      }
    });
  });

  it('retains every file-confined diagnostic a generation produced, with no cap', async () => {
    const fixture = buildAllToolSkillFixture('inspector-runtime-many-diagnostics');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    // Every readable skill entry point in the tree fails to read at once. A
    // numeric cap anywhere — on diagnostics, on retained records, on what a
    // snapshot publishes — would drop some of them, and a reader would be
    // told about fewer files than the scan actually could not read (FR-029:
    // capacity is the environment's).
    // Every entry point the tree's own contract says a rule admits: the
    // expectation comes from the fixture rather than from the snapshot under
    // test, because a snapshot that truncated both its files and its
    // diagnostics together would agree with itself.
    const admitted = [
      ...new Set([
        ...fixture.expectedCodexSkillPaths,
        ...fixture.expectedClaudeSkillPaths,
        ...fixture.expectedCopilotSkillPaths,
      ]),
    ].toSorted();
    expect(admitted.length).toBeGreaterThan(5);
    const failing = new Set(admitted.map((path) => join(fixture.root, ...path.split('/'))));
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (failing.has(String(path))) {
        throw Object.assign(new Error('injected read failure'), { code: 'EACCES' });
      }
      return realReadFile(path, options as never);
    });

    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    const unreadable = snapshot.diagnostics.filter(
      (diagnostic) => diagnostic.code === 'file-unreadable',
    );
    // One record per admitted entry point, counted against the fixture's own
    // list: nothing was dropped, and the files themselves are all still
    // published with the unreadable outcome that produced each record.
    expect(unreadable.map((diagnostic) => diagnostic.sourceRelativePath).toSorted()).toEqual(
      admitted,
    );
    expect(
      snapshot.files
        .filter((file) => file.encoding === 'unknown')
        .map((file) => file.sourceRelativePath)
        .toSorted(),
    ).toEqual(admitted);
    for (const diagnostic of unreadable) {
      const file = snapshot.files.find(
        (candidate) => candidate.sourceRelativePath === diagnostic.sourceRelativePath,
      );
      expect(file?.diagnosticIds, diagnostic.sourceRelativePath ?? '').toContain(
        diagnostic.diagnosticId,
      );
    }
  });
});
