// T026: session bootstrap and coordinator invariants — generation 0 with
// exactly one enabled idle non-authorizing Repository Source, one request ID
// across a scan lifecycle, coordinator-locked serialization, atomic
// replacement, explicit-rescan stale state, late-result discard, and
// retained failed-request error message (FR-030).
import { describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import { createDiagnostic, serializeDiagnostic } from '../../../src/shared/diagnostics';
import { SessionCoordinator, createInspectionSession } from '../../../src/server/session/session';

// Pass-through spies over the inspection module's closed fs surface so the
// bootstrap zero-I/O invariant is observed, not assumed (FR-002).
vi.mock('../../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

function bootstrapSession() {
  return createInspectionSession({
    invocationCwd: '/repo',
    rootOptionValue: null,
    selectedRepositoryRoot: '/repo',
  });
}

describe('session bootstrap (generation 0)', () => {
  it('contains exactly one enabled idle Repository Source', () => {
    const session = bootstrapSession();
    const snapshot = session.snapshot();
    expect(snapshot.sources).toHaveLength(1);
    const repository = snapshot.sources[0]!;
    expect(repository.kind).toBe('repository');
    expect(repository.tool).toBeNull();
    expect(repository.enabled).toBe(true);
    expect(repository.status).toBe('idle');
    expect(repository.scanRequestId).toBeNull();
    expect(repository.progress).toBeNull();
    expect(repository.generation).toBe(0);
    expect(typeof repository.sourceId).toBe('string');
  });

  it('selects the process-cwd origin when --root is omitted', () => {
    const session = bootstrapSession();
    expect(session.snapshot().sources[0]!.boundary.origin).toBe('process-cwd');
  });

  it('selects the root-option origin for a validated --root', () => {
    const session = createInspectionSession({
      invocationCwd: '/elsewhere',
      rootOptionValue: '/repo',
      selectedRepositoryRoot: '/repo',
    });
    expect(session.snapshot().sources[0]!.boundary.origin).toBe('root-option');
  });

  it('escapes the boundary label without exposing authority fields', () => {
    const session = createInspectionSession({
      invocationCwd: '/repo with space',
      rootOptionValue: null,
      selectedRepositoryRoot: '/repo with space',
    });
    const boundary = session.snapshot().sources[0]!.boundary;
    expect(boundary.displayRoot).toBe('/repo\\u0020with\\u0020space');
    expect(Object.keys(boundary).sort()).toEqual(['displayRoot', 'origin']);
  });

  it('starts with an empty generation 0 and current snapshot state', () => {
    const snapshot = bootstrapSession().snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.globalGeneration).toBeNull();
    expect(snapshot.files).toEqual([]);
    expect(snapshot.diagnostics).toEqual([]);
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.staleFailures).toEqual([]);
    expect(snapshot.sessionDiagnosticIds).toEqual([]);
    expect(snapshot.repositoryFailureDiagnosticId).toBeNull();
    expect(snapshot.globalContentEpoch).toBe(0);
  });

  it('never serializes internal host state such as the selected root', () => {
    const session = bootstrapSession();
    const serialized = JSON.stringify(session.snapshot());
    expect(serialized).not.toContain('selectedRepositoryRoot');
    expect(serialized).not.toContain('invocationCwd');
  });

  it('contains an empty generation 0 built with zero inspection filesystem I/O', () => {
    for (const spy of Object.values(fsIo)) {
      if (vi.isMockFunction(spy)) {
        spy.mockClear();
      }
    }
    const session = bootstrapSession();
    // Bootstrap is synchronous and I/O-free: the empty inventory exists
    // before any inspected-source read could have happened (FR-002).
    expect(session.internal.committedRepositoryGeneration.files).toEqual([]);
    expect(session.internal.committedRepositoryGeneration.diagnostics).toEqual([]);
    for (const [name, spy] of Object.entries(fsIo)) {
      if (vi.isMockFunction(spy)) {
        expect(spy.mock.calls, `unexpected ${name} call during bootstrap`).toEqual([]);
      }
    }
  });
});

describe('scan lifecycle', () => {
  it('keeps one request ID across admission, progress, and commit', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    expect(admitted.kind).toBe('admitted');
    if (admitted.kind !== 'admitted') {
      return;
    }
    const during = session.snapshot().sources[0]!;
    expect(during.status).toBe('scanning');
    expect(during.scanRequestId).toBe(admitted.scanRequestId);
    await coordinator.completeScan(admitted.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const after = session.snapshot().sources[0]!;
    expect(after.status).toBe('ready');
    expect(after.scanRequestId).toBe(admitted.scanRequestId);
    expect(session.snapshot().repositoryGeneration).toBe(1);
  });

  it('rejects a duplicate scan command for the same source', () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    const duplicate = coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-1',
    });
    expect(duplicate.kind).toBe('conflict');
  });

  it('discards a late result after the attempt authority is revoked', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.revokePublicationAuthority(admitted.scanRequestId);
    await coordinator.completeScan(admitted.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const snapshot = session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    // "No later success status": the revoked request also stops being the
    // Source's visible current request (spec.md § publication matrix).
    expect(snapshot.sources[0]!.scanRequestId).toBeNull();
    expect(snapshot.sources[0]!.status).toBe('idle');
  });

  it('publishes neither failed status nor a stale overlay for a revoked failure', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const second = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-1' });
    if (second.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.revokePublicationAuthority(second.scanRequestId);
    coordinator.failScan(second.scanRequestId, { kind: 'error', message: 'ENOENT: late failure' });
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('ready');
    // The overlay reverts to the exact pre-admission state: the committed
    // request and its retained final complete progress
    // (data-model.md § ScanProgress) — never the revoked request.
    expect(snapshot.sources[0]!.scanRequestId).toBe(first.scanRequestId);
    expect(snapshot.sources[0]!.progress?.phase).toBe('complete');
    expect(snapshot.sources[0]!.progress?.scanRequestId).toBe(first.scanRequestId);
    expect(snapshot.staleFailures).toEqual([]);
    expect(snapshot.snapshotState).toBe('current');
  });

  it('restores the retained failure presentation when a revoked late result lands', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const failing = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-r1' });
    if (failing.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.failScan(failing.scanRequestId, { kind: 'error', message: 'EIO: rescan failed' });
    const retry = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-r2' });
    if (retry.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.revokePublicationAuthority(retry.scanRequestId);
    await coordinator.completeScan(retry.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    // The discarded late success must not erase the current failure
    // presentation: the Source reverts to failed with the failed request's
    // ID and null progress, and the stale overlay stays visible
    // (data-model.md § ScanProgress: progress is null exactly in idle and
    // failed, and failed retains the failed request ID).
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('failed');
    expect(snapshot.sources[0]!.scanRequestId).toBe(failing.scanRequestId);
    expect(snapshot.sources[0]!.progress).toBeNull();
    expect(snapshot.snapshotState).toBe('stale-after-fatal-rescan');
    expect(snapshot.staleFailures[0]!.failureRef).toEqual({
      kind: 'error',
      message: 'EIO: rescan failed',
    });
  });

  it('rests a committed Source at ready when a late success is discarded', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const second = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-2' });
    if (second.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.revokePublicationAuthority(second.scanRequestId);
    await coordinator.completeScan(second.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('ready');
    // 'ready' reflects the retained committed generation: the overlay
    // reverts to that generation's request and final complete progress —
    // never the revoked request's, which would read as its later success
    // (spec.md § publication matrix; data-model.md § ScanProgress).
    expect(snapshot.sources[0]!.scanRequestId).toBe(first.scanRequestId);
    expect(snapshot.sources[0]!.progress?.phase).toBe('complete');
    expect(snapshot.repositoryGeneration).toBe(1);
  });

  it('marks a failed initial scan failed without a stale overlay', () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.failScan(first.scanRequestId, { kind: 'error', message: 'ENOENT: fixture root missing' });
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('failed');
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.staleFailures).toEqual([]);
  });

  it('marks the snapshot stale only for a fatal explicit rescan', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    expect(session.snapshot().snapshotState).toBe('current');

    const rescan = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-2' });
    if (rescan.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.failScan(rescan.scanRequestId, { kind: 'error', message: 'EIO: fixture rescan failure' });
    const snapshot = session.snapshot();
    expect(snapshot.snapshotState).toBe('stale-after-fatal-rescan');
    expect(snapshot.staleFailures).toHaveLength(1);
    expect(snapshot.staleFailures[0]!.sourceId).toBe(sourceId);
    expect(snapshot.staleFailures[0]!.failureRef).toEqual({
      kind: 'error',
      message: 'EIO: fixture rescan failure',
    });
    expect(snapshot.repositoryGeneration).toBe(1);
  });

  it('records the admitted request ID on the successful generation', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(admitted.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    // One opaque ID spans admission, status, and the committed generation
    // (FR-030 request correlation).
    expect(session.internal.committedRepositoryGeneration.scanRequestId).toBe(
      admitted.scanRequestId,
    );
    expect(session.internal.committedRepositoryGeneration.transactionKind).toBe('repository-scan');
  });

  it('rejects an unknown source before acceptance with the real error and no job', () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    // A pre-acceptance rejection fails the request with its real error and
    // creates no job, request ID, or retained session state; it is not
    // converted into a Diagnostic or a stale overlay.
    expect(() => coordinator.admitScan('no-such-source', { kind: 'request', operationId: 'op-1' }))
      .toThrow(TypeError);
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('idle');
    expect(snapshot.sources[0]!.scanRequestId).toBeNull();
    expect(snapshot.staleFailures).toEqual([]);
    expect(snapshot.sessionDiagnosticIds).toEqual([]);
    // The failed request left no lock behind: a valid admission still works.
    const sourceId = snapshot.sources[0]!.sourceId;
    expect(coordinator.admitScan(sourceId, { kind: 'startup', operationId: null }).kind).toBe(
      'admitted',
    );
  });

  it('retains the deterministic root diagnostic of the automatic first scan', () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const diagnostic = serializeDiagnostic(
      createDiagnostic({ code: 'root-unreadable', lifecycleOwnerKey: 'repository', sourceId }),
    );
    coordinator.failScan(admitted.scanRequestId, { kind: 'diagnostic', diagnostic });
    const snapshot = session.snapshot();
    // The actionable failure stays reachable through the repository owner
    // reference and resolves to a retained session diagnostic (FR-002).
    expect(snapshot.repositoryFailureDiagnosticId).toBe(diagnostic.diagnosticId);
    expect(snapshot.sessionDiagnosticIds).toEqual([diagnostic.diagnosticId]);
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.staleFailures).toEqual([]);
    expect(snapshot.sources[0]!.status).toBe('failed');
  });

  it('moves a deterministic explicit-rescan failure into the stale diagnostic reference', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const rescan = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-d' });
    if (rescan.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const diagnostic = serializeDiagnostic(
      createDiagnostic({ code: 'root-unreadable', lifecycleOwnerKey: `published-source:${sourceId}`, sourceId }),
    );
    coordinator.failScan(rescan.scanRequestId, { kind: 'diagnostic', diagnostic });
    const snapshot = session.snapshot();
    expect(snapshot.staleFailures[0]!.failureRef).toEqual({
      kind: 'diagnostic',
      diagnosticId: diagnostic.diagnosticId,
    });
    expect(snapshot.sessionDiagnosticIds).toEqual([diagnostic.diagnosticId]);
    expect(snapshot.repositoryFailureDiagnosticId).toBeNull();

    // A later successful refresh clears the entry and its referenced record.
    const retry = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-e' });
    if (retry.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(retry.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const cleared = session.snapshot();
    expect(cleared.staleFailures).toEqual([]);
    expect(cleared.sessionDiagnosticIds).toEqual([]);
  });

  it('treats the first requested rescan after a failed automatic scan as explicit', () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const automatic = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (automatic.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const automaticDiagnostic = serializeDiagnostic(
      createDiagnostic({ code: 'root-unreadable', lifecycleOwnerKey: 'repository', sourceId }),
    );
    coordinator.failScan(automatic.scanRequestId, {
      kind: 'diagnostic',
      diagnostic: automaticDiagnostic,
    });
    const rescan = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-g' });
    if (rescan.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const rescanDiagnostic = serializeDiagnostic(
      createDiagnostic({
        code: 'root-unreadable',
        lifecycleOwnerKey: `published-source:${sourceId}`,
        sourceId,
      }),
    );
    coordinator.failScan(rescan.scanRequestId, { kind: 'diagnostic', diagnostic: rescanDiagnostic });
    // The Repository Source always has the bootstrap committed generation 0,
    // so this user-requested rescan is an explicit rescan: its terminal
    // failure atomically replaces the automatic-scan repository owner
    // reference with the stale overlay (data-model.md
    // § repositoryFailureDiagnosticId).
    const snapshot = session.snapshot();
    expect(snapshot.repositoryFailureDiagnosticId).toBeNull();
    expect(snapshot.snapshotState).toBe('stale-after-fatal-rescan');
    expect(snapshot.staleFailures[0]!.failureRef).toEqual({
      kind: 'diagnostic',
      diagnosticId: rescanDiagnostic.diagnosticId,
    });
    expect(snapshot.staleFailures[0]!.baseGeneration).toBe(0);
    expect(snapshot.sessionDiagnosticIds).toEqual([rescanDiagnostic.diagnosticId]);
  });

  it('serves the committed inventory and both diagnostic groups in the snapshot', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const generationDiagnostic = serializeDiagnostic(
      createDiagnostic({
        code: 'file-content-binary',
        lifecycleOwnerKey: null,
        sourceId,
        fileId: 'seed-file',
        sourceRelativePath: 'AGENTS.md',
      }),
    );
    await coordinator.completeScan(first.scanRequestId, {
      recognitions: [],
      visitedEntries: 0,
      candidateFiles: 0,
      readBytes: 0,
      files: [
        {
          fileId: 'seed-file',
          sourceId,
          sourceRelativePath: 'AGENTS.md',
          encoding: 'binary',
          sizeBytes: 3,
          diagnosticIds: [generationDiagnostic.diagnosticId],
        },
        {
          fileId: 'seed-readable',
          sourceId,
          sourceRelativePath: 'CLAUDE.md',
          encoding: 'utf-8',
          hadLeadingBom: false,
          sourceText: 'TOP-SECRET-AUTHORED-VALUE',
          sizeBytes: 25,
          parseSummary: 'not-applicable',
          recognitionIds: [],
          relationshipIds: [],
          diagnosticIds: [],
        },
      ],
      diagnostics: [generationDiagnostic],
      outcome: 'partial',
    });
    // get-session serves the committed inventory and its generation records
    // at the top level (contracts/http-api.md § get-session `files[]` /
    // `diagnostics[]`), with the commit-rekeyed IDs staying coherent
    // between a file row and its diagnostic.
    const committed = session.snapshot();
    expect(committed.files.map((file) => file.sourceRelativePath)).toEqual([
      'AGENTS.md',
      'CLAUDE.md',
    ]);
    expect(committed.diagnostics.map((entry) => entry.code)).toEqual(['file-content-binary']);
    expect(committed.diagnostics[0]!.fileId).toBe(committed.files[0]!.fileId);
    // The snapshot rows are content-free summaries: authored text is served
    // only by the acknowledgement-gated detail routes (FR-027).
    expect(JSON.stringify(committed)).not.toContain('TOP-SECRET-AUTHORED-VALUE');
    expect(JSON.stringify(committed)).not.toContain('sourceText');

    const rescan = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-f' });
    if (rescan.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const lifecycleDiagnostic = serializeDiagnostic(
      createDiagnostic({
        code: 'root-unreadable',
        lifecycleOwnerKey: `published-source:${sourceId}`,
        sourceId,
      }),
    );
    coordinator.failScan(rescan.scanRequestId, { kind: 'diagnostic', diagnostic: lifecycleDiagnostic });
    // A failed explicit rescan keeps the retained generation's records and
    // adds its session-owned lifecycle record to the same diagnostics[]
    // projection.
    const stale = session.snapshot();
    expect(stale.files).toHaveLength(2);
    expect(stale.diagnostics.map((entry) => entry.code).sort()).toEqual([
      'file-content-binary',
      'root-unreadable',
    ]);
  });

  it('clears the stale entry when the affected source commits successfully', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const rescan = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-3' });
    if (rescan.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.failScan(rescan.scanRequestId, { kind: 'error', message: 'EIO: fixture rescan failure' });
    const retry = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-4' });
    if (retry.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(retry.scanRequestId, { files: [], recognitions: [], diagnostics: [], outcome: 'complete', visitedEntries: 0, candidateFiles: 0, readBytes: 0 });
    const snapshot = session.snapshot();
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.staleFailures).toEqual([]);
  });
});
