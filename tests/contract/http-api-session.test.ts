// T057: the session API contract for the Phase 4 catalog
// (contracts/http-api.md § get-session, § rescan-repository, § Common results
// and errors). It covers generation 0's exact Repository Source and boundary
// origins, the inspection-data success envelope and its epoch/fence fields,
// rescan admission with its request correlation, and the ordinary
// pre-/post-acceptance failure behavior.
//
// The pre-/post-acceptance split is the subtle part and the reason this suite
// exists: before acceptance a failure is just this invocation's error and
// leaves no trace, while after acceptance the invocation has already resolved
// and the terminal failure must be findable on the Source it belongs to.
import { describe, expect, it, vi } from 'vitest';

import {
  createInspectorDevframe,
  executeRepositoryScan,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { runSourceScan } from '../../src/server/inspection/scan';
import type {
  CommandResult,
  InspectionDataResult,
  ScanAdmission,
  SessionSnapshot,
} from '../../src/shared/api-types';
import { RecordingFileOpener } from '../fixtures/file-opener';

vi.mock('../../src/server/inspection/scan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/server/inspection/scan')>();
  return { ...actual, runSourceScan: vi.fn() };
});

/** One registered RPC function as captured from the definition's `setup`. */
interface CapturedRpcFunction {
  readonly name: string;
  readonly type: string;
  readonly handler: (...args: never[]) => unknown;
}

function hostContext(rootOptionValue: string | null = null): InspectorHostContext {
  const session = new InspectionSession({
    invocationCwd: '/repo',
    rootOptionValue,
    fileOpener: new RecordingFileOpener(),
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

function registerFunctions(context: InspectorHostContext): Map<string, CapturedRpcFunction> {
  const functions = new Map<string, CapturedRpcFunction>();
  const ctx = {
    rpc: {
      register(fn: CapturedRpcFunction) {
        functions.set(fn.name, fn);
      },
    },
  };
  createInspectorDevframe(context).setup?.(ctx as never, undefined as never);
  return functions;
}

async function getSession(context: InspectorHostContext) {
  const fn = registerFunctions(context).get('agent-customization-inspector:get-session')!;
  return (await fn.handler()) as InspectionDataResult<SessionSnapshot>;
}

describe('get-session returns the inspection-data success envelope', () => {
  it('carries the epoch and both sequence generations beside the payload', async () => {
    const result = await getSession(hostContext());
    expect(Object.keys(result).sort()).toEqual([
      'data',
      'globalContentEpoch',
      'globalGeneration',
      'repositoryGeneration',
    ]);
    // For a full InspectionSession the result-level values equal the
    // payload's own, so a client can guard without inspecting the payload.
    expect(result.repositoryGeneration).toBe(result.data.repositoryGeneration);
    expect(result.globalGeneration).toBe(result.data.globalGeneration);
    expect(result.globalContentEpoch).toBe(result.data.globalContentEpoch);
  });

  it('is a normal full DTO with a null disable fence while Global is disabled', async () => {
    const { data } = await getSession(hostContext());
    // The fence is what makes a full DTO legal; the control-only recovery
    // snapshot exists exactly while it is non-null (FR-042).
    expect(data.globalDisableInProgress).toBeNull();
    expect(data.globalGeneration).toBeNull();
    expect(data.globalControl).toBeNull();
    expect(data.globalEnableInProgress).toBeNull();
  });

  it('describes generation 0 as one enabled idle Repository Source', async () => {
    const { data } = await getSession(hostContext());
    expect(data.repositoryGeneration).toBe(0);
    expect(data.sources).toHaveLength(1);
    expect(data.sources[0]).toMatchObject({
      kind: 'repository',
      tool: null,
      enabled: true,
      status: 'idle',
      generation: 0,
      scanRequestId: null,
      progress: null,
    });
    expect(data.files).toEqual([]);
    expect(data.diagnostics).toEqual([]);
    expect(data.snapshotState).toBe('current');
    expect(data.staleFailures).toEqual([]);
    expect(data.repositoryFailureDiagnosticId).toBeNull();
  });

  it('reports process-cwd or root-option as the boundary origin', async () => {
    const omitted = await getSession(hostContext());
    expect(omitted.data.sources[0]!.boundary.origin).toBe('process-cwd');
    const explicit = await getSession(hostContext('/elsewhere'));
    expect(explicit.data.sources[0]!.boundary.origin).toBe('root-option');
  });

  it('never exposes the retained raw or canonical root', async () => {
    // A selected root holding a character the presentation encoding escapes,
    // so the raw form and the published label are different strings. A root of
    // plain ASCII would encode to itself and could not tell a leak from the
    // label. `/repo` stays the invocation cwd and shares no prefix with it.
    const { data } = await getSession(hostContext('/selected root'));
    // `displayRoot` is a one-way escaped label; the internal selected root is
    // absent from the DTO by construction, not filtered at serialization.
    expect(data.sources[0]!.boundary.displayRoot).toBe('/selected\\u0020root');
    const payload = JSON.stringify(data);
    expect(payload).not.toContain('/selected root');
    // The invocation cwd is retained for the boundary origin and is not the
    // selected root, so it must not travel either.
    expect(payload).not.toContain('/repo');
    // Absent by construction rather than by name: the whole member set is
    // fixed, so a later field cannot arrive carrying a locator unnoticed.
    expect(Object.keys(data.sources[0]!.boundary).sort()).toEqual(['displayRoot', 'origin']);
  });
});

describe('rescan-repository admission', () => {
  it('issues one opaque request ID that the updated Source carries', async () => {
    vi.mocked(runSourceScan).mockResolvedValue({
      kind: 'publishable',
      outcome: 'complete',
      visitedEntries: 0,
      candidateFiles: 0,
      readBytes: 0,
      files: [],
      recognitions: [],
      skillCompanionsByPath: new Map(),
      diagnostics: [],
    });
    const context = hostContext();
    const fn = registerFunctions(context).get('agent-customization-inspector:rescan-repository')!;

    const result = (await fn.handler()) as CommandResult<ScanAdmission>;
    // A command success is `{ globalContentEpoch, data }` and omits the
    // result-level generation fields, so it never presents itself as a
    // generation snapshot (contracts/http-api.md § Common results and errors).
    expect(Object.keys(result).sort()).toEqual(['data', 'globalContentEpoch']);
    expect(result.data.scanRequestId).toMatch(/^[A-Za-z0-9_-]{22}$/u);
    expect(result.data.source.scanRequestId).toBe(result.data.scanRequestId);
    expect(result.data.source.status).toBe('scanning');
    expect(result.data.source.progress?.scanRequestId).toBe(result.data.scanRequestId);
  });

  it('returns the fixed scan-in-progress conflict for a duplicate command', async () => {
    // A never-settling scan keeps the first command running while the second
    // arrives, which is exactly the documented duplicate case.
    vi.mocked(runSourceScan).mockReturnValue(new Promise(() => {}));
    const context = hostContext();
    const fn = registerFunctions(context).get('agent-customization-inspector:rescan-repository')!;

    await fn.handler();
    const duplicate = await fn.handler();
    expect(duplicate).toEqual({ error: { code: 'scan-in-progress' } });
  });

  it('correlates the admitted ID with the committed generation', async () => {
    vi.mocked(runSourceScan).mockResolvedValue({
      kind: 'publishable',
      outcome: 'complete',
      visitedEntries: 0,
      candidateFiles: 0,
      readBytes: 0,
      files: [],
      recognitions: [],
      skillCompanionsByPath: new Map(),
      diagnostics: [],
    });
    const context = hostContext();
    const fn = registerFunctions(context).get('agent-customization-inspector:rescan-repository')!;
    const result = (await fn.handler()) as CommandResult<ScanAdmission>;
    // The accepted job resolves after the invocation returned its acceptance.
    await new Promise((resolve) => setImmediate(resolve));

    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(1);
    expect(snapshot.sources[0]!.scanRequestId).toBe(result.data.scanRequestId);
    expect(snapshot.sources[0]!.status).toBe('ready');
  });
});

describe('the ordinary request-owned failure lifecycle (FR-030)', () => {
  it('fails a pre-acceptance rejection with its real error and creates no job', async () => {
    const context = hostContext();
    // Bootstrap always creates the Repository Source; removing it models the
    // unexpected state whose failure happens before any job exists.
    context.session.sourceStates.clear();
    const fn = registerFunctions(context).get('agent-customization-inspector:rescan-repository')!;

    await expect(fn.handler()).rejects.toThrow('the repository source state is missing');
    // No job, no request ID, and nothing retained in the session.
    expect(context.session.staleFailures).toEqual([]);
  });

  it('retains an accepted job’s failure as the Source’s stale overlay', async () => {
    vi.mocked(runSourceScan).mockRejectedValue(new Error('injected accepted-job failure'));
    const context = hostContext();
    const fn = registerFunctions(context).get('agent-customization-inspector:rescan-repository')!;

    const result = (await fn.handler()) as CommandResult<ScanAdmission>;
    await new Promise((resolve) => setImmediate(resolve));

    const snapshot = context.session.snapshot();
    // The invocation already resolved with its acceptance, so the terminal
    // failure is retained where the data model defines it — never re-thrown
    // into a later unrelated invocation.
    expect(snapshot.snapshotState).toBe('stale-after-fatal-rescan');
    expect(snapshot.staleFailures).toEqual([
      expect.objectContaining({
        sourceId: snapshot.sources[0]!.sourceId,
        failureRef: { kind: 'error', message: 'injected accepted-job failure' },
        baseGeneration: 0,
      }),
    ]);
    expect(snapshot.sources[0]!.status).toBe('failed');
    // No fabricated Diagnostic, result, or generation for a failed attempt.
    expect(snapshot.diagnostics).toEqual([]);
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(result.data.scanRequestId).toMatch(/^[A-Za-z0-9_-]{22}$/u);
  });

  it('keeps an automatic first-scan root failure off the stale list', async () => {
    vi.mocked(runSourceScan).mockResolvedValue({
      kind: 'source-failed',
      diagnostic: {
        diagnosticId: 'diag-1',
        code: 'root-unreadable',
        sourceId: 'src-1',
        sourceRelativePath: null,
      },
    });
    const context = hostContext();
    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    await executeRepositoryScan(context, admitted.scanRequestId, sourceId, 'repository');

    const snapshot = context.session.snapshot();
    // The automatic first scan has no previously committed snapshot to mark
    // stale; its actionable Diagnostic is routed through the repository owner.
    expect(snapshot.staleFailures).toEqual([]);
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.repositoryFailureDiagnosticId).toBe('diag-1');
  });
});
