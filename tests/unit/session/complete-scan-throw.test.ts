// T026 (regression): a throw inside completeScan's fallible generation
// preparation must not prematurely settle the attempt. If it did, the
// coordinator's own `failScan` — reached through the caller's catch — would
// find the attempt already settled and silently drop it, leaving the Source
// stuck 'scanning' with no failed/stale record (FR-030).
import { describe, expect, it, vi } from 'vitest';

import { SessionCoordinator, createInspectionSession } from '../../../src/server/session/session';

// Force the rekeying generation preparation to throw so completeScan rejects
// after admission; createBootstrapGeneration stays real so the session still
// bootstraps.
vi.mock('../../../src/server/session/scan-generation', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../src/server/session/scan-generation')>();
  return {
    ...actual,
    prepareNextRepositoryGeneration: () => {
      throw new Error('EIO: generation rekey failed');
    },
  };
});

function bootstrapSession() {
  return createInspectionSession({
    invocationCwd: '/repo',
    rootOptionValue: null,
    selectedRepositoryRoot: '/repo',
  });
}

describe('completeScan preparation failure (T026 regression)', () => {
  it('leaves the attempt unsettled so a following failScan records the failure', async () => {
    const session = bootstrapSession();
    const coordinator = new SessionCoordinator(session);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    // The preparation throws; the coordinator does not swallow it.
    await expect(
      coordinator.completeScan(admitted.scanRequestId, {
        files: [],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 0,
        candidateFiles: 0,
      readBytes: 0,
      }),
    ).rejects.toThrow('EIO: generation rekey failed');

    // The Source is still mid-attempt, not committed.
    expect(session.snapshot().sources[0]!.status).toBe('scanning');
    expect(session.snapshot().repositoryGeneration).toBe(0);

    // The caller's catch reports the failure; because the attempt was not
    // prematurely settled, this is honored and the Source becomes failed
    // instead of stuck 'scanning' forever.
    coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: 'EIO: generation rekey failed',
    });
    const snapshot = session.snapshot();
    expect(snapshot.sources[0]!.status).toBe('failed');
    expect(snapshot.sources[0]!.progress).toBeNull();
  });
});
