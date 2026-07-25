// @vitest-environment happy-dom
// T042: the browser session view state (T049). Covers generation-0
// adoption, immediate adoption of a transport-reported channel loss, the
// rejection of every settlement captured before a purge, and the absence of
// any wall-clock process-loss guarantee for a page nobody interacts with.
//
// There is nothing here about page-lifecycle events: the module installs no
// listener, because FR-027 purges after a failure or terminal reset and
// neither switching tabs nor navigating away is either (amended 2026-07-24).
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under
// the Node environment its contract and integration members need.
import { describe, expect, it } from 'vitest';

import { createSessionViewState } from '../../../src/app/session/view-state';
import {
  SESSION_RPC_FUNCTIONS,
  type SessionRpcFunctionName,
} from '../../../src/app/session/api-client';
import type { InspectionDataResult, SessionSnapshot } from '../../../src/shared/api-types';

/** Bootstrap generation 0 exactly as the host publishes it (FR-002). */
function bootstrapSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-07-24T00:00:00.000Z',
    sources: [
      {
        sourceId: 'source-repository',
        kind: 'repository',
        tool: null,
        enabled: true,
        status: 'idle',
        boundary: { displayRoot: '/tmp/fixture', origin: 'process-cwd' },
        generation: 0,
        scanRequestId: null,
        progress: null,
        conditionFacts: [],
        diagnosticIds: [],
      },
    ],
    files: [],
    diagnostics: [],
    repositoryGeneration: 0,
    globalGeneration: null,
    snapshotState: 'current',
    staleFailures: [],
    globalControl: null,
    globalEnableInProgress: null,
    globalDisableInProgress: null,
    globalContentEpoch: 0,
    sessionDiagnosticIds: [],
    repositoryFailureDiagnosticId: null,
    ...overrides,
  };
}

/** Wraps a snapshot in the inspection-data success envelope. */
function sessionResult(data: SessionSnapshot): InspectionDataResult<SessionSnapshot> {
  return {
    globalContentEpoch: data.globalContentEpoch,
    repositoryGeneration: data.repositoryGeneration,
    globalGeneration: data.globalGeneration,
    data,
  };
}

/** A channel answering `get-session` from a scripted queue. */
function channelFrom(responses: readonly unknown[]) {
  const calls: SessionRpcFunctionName[] = [];
  const queue = [...responses];
  return {
    calls,
    channel: {
      call: (method: SessionRpcFunctionName) => {
        calls.push(method);
        const next = queue.length > 1 ? queue.shift() : queue[0];
        return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
      },
    },
  };
}

describe('session view state — generation 0', () => {
  it('renders the bootstrap Repository Source from one request', async () => {
    const scripted = channelFrom([sessionResult(bootstrapSnapshot())]);
    const state = createSessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('inspection');
    // One call, and it is the session snapshot: there is no liveness probe
    // in front of it (amended 2026-07-24).
    expect(scripted.calls).toEqual([SESSION_RPC_FUNCTIONS.getSession]);
    const snapshot = state.snapshot.value;
    expect(snapshot?.sources).toHaveLength(1);
    expect(snapshot?.sources[0]).toMatchObject({
      kind: 'repository',
      enabled: true,
      status: 'idle',
      generation: 0,
      scanRequestId: null,
      progress: null,
    });
    expect(snapshot?.sources[0]?.boundary.origin).toBe('process-cwd');
    expect(snapshot?.files).toEqual([]);
    expect(snapshot?.diagnostics).toEqual([]);
    state.dispose();
  });

  it('issues no further request once the first snapshot is adopted', async () => {
    const scripted = channelFrom([sessionResult(bootstrapSnapshot())]);
    const state = createSessionViewState({ channel: scripted.channel });
    await state.start();
    const settled = scripted.calls.length;
    // No wall-clock detection guarantee exists for a page nobody interacts
    // with: nothing is scheduled, so nothing is issued.
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
    expect(scripted.calls).toHaveLength(settled);
    state.dispose();
  });

  it('installs no page-lifecycle listener', async () => {
    const scripted = channelFrom([sessionResult(bootstrapSnapshot())]);
    const seen: string[] = [];
    const realDocumentAdd = document.addEventListener;
    const realWindowAdd = window.addEventListener;
    document.addEventListener = ((type: string) => {
      seen.push(`document:${type}`);
    }) as typeof document.addEventListener;
    window.addEventListener = ((type: string) => {
      seen.push(`window:${type}`);
    }) as typeof window.addEventListener;
    try {
      const state = createSessionViewState({ channel: scripted.channel });
      await state.start();
      state.dispose();
    } finally {
      document.addEventListener = realDocumentAdd;
      window.addEventListener = realWindowAdd;
    }
    // Switching tabs and navigating away are not failures, so neither is a
    // purge trigger and neither needs a listener (FR-027).
    expect(seen).toEqual([]);
  });
});

describe('session view state — session loss', () => {
  it('adopts a transport-reported loss immediately', async () => {
    const scripted = channelFrom([sessionResult(bootstrapSnapshot())]);
    const state = createSessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('inspection');
    // devframe pushes the closed socket; nothing had to be asked, and no
    // request needed to fail first.
    state.reportChannelLost(new Error('socket closed'));
    expect(state.view.value).toBe('ended');
    expect(state.errorMessage.value).toBe('socket closed');
    expect(state.snapshot.value).toBeNull();
    state.dispose();
  });

  it('renders the ended view with the real error when a request fails', async () => {
    const scripted = channelFrom([new Error('connection refused')]);
    const state = createSessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('ended');
    expect(state.errorMessage.value).toBe('connection refused');
    state.dispose();
  });

  it('ends the view when the host returns an unsupported rejection code', async () => {
    const scripted = channelFrom([{ error: { code: 'invented-rejection' } }]);
    const state = createSessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('ended');
    expect(state.errorMessage.value).toBe(
      'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
    );
    expect(state.snapshot.value).toBeNull();
    state.dispose();
  });

  it('rejects a settlement captured before the purge', async () => {
    // Assigned inside the promise executor below; typed as a plain function
    // with a no-op default so control-flow narrowing keeps it callable.
    let release: (value: unknown) => void = () => {};
    const calls: SessionRpcFunctionName[] = [];
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        calls.push(method);
        return new Promise<unknown>((resolve) => {
          release = resolve;
        });
      },
    };
    const state = createSessionViewState({ channel });
    const started = state.start();
    while (calls.length === 0) {
      await Promise.resolve();
    }
    // The channel dies while the snapshot request is still outstanding.
    state.reportChannelLost(null);
    release(sessionResult(bootstrapSnapshot()));
    await started;
    // The late settlement was captured under the pre-purge epoch, so it
    // cannot repopulate the view it would have filled.
    expect(state.snapshot.value).toBeNull();
    expect(state.view.value).toBe('ended');
    state.dispose();
  });

  it('adopts a fresh baseline after session-identity loss purges the old one', async () => {
    const scripted = channelFrom([
      sessionResult(
        bootstrapSnapshot({
          sessionId: 'session-a',
          globalContentEpoch: 5,
          repositoryGeneration: 5,
        }),
      ),
      sessionResult(
        bootstrapSnapshot({
          sessionId: 'session-b',
          globalContentEpoch: 0,
          repositoryGeneration: 0,
        }),
      ),
      sessionResult(
        bootstrapSnapshot({
          sessionId: 'session-b',
          globalContentEpoch: 0,
          repositoryGeneration: 0,
        }),
      ),
    ]);
    const state = createSessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.snapshot.value?.sessionId).toBe('session-a');

    // Epochs cannot be ordered across host sessions. The lower epoch from B
    // therefore purges A and leaves the shell empty.
    await state.start();
    expect(state.view.value).toBe('booting');
    expect(state.snapshot.value).toBeNull();

    // The purge also cleared the API client's identity/epoch/generation
    // baseline, so a fresh response from B establishes the new baseline.
    await state.start();
    expect(state.view.value).toBe('inspection');
    expect(state.snapshot.value?.sessionId).toBe('session-b');
    state.dispose();
  });
});
