// T026: session bootstrap and coordinator invariants — generation 0 with
// exactly one enabled idle non-authorizing Repository Source, one request ID
// across a scan lifecycle, coordinator-locked serialization, atomic
// replacement, explicit-rescan stale state, late-result discard, and
// retained failed-request error message (FR-030).
import { describe, expect, it } from 'vitest';

import { SessionCoordinator, createInspectionSession } from '../../../src/server/session/session';

function bootstrapSession() {
  return createInspectionSession({
    invocationCwd: '/repo',
    cwdOptionValue: null,
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

  it('selects the process-cwd origin when --cwd is omitted', () => {
    const session = bootstrapSession();
    expect(session.snapshot().sources[0]!.boundary.origin).toBe('process-cwd');
  });

  it('selects the cwd-option origin for a validated --cwd', () => {
    const session = createInspectionSession({
      invocationCwd: '/elsewhere',
      cwdOptionValue: '/repo',
      selectedRepositoryRoot: '/repo',
    });
    expect(session.snapshot().sources[0]!.boundary.origin).toBe('cwd-option');
  });

  it('escapes the boundary label without exposing authority fields', () => {
    const session = createInspectionSession({
      invocationCwd: '/repo with space',
      cwdOptionValue: null,
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
    await coordinator.completeScan(admitted.scanRequestId, { files: [], diagnostics: [] });
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
    await coordinator.completeScan(admitted.scanRequestId, { files: [], diagnostics: [] });
    expect(session.snapshot().repositoryGeneration).toBe(0);
  });

  it('publishes neither failed status nor a stale overlay for a revoked failure', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], diagnostics: [] });
    const second = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-1' });
    if (second.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.revokePublicationAuthority(second.scanRequestId);
    coordinator.failScan(second.scanRequestId, 'ENOENT: late failure');
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('ready');
    expect(snapshot.staleFailures).toEqual([]);
    expect(snapshot.snapshotState).toBe('current');
  });

  it('rests a committed Source at ready when a late success is discarded', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], diagnostics: [] });
    const second = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-2' });
    if (second.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.revokePublicationAuthority(second.scanRequestId);
    await coordinator.completeScan(second.scanRequestId, { files: [], diagnostics: [] });
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('ready');
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
    coordinator.failScan(first.scanRequestId, 'ENOENT: fixture root missing');
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
    await coordinator.completeScan(first.scanRequestId, { files: [], diagnostics: [] });
    expect(session.snapshot().snapshotState).toBe('current');

    const rescan = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-2' });
    if (rescan.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.failScan(rescan.scanRequestId, 'EIO: fixture rescan failure');
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

  it('clears the stale entry when the affected source commits successfully', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const first = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (first.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(first.scanRequestId, { files: [], diagnostics: [] });
    const rescan = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-3' });
    if (rescan.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    coordinator.failScan(rescan.scanRequestId, 'EIO: fixture rescan failure');
    const retry = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-4' });
    if (retry.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await coordinator.completeScan(retry.scanRequestId, { files: [], diagnostics: [] });
    const snapshot = session.snapshot();
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.staleFailures).toEqual([]);
  });
});
