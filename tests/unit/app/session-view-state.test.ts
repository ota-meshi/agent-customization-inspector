// @vitest-environment happy-dom
// T042/T182: the browser session view state (T049). Covers generation-0
// adoption, immediate adoption of a transport-reported channel loss, the
// rejection of every settlement captured before a purge, and the absence of
// any wall-clock process-loss guarantee for a page nobody interacts with.
//
// There is nothing here about page-lifecycle events: the module installs no
// listener, because FR-027 purges after a failure or terminal reset and
// neither switching tabs nor navigating away is either.
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under
// the Node environment its contract and integration members need.
import { DevframeConnectionError } from 'devframe/client';
import { describe, expect, it, vi } from 'vitest';

import { SessionViewState } from '../../../src/app/session/view-state';
import {
  SESSION_RPC_FUNCTIONS,
  type SessionRpcFunctionName,
} from '../../../src/app/session/api-client';
import type {
  FileDetailDto,
  McpCarrierDetailDto,
  PermissionPolicyDetailDto,
  InspectionDataResult,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** Bootstrap generation 0 exactly as the host publishes it (FR-002). */
function bootstrapSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-07-24T00:00:00.000Z',
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [
      {
        sourceId: 'source-repository',
        kind: 'repository',
        member: null,
        enabled: true,
        status: 'idle',
        boundary: { displayRoot: '/tmp/fixture', origin: 'process-cwd' },
        generation: 0,
        scanRequestId: null,
        progress: null,
        diagnosticIds: [],
      },
    ],
    files: [],
    instructions: [],
    rules: [],
    prompts: [],
    plugins: [],
    outputStyles: [],
    permissions: [],
    hooks: [],
    settings: [],
    agents: [],
    skills: [],
    mcp: [],
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
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('inspection');
    // One call, and it is the session snapshot: there is no liveness probe
    // in front of it.
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
    const state = new SessionViewState({ channel: scripted.channel });
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
      const state = new SessionViewState({ channel: scripted.channel });
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
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('inspection');
    // devframe pushes the closed socket; nothing had to be asked, and no
    // request needed to fail first.
    state.reportChannelLost(new Error('socket closed'));
    expect(state.view.value).toBe('ended');
    expect(state.sessionErrorMessage.value).toBe('socket closed');
    expect(state.snapshot.value).toBeNull();
    state.dispose();
  });

  it('renders the ended view with the real error when the channel is gone', async () => {
    const scripted = channelFrom([new DevframeConnectionError('connection', 'connection refused')]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('ended');
    expect(state.sessionErrorMessage.value).toBe('connection refused');
    state.dispose();
  });

  it('dispatches one rescan at a time', async () => {
    // A second dispatch while one is in flight would supersede the first's
    // token and lose the request ID the host was already working under.
    let calls = 0;
    const channel = {
      call: (method: string) => {
        if (method.endsWith('rescan-repository')) {
          calls += 1;
          return new Promise(() => {}); // never settles
        }
        return Promise.resolve(sessionResult(bootstrapSnapshot()));
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    void state.requestRescan();
    void state.requestRescan();
    expect(calls).toBe(1);
    state.dispose();
  });

  it('holds a command in flight until its answer, and frees the control when the call fails', async () => {
    // A command answers once its scan settled (contracts/http-api.md
    // § rescan-repository), so the slot stays `requesting` for the scan's
    // whole duration wherever the reader goes meanwhile — the state is the
    // shell's, not a page's — and no second dispatch stacks on it. A call
    // that fails instead of answering must not leave the control inert: the
    // host's work commits regardless, and "Refresh status" is the way back to
    // it, so the slot returns to idle and the next press dispatches again.
    const answer = Promise.withResolvers<unknown>();
    let rescans = 0;
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.rescanRepository) {
          rescans += 1;
          return rescans === 1 ? answer.promise : Promise.reject(new Error('channel lost'));
        }
        return Promise.resolve(sessionResult(bootstrapSnapshot()));
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    const first = state.requestRescan();
    expect(state.rescanState.value).toBe('requesting');
    void state.requestRescan();
    expect(rescans).toBe(1);
    answer.resolve({
      globalContentEpoch: 0,
      data: {
        scanRequestId: 'scan-1',
        source: { ...bootstrapSnapshot().sources[0]!, status: 'ready' },
      },
    });
    await first;
    expect(state.rescanState.value).toBe('accepted');
    // The next press dispatches; its call fails, and the slot is free again.
    await state.requestRescan();
    expect(rescans).toBe(2);
    expect(state.rescanState.value).toBe('idle');
    expect(state.sessionErrorMessage.value).toBe('channel lost');
    state.dispose();
  });

  it('adopts a Repository acceptance that settles after a Global dispatch', async () => {
    // The two explicit-rescan commands commit into independent sequences the
    // host admits side by side, so each settles in its own token family: a
    // Global dispatch issued while the Repository admission is still in
    // flight must not turn that admission into a superseded late response —
    // that would leave the Repository slot showing `requesting` for a
    // command the host accepted, with the guard then refusing every retry.
    const repositoryAdmission = Promise.withResolvers<unknown>();
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.rescanRepository) {
          return repositoryAdmission.promise;
        }
        if (method === SESSION_RPC_FUNCTIONS.rescanGlobal) {
          return new Promise(() => {}); // still in flight when the first settles
        }
        return Promise.resolve(sessionResult(bootstrapSnapshot()));
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    const repositoryDispatch = state.requestRescan();
    void state.rescanGlobalSource('source-global-claude');
    repositoryAdmission.resolve({
      globalContentEpoch: 0,
      data: {
        scanRequestId: 'scan-1',
        source: { ...bootstrapSnapshot().sources[0]!, status: 'scanning' },
      },
    });
    await repositoryDispatch;
    expect(state.rescanState.value).toBe('accepted');
    expect(state.activeScanRequestId.value).toBe('scan-1');
    state.dispose();
  });

  it("keeps every accepted command's correlation when a later press is refused", async () => {
    // Claude's rescan is accepted, then Codex's; pressing Claude again while
    // Codex's command runs is refused. The refusal belongs to the pressed row
    // (`globalRescanSourceId`), and each accepted command's correlation is
    // its own map entry (`activeGlobalScans`), so a second member's
    // acceptance never severs the first member's running progress and a
    // refused press moves neither (FR-030).
    let rescans = 0;
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.rescanGlobal) {
          rescans += 1;
          if (rescans === 1) {
            return Promise.resolve({
              globalContentEpoch: 0,
              data: { scanRequestId: 'req-claude', source: { sourceId: 'source-global-claude' } },
            });
          }
          if (rescans === 2) {
            return Promise.resolve({
              globalContentEpoch: 0,
              data: { scanRequestId: 'req-codex', source: { sourceId: 'source-global-codex' } },
            });
          }
          return Promise.resolve({ error: { code: 'scan-in-progress' } });
        }
        return Promise.resolve(sessionResult(bootstrapSnapshot()));
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.rescanGlobalSource('source-global-claude');
    await state.rescanGlobalSource('source-global-codex');
    await state.rescanGlobalSource('source-global-claude');
    expect(state.globalRescanRejection.value).toBe('scan-in-progress');
    expect(state.globalRescanSourceId.value).toBe('source-global-claude');
    // Both admitted commands stay correlated to their own members: the
    // coordinator queues the second FIFO rather than replacing the first
    // (contracts/http-api.md § Concurrency and lifecycle).
    expect(state.activeGlobalScans.value.get('source-global-claude')).toBe('req-claude');
    expect(state.activeGlobalScans.value.get('source-global-codex')).toBe('req-codex');
    state.dispose();
  });

  it('clears a Global rescan rejection on the refresh that shows the current state', async () => {
    // The snapshot a refresh adopts is the state the user asked about, so a
    // stale `scan-in-progress` must not outlive it on a member row — the same
    // clearing the Repository control's rejection gets, or "wait for it to
    // finish" would sit beside a Ready member until another command ran.
    const channel = {
      call: (method: SessionRpcFunctionName) =>
        method === SESSION_RPC_FUNCTIONS.rescanGlobal
          ? Promise.resolve({ error: { code: 'scan-in-progress' } })
          : Promise.resolve(sessionResult(bootstrapSnapshot())),
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.rescanGlobalSource('source-global-claude');
    expect(state.globalRescanState.value).toBe('rejected');
    expect(state.globalRescanRejection.value).toBe('scan-in-progress');
    await state.refresh();
    expect(state.globalRescanState.value).toBe('idle');
    expect(state.globalRescanRejection.value).toBeNull();
    state.dispose();
  });

  it('never repopulates the view with data captured before a purge', async () => {
    // The client's own guard and this module's assignment are in different
    // microtasks. A purge landing in that gap clears the view; the assignment
    // must not put the pre-purge snapshot back (FR-027, FR-042).
    const heldFetch = Promise.withResolvers<unknown>();
    const channel = { call: () => heldFetch.promise };
    const state = new SessionViewState({ channel });
    const started = state.start();
    // A purge runs while the fetch is still in flight.
    state.dispose();
    heldFetch.resolve(sessionResult(bootstrapSnapshot()));
    await started;
    expect(state.snapshot.value).toBeNull();
    state.dispose();
  });

  it('refetches after a lost enable response, recovering the accepted batch', async () => {
    // A delivery failure can hide a confirmation the host accepted
    // (contracts/http-api.md \u00a7 enable-global: a lost response loses no
    // batch): the refetch recovers the accepted state \u2014 controls and
    // `batchStatus` \u2014 while the failed request's own error stays reported.
    let fetches = 0;
    const withControl = {
      ...bootstrapSnapshot(),
      globalControl: {
        consentGiven: true,
        disabling: false,
        confirmedTools: ['copilot', 'claude', 'codex', 'agents'],
        controls: [],
        pendingTools: ['codex'],
        retryableTools: [],
        batchStatus: {
          scanRequestId: 'batch-1',
          tools: ['codex'],
          phase: 'waiting',
          failureRef: null,
        },
      },
    };
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.getGlobalConsentPreview) {
          return Promise.resolve({
            globalContentEpoch: 0,
            data: {
              previewId: 'p-1',
              allowlistVersion: 'v-a',
              traversalPlanVersion: 'v-t',
              entries: [],
              excludedRuleIds: [],
            },
          });
        }
        if (method === SESSION_RPC_FUNCTIONS.enableGlobal) {
          return Promise.reject(new Error('enable response lost'));
        }
        fetches += 1;
        return Promise.resolve(
          sessionResult(fetches === 1 ? bootstrapSnapshot() : (withControl as never)),
        );
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.loadConsentPreview();
    await state.confirmGlobalConsent();
    expect(fetches).toBe(2);
    expect(state.snapshot.value?.globalControl?.batchStatus?.scanRequestId).toBe('batch-1');
    expect(state.consentPreviewError.value).toBe('enable response lost');
    state.dispose();
  });

  it('releases the enable controls once a snapshot is adopted, whatever it holds', async () => {
    // A pre-acceptance failure leaves the true state with no control block and
    // no operation, so reading the adopted snapshot's content would hold the
    // confirmation open for good on the one path that most needs it back.
    // Adoption itself is the authoritative answer (FR-042).
    let enables = 0;
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.getGlobalConsentPreview) {
          return Promise.resolve({
            globalContentEpoch: 0,
            data: {
              previewId: 'p-pre',
              allowlistVersion: 'v-a',
              traversalPlanVersion: 'v-t',
              entries: [],
              excludedRuleIds: [],
            },
          });
        }
        if (method === SESSION_RPC_FUNCTIONS.enableGlobal) {
          enables += 1;
          // A pre-acceptance failure: nothing was accepted, so the refetched
          // session carries neither a control nor an operation.
          return Promise.reject(new Error('the enable request failed before acceptance'));
        }
        return Promise.resolve(sessionResult(bootstrapSnapshot()));
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.loadConsentPreview();
    await state.confirmGlobalConsent();
    expect(enables).toBe(1);
    expect(state.globalEnableState.value).toBe('idle');
    state.dispose();
  });

  it('keeps the enable controls held until the accepted refetch is adopted', async () => {
    // An acceptance is not on screen until the refetched snapshot is adopted:
    // releasing `globalEnableState` at the response re-enables confirm and
    // recapture over the stale preview, and a second confirmation would take
    // the in-progress conflict and display a failure over an accepted
    // operation. The answer moves the state from `submitting` to `answered`,
    // so the page can tell a read still running from a refetch still out.
    let fetches = 0;
    const refetchGate = Promise.withResolvers<null>();

    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.getGlobalConsentPreview) {
          return Promise.resolve({
            globalContentEpoch: 0,
            data: {
              previewId: 'p-hold',
              allowlistVersion: 'v-a',
              traversalPlanVersion: 'v-t',
              entries: [],
              excludedRuleIds: [],
            },
          });
        }
        if (method === SESSION_RPC_FUNCTIONS.enableGlobal) {
          return Promise.resolve({
            globalContentEpoch: 0,
            data: { state: 'active-no-job', acceptedTools: [], scanRequestId: null },
          });
        }
        fetches += 1;
        if (fetches === 1) {
          return Promise.resolve(sessionResult(bootstrapSnapshot()));
        }
        // The authoritative refetch carries the activated consent's control
        // block, which is what releases the accepted hold.
        return refetchGate.promise.then(() =>
          Promise.resolve(
            sessionResult({
              ...bootstrapSnapshot(),
              globalControl: {
                previewId: 'p-hold',
                confirmedTools: [],
                controls: [],
                pendingTools: [],
                batchStatus: null,
                retryableTools: [],
              },
            } as never),
          ),
        );
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.loadConsentPreview();
    const confirmed = state.confirmGlobalConsent();
    await Promise.resolve();
    await Promise.resolve();
    // The acceptance settled but the authoritative refetch has not: the
    // controls must still be held, in the answered state.
    const observedDuringRefetch = state.globalEnableState.value;
    refetchGate.resolve(null);
    await confirmed;
    expect(observedDuringRefetch).toBe('answered');
    expect(state.globalEnableState.value).toBe('idle');
    state.dispose();
  });

  it('refetches the fresh snapshot when an ordinary command observes a greater epoch', async () => {
    // FR-042: a greater epoch on any response purges — and the recovery
    // fetch is automatic, so a tab whose rescan collided with another tab's
    // completed disable lands on the fresh inventory rather than waiting on
    // a manual retry in the booting view.
    let fetches = 0;
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.rescanRepository) {
          return Promise.resolve({ globalContentEpoch: 5, data: { scanRequestId: 'r-1' } });
        }
        fetches += 1;
        return Promise.resolve(
          sessionResult(
            fetches === 1
              ? bootstrapSnapshot()
              : ({ ...bootstrapSnapshot(), globalContentEpoch: 5 } as never),
          ),
        );
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.requestRescan();
    await expect.poll(() => state.view.value, { timeout: 2_000 }).toBe('inspection');
    expect(fetches).toBe(2);
    expect(state.snapshot.value).not.toBeNull();
    // The post-purge adoption asks the shell for the inventory: the recovery
    // restores no prior detail (data-model.md § RecoveryViewState), so the
    // purged world's route must not remount.
    expect(state.inventoryResumeRequests.value).toBe(1);
    state.dispose();
  });

  it('enters the fenced recovery view when an ordinary command observes the fence', async () => {
    // FR-042: the fence's fixed conflict on any response purges and enters
    // control-only recovery — one automatic session fetch adopts the fenced
    // projection, with no manual retry between the reader and the recovery
    // controls.
    const recovery = {
      sessionId: 'session-a',
      globalContentEpoch: 4,
      globalControl: null,
      globalEnableInProgress: null,
      globalDisableInProgress: { operationId: 'op-f', state: 'draining' as const },
    };
    let fetches = 0;
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.rescanRepository) {
          return Promise.resolve({ error: { code: 'global-disable-pending' } });
        }
        fetches += 1;
        return Promise.resolve(
          fetches === 1
            ? sessionResult(bootstrapSnapshot())
            : { globalContentEpoch: 4, data: recovery },
        );
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.requestRescan();
    await expect.poll(() => state.view.value, { timeout: 2_000 }).toBe('fenced');
    expect(state.fenceRecovery.value).toEqual(recovery);
    state.dispose();
  });

  it('reports a pre-acceptance disable failure beside the recovered ordinary view', async () => {
    // A disable the host refused before accepting anything leaves no fence:
    // the recovery fetch adopts the ordinary view — whose success clears
    // session errors — so the failed request's own error is restated rather
    // than silently swallowed (contracts/http-api.md § Common results and
    // errors).
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.disableGlobal) {
          return Promise.reject(new Error('disable registration blew up'));
        }
        return Promise.resolve(sessionResult(bootstrapSnapshot()));
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    await state.requestGlobalDisable();
    expect(state.view.value).toBe('inspection');
    expect(state.sessionErrorMessage.value).toBe('disable registration blew up');
    state.dispose();
  });

  it('restates a Repository command failure past the other sequence\u2019s dispatch', async () => {
    // The restatement guard is the slot's own dispatch counter, not a shared
    // one (FR-030 — two independent sequences): a Global dispatch issued
    // while the failed Repository command's recovery fetch is out must not
    // suppress the Repository failure's restatement.
    const recoveryFetch = Promise.withResolvers<unknown>();
    let fetches = 0;
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.rescanRepository) {
          return Promise.reject(new Error('rescan lost mid-flight'));
        }
        if (method === SESSION_RPC_FUNCTIONS.rescanGlobal) {
          return new Promise(() => {}); // still in flight throughout
        }
        fetches += 1;
        return fetches === 1
          ? Promise.resolve(sessionResult(bootstrapSnapshot()))
          : recoveryFetch.promise;
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    const repositoryDispatch = state.requestRescan();
    // Let the failure land and its recovery fetch go out, then dispatch the
    // other sequence's command while that fetch is still unsettled.
    while (fetches < 2) {
      await Promise.resolve();
    }
    void state.rescanGlobalSource('source-global-claude');
    recoveryFetch.resolve(sessionResult(bootstrapSnapshot()));
    await repositoryDispatch;
    expect(state.sessionErrorMessage.value).toBe('rescan lost mid-flight');
    state.dispose();
  });

  it('keeps the view when one request fails without losing the channel', async () => {
    // The first fetch establishes a view; the second fails inside the handler.
    // The committed snapshot stays on screen and the error is reported beside
    // it, because one failed call is not a lost session.
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      new Error('handler blew up'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('inspection');
    await state.refresh();
    expect(state.view.value).toBe('inspection');
    expect(state.sessionErrorMessage.value).toBe('handler blew up');
    expect(state.snapshot.value).not.toBeNull();
    state.dispose();
  });

  it('ends the view when the host returns an unsupported rejection code', async () => {
    const scripted = channelFrom([{ error: { code: 'invented-rejection' } }]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.view.value).toBe('ended');
    expect(state.sessionErrorMessage.value).toBe(
      'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
    );
    expect(state.snapshot.value).toBeNull();
    state.dispose();
  });

  it('rejects a settlement captured before the purge', async () => {
    const heldFetch = Promise.withResolvers<unknown>();
    const calls: SessionRpcFunctionName[] = [];
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        calls.push(method);
        return heldFetch.promise;
      },
    };
    const state = new SessionViewState({ channel });
    const started = state.start();
    while (calls.length === 0) {
      await Promise.resolve();
    }
    // The channel dies while the snapshot request is still outstanding.
    state.reportChannelLost(null);
    heldFetch.resolve(sessionResult(bootstrapSnapshot()));
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
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    expect(state.snapshot.value?.sessionId).toBe('session-a');

    // Epochs cannot be ordered across host sessions. The lower epoch from B
    // therefore purges A and leaves the shell empty — and a host answering as
    // another session is not this session's host, so what the purge leaves is
    // the ended view, alongside channel loss and an unsupported protocol
    // (contracts/http-api.md § Concurrency and lifecycle: a session mismatch
    // "purges before an ended view"; data-model.md § RecoveryViewState).
    await state.start();
    expect(state.view.value).toBe('ended');
    expect(state.snapshot.value).toBeNull();
    state.dispose();
  });
});

/** The Source-relative Path of one scripted skill file, keyed by name. */
function pathFor(name: string): string {
  return `.agents/skills/greet/${name}.md`;
}

/** One committed readable file's detail, keyed by the path under test. */
function detailFor(name: string): InspectionDataResult<FileDetailDto> {
  return {
    globalContentEpoch: 0,
    repositoryGeneration: 0,
    globalGeneration: null,
    data: {
      kind: 'file',
      file: {
        sourceId: 'source-repository',
        sourceRelativePath: pathFor(name),
        encoding: 'utf-8',
        hadLeadingBom: false,
        sourceText: `# ${name}\n`,
        sizeBytes: 8,
        diagnosticIds: [],
      },
      diagnostics: [],
    },
  };
}

describe('session view state — detail ownership across page instances', () => {
  it("ignores an outgoing page's close once its replacement opened its own detail", async () => {
    // Route navigation mounts the next detail page before the previous one is
    // torn down, so the outgoing page's unmount cleanup runs after the
    // replacement's open. Each page opens and closes through its own token
    // (`useDetailPageOwnership`); a close presented with a token that no
    // longer owns the state must not advance the request version, or the
    // replacement's in-flight response would be discarded and its page left
    // on the failure state.
    const outgoingPage = Symbol('outgoing');
    const replacementPage = Symbol('replacement');
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      detailFor('entry-2'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'), outgoingPage);

    const replacementOpen = state.openFileDetail(
      pathFor('entry-2'),
      pathFor('entry-2'),
      replacementPage,
    );
    // The outgoing page's unmount cleanup, arriving after the replacement's
    // open: a no-op, because the state is no longer its to drop.
    state.closeFileDetail(outgoingPage);
    await replacementOpen;
    expect(state.fileDetailState.value).toBe('ready');
    expect(state.entryDetail.value?.file.sourceRelativePath).toBe(pathFor('entry-2'));
  });

  it('re-requests the same path under another Source instead of holding the open detail', async () => {
    // A step between two Sources' details at one path — the repository's
    // `AGENTS.md` and a consented home's. The path is identical, so nothing
    // about it says the file changed; the Source is the half that does
    // (FR-030). Holding the entry here would leave one Source's authored
    // content on screen, in the ready state, under the other's address.
    const scripted = {
      calls: [] as { method: SessionRpcFunctionName; args: readonly unknown[] }[],
      channel: {
        call: (method: SessionRpcFunctionName, ...args: readonly unknown[]) => {
          scripted.calls.push({ method, args });
          if (method === SESSION_RPC_FUNCTIONS.getSession) {
            return Promise.resolve(sessionResult(bootstrapSnapshot()));
          }
          const request = args[0] as { sourceRelativePath: string; source: string };
          return Promise.resolve({
            globalContentEpoch: 0,
            repositoryGeneration: 0,
            globalGeneration: null,
            data: {
              kind: 'file',
              file: {
                // The Source the request named is the Source that answers.
                sourceId: request.source === 'repository' ? 'source-repository' : 'source-global',
                sourceRelativePath: request.sourceRelativePath,
                encoding: 'utf-8',
                hadLeadingBom: false,
                sourceText: `# ${request.source}\n`,
                sizeBytes: 8,
                diagnosticIds: [],
              },
              diagnostics: [],
            },
          });
        },
      },
    };
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();

    await state.openFileDetail('AGENTS.md', 'AGENTS.md', undefined, 'repository');
    expect(state.entryDetail.value?.file.sourceId).toBe('source-repository');

    await state.openFileDetail('AGENTS.md', 'AGENTS.md', undefined, 'global-codex');
    // Two detail requests, the second naming the other Source, and the state
    // now holds that Source's file.
    expect(
      scripted.calls
        .filter((call) => call.method === SESSION_RPC_FUNCTIONS.getFileDetail)
        .map((call) => call.args[0]),
    ).toEqual([
      { sourceRelativePath: 'AGENTS.md', source: 'repository' },
      { sourceRelativePath: 'AGENTS.md', source: 'global-codex' },
    ]);
    expect(state.entryDetail.value?.file.sourceId).toBe('source-global');
    state.dispose();
  });

  it('still closes for the owning page, and unconditionally for the view state itself', async () => {
    const page = Symbol('page');
    const scripted = channelFrom([sessionResult(bootstrapSnapshot()), detailFor('entry-1')]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'), page);
    // The owner leaving to a non-detail route drops what it requested.
    state.closeFileDetail(page);
    expect(state.fileDetailState.value).toBe('idle');
    expect(state.entryDetail.value).toBeNull();

    // An ownerless close is the view state's own lifecycle — refresh, purge —
    // and always applies.
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'), page);
    state.closeFileDetail();
    expect(state.fileDetailState.value).toBe('idle');
    expect(state.entryDetail.value).toBeNull();
  });

  it("keeps the replacement page's title subject through the outgoing release", () => {
    // The subject follows the same mount ordering as the detail: the
    // replacement page reports before the outgoing page's unmount cleanup
    // runs, so a release presented with a token that no longer owns the
    // subject must not null the replacement's report — a dead-link page's
    // title would otherwise fall back to the generic route name for good.
    const scripted = channelFrom([sessionResult(bootstrapSnapshot())]);
    const state = new SessionViewState({ channel: scripted.channel });
    const outgoingPage = Symbol('outgoing');
    const replacementPage = Symbol('replacement');
    state.reportPageSubject('outgoing subject', outgoingPage);
    state.reportPageSubject('replacement subject', replacementPage);
    state.releasePageSubject(outgoingPage);
    expect(state.pageSubject.value).toBe('replacement subject');
    // The owner itself leaving releases, and the view state's own ownerless
    // release always applies.
    state.releasePageSubject(replacementPage);
    expect(state.pageSubject.value).toBeNull();
    state.reportPageSubject('again', replacementPage);
    state.releasePageSubject();
    expect(state.pageSubject.value).toBeNull();
  });

  it('drops a held carrier detail when a file detail opens over it', async () => {
    // Navigation from an MCP carrier page to a skill or instruction page: the
    // outgoing page's ownership-guarded close is superseded by the incoming
    // open, so the open itself clears the carrier slot — the open-detail
    // state must not hold both slots at once.
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      carrierFor('.mcp.json'),
      detailFor('entry-1'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openCarrierDetail('.mcp.json');
    expect(state.carrierDetail.value?.file.sourceRelativePath).toBe('.mcp.json');

    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.entryDetail.value?.file.sourceRelativePath).toBe(pathFor('entry-1'));
    expect(state.carrierDetail.value).toBeNull();
    expect(state.fileDetailState.value).toBe('ready');
  });

  it('drops every held slot when a policy detail opens over them', async () => {
    // The one-open-detail rule in the other direction (#dropOpenDetails,
    // FR-027): opening a policy drops the whole previous subject — the entry
    // slot here, and with it the plugin file slots and row key the shared
    // drop owns — never a hand-picked subset that leaves authored text held.
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      policyFor('.codex/rules/deploy.rules'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.entryDetail.value?.file.sourceRelativePath).toBe(pathFor('entry-1'));

    await state.openPolicyDetail('.codex/rules/deploy.rules');
    expect(state.policyDetail.value?.file.sourceRelativePath).toBe('.codex/rules/deploy.rules');
    expect(state.entryDetail.value).toBeNull();
    expect(state.pluginManifestFile.value).toBeNull();
    expect(state.pluginOpenFile.value).toBeNull();
  });

  it('drops a held policy when a file detail opens over it', async () => {
    // The same one-open-detail rule the carrier slot follows: a permission
    // policy is its own function's result about its own subject, so opening a
    // file detail over it must clear the policy slot rather than leave the
    // state holding two.
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      policyFor('.codex/rules/deploy.rules'),
      detailFor('entry-1'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openPolicyDetail('.codex/rules/deploy.rules');
    expect(state.policyDetail.value?.file.sourceRelativePath).toBe('.codex/rules/deploy.rules');

    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.entryDetail.value?.file.sourceRelativePath).toBe(pathFor('entry-1'));
    expect(state.policyDetail.value).toBeNull();
    expect(state.fileDetailState.value).toBe('ready');
  });
});

/** One committed permission policy, keyed by the path of the file declaring it. */
function policyFor(sourceRelativePath: string): InspectionDataResult<PermissionPolicyDetailDto> {
  return {
    globalContentEpoch: 0,
    repositoryGeneration: 0,
    globalGeneration: null,
    data: {
      form: 'whole-document',
      file: {
        sourceId: 'source-repository',
        sourceRelativePath,
        encoding: 'utf-8',
        hadLeadingBom: false,
        sizeBytes: 24,
        sourceText: 'prefix_rule(pattern = ["git", "status"], action = "allow")\n',
        diagnosticIds: [],
      },
      diagnostics: [],
    },
  };
}

/** One committed MCP carrier's source-free detail, keyed by its path. */
function carrierFor(sourceRelativePath: string): InspectionDataResult<McpCarrierDetailDto> {
  return {
    globalContentEpoch: 0,
    repositoryGeneration: 0,
    globalGeneration: null,
    data: {
      file: {
        sourceId: 'source-repository',
        sourceRelativePath,
        encoding: 'utf-8',
        hadLeadingBom: false,
        sizeBytes: 24,
        diagnosticIds: [],
      },
      servers: [],
      diagnostics: [],
    },
  };
}

describe('session view state — companion failures stay confined to the pane', () => {
  it('keeps the held entry and fails only the pane when a companion request fails', async () => {
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      new Error('companion chunk lost'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.fileDetailState.value).toBe('ready');

    await state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));
    // The recognition and the file tree describe the skill, not the file
    // that did not load, so the entry survives its companion's failure.
    expect(state.entryDetail.value?.file.sourceRelativePath).toBe(pathFor('entry-1'));
    expect(state.openCompanion.value).toBeNull();
    expect(state.fileDetailState.value).toBe('companion-failed');
    expect(state.detailErrorMessage.value).toBe('companion chunk lost');
  });

  it('returns the pane to its in-flight state the moment a retry dispatches', async () => {
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      new Error('companion chunk lost'),
      detailFor('companion-1'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    await state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));
    expect(state.fileDetailState.value).toBe('companion-failed');

    const retry = state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));
    // Synchronously back in flight: the failed branch — and its retry
    // button — unmounts, so a second click cannot double-dispatch.
    expect(state.fileDetailState.value).toBe('ready');
    await retry;
    expect(state.fileDetailState.value).toBe('ready');
    expect(state.openCompanion.value?.file.sourceRelativePath).toBe(pathFor('companion-1'));
    // A detail success clears the skill-owned error it answers.
    expect(state.detailErrorMessage.value).toBeNull();
  });

  it('reuses a held companion instead of refetching it', async () => {
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      detailFor('companion-1'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    await state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));
    const requestsBefore = scripted.calls.length;

    await state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));
    // Returning to what is already held is a change of selection, not of
    // content: no request leaves, and the held detail stays adopted.
    expect(scripted.calls.length).toBe(requestsBefore);
    expect(state.openCompanion.value?.file.sourceRelativePath).toBe(pathFor('companion-1'));
    expect(state.fileDetailState.value).toBe('ready');
  });

  it('falls to the recoverable failure state when the newer-generation refresh cannot adopt', async () => {
    // A detail withheld as `newer-generation` recovers by refreshing and
    // re-requesting under the adopted snapshot. When that refresh fails
    // non-fatally, nothing is in flight and nothing would ever re-request, so
    // the state must land on the recoverable entry-failure surface — not stay
    // on `loading` — while the refresh's own error stays the shell's report.
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      { ...detailFor('entry-1'), repositoryGeneration: 1 },
      new Error('refresh lost the host briefly'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));

    expect(state.fileDetailState.value).toBe('idle');
    expect(state.entryDetail.value).toBeNull();
    expect(state.openCompanion.value).toBeNull();
    // The failure is the session refresh's, reported once by the shell; the
    // route renders its own recoverable statement without repeating it.
    expect(state.sessionErrorMessage.value).toBe('refresh lost the host briefly');
    expect(state.detailErrorMessage.value).toBeNull();
    expect(state.view.value).toBe('inspection');
  });

  it('keeps a session failure and a detail failure as separate facts', async () => {
    // Two different things can be true at once. One retained message could only
    // hold the newer of them: the detail failure would erase the refresh
    // failure, and leaving the route would take both — so nothing would be
    // reporting a session error nobody has resolved.
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      new Error('refresh lost the host briefly'),
      detailFor('entry-1'),
      new Error('companion chunk lost'),
      sessionResult(bootstrapSnapshot()),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();

    await state.refresh();
    expect(state.sessionErrorMessage.value).toBe('refresh lost the host briefly');
    expect(state.detailErrorMessage.value).toBeNull();

    // The detail failure arrives while the session failure is unresolved. Each
    // reaches its own surface: the shell keeps reporting the session's, and the
    // route now has one of its own to report.
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    await state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));
    expect(state.sessionErrorMessage.value).toBe('refresh lost the host briefly');
    expect(state.detailErrorMessage.value).toBe('companion chunk lost');

    // Answering one leaves the other exactly as it was — the assertion that
    // separates two owned facts from one message with a priority between them.
    await state.refresh();
    expect(state.sessionErrorMessage.value).toBeNull();
    expect(state.detailErrorMessage.value).toBe('companion chunk lost');

    // Leaving the route drops the detail failure, and nothing else changes.
    state.closeFileDetail();
    expect(state.detailErrorMessage.value).toBeNull();
    expect(state.sessionErrorMessage.value).toBeNull();
  });

  it('never routes a detail failure into the message the shell reports', async () => {
    // The shell renders `sessionErrorMessage` in its assertive alert. A detail
    // request's failure reaching that value would be announced twice — once
    // there and once by the route that owns it — so it must stay null through a
    // failure the route is reporting itself.
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      new Error('companion chunk lost'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    await state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));

    expect(state.detailErrorMessage.value).toBe('companion chunk lost');
    expect(state.sessionErrorMessage.value).toBeNull();
    expect(state.view.value).toBe('inspection');
  });

  it('drops a skill-owned error with the route and keeps it through a refresh success', async () => {
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      new Error('companion chunk lost'),
      sessionResult(bootstrapSnapshot()),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    await state.openFileDetail(pathFor('entry-1'), pathFor('companion-1'));
    expect(state.detailErrorMessage.value).toBe('companion chunk lost');

    // A refresh success answers session-level failures only; the retained
    // message still describes the open detail's own failed request.
    await state.refresh();
    expect(state.detailErrorMessage.value).toBe('companion chunk lost');

    // Leaving the route takes the detail failure with it.
    state.closeFileDetail();
    expect(state.detailErrorMessage.value).toBeNull();
  });

  it('drops the detail state before disposing the content that renders it', async () => {
    // The detail page recovers keyboard focus with synchronous watchers on this
    // state, and a watcher can only move focus off an element that is still
    // there. Disposing first would detach the editor the reader is in before
    // any watcher runs, leaving focus on the document body with nothing left to
    // rescue (WCAG 2.4.3). Asserting on what the disposer observes is how that
    // order stays fixed.
    const scripted = channelFrom([sessionResult(bootstrapSnapshot()), detailFor('entry-1')]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.entryDetail.value).not.toBeNull();

    let stateWhenDisposed: unknown;
    let detailWhenDisposed: unknown;
    state.registerOpenContentOwner(() => {
      stateWhenDisposed = state.fileDetailState.value;
      detailWhenDisposed = state.entryDetail.value;
    });

    state.closeFileDetail();
    expect(stateWhenDisposed).toBe('idle');
    expect(detailWhenDisposed).toBeNull();
  });
});

describe("a commit invalidates only its own sequence's open views (FR-030)", () => {
  it('keeps a loading Repository comparison open across a Global commit', async () => {
    // The pair is judged by the family its open request named, held from
    // dispatch: while both detail loads are still in flight nothing adopted
    // can answer it, and resolving the family from the adopted details would
    // close this Repository pair over a Global commit it does not read from —
    // on a page whose own generation never moved, so no route re-requests it.
    const detailHeld = new Promise(() => {});
    const sessions = [
      sessionResult(bootstrapSnapshot()),
      sessionResult(bootstrapSnapshot({ globalGeneration: 1 })),
    ];
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.getSession) {
          return Promise.resolve(sessions.length > 1 ? sessions.shift() : sessions[0]);
        }
        return detailHeld;
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    const opened = state.skillComparison.open(
      { source: 'repository', sourceRelativePath: '.claude/skills/a/SKILL.md' },
      { source: 'repository', sourceRelativePath: '.agents/skills/a/SKILL.md' },
    );
    expect(state.skillComparison.status.value).toBe('loading');
    expect(state.skillComparison.openSequence.value).toBe('repository');
    // The Global sequence commits its first generation; the Repository pair
    // stays exactly where it was, still loading its own sequence's files.
    await state.refresh();
    expect(state.snapshot.value?.globalGeneration).toBe(1);
    expect(state.skillComparison.status.value).toBe('loading');
    expect(state.skillComparison.openSequence.value).toBe('repository');
    state.dispose();
    await Promise.race([opened, Promise.resolve()]);
  });

  it('closes a loading Repository comparison when its own sequence commits', async () => {
    const detailHeld = new Promise(() => {});
    const sessions = [
      sessionResult(bootstrapSnapshot({ repositoryGeneration: 1 })),
      sessionResult(bootstrapSnapshot({ repositoryGeneration: 2 })),
    ];
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        if (method === SESSION_RPC_FUNCTIONS.getSession) {
          return Promise.resolve(sessions.length > 1 ? sessions.shift() : sessions[0]);
        }
        return detailHeld;
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    const opened = state.skillComparison.open(
      { source: 'repository', sourceRelativePath: '.claude/skills/a/SKILL.md' },
      { source: 'repository', sourceRelativePath: '.agents/skills/a/SKILL.md' },
    );
    expect(state.skillComparison.status.value).toBe('loading');
    await state.refresh();
    // Its own sequence moved on: the pair drops so the route re-requests it
    // under the new generation (FR-030).
    expect(state.skillComparison.status.value).toBe('idle');
    expect(state.skillComparison.openSequence.value).toBeNull();
    state.dispose();
    await Promise.race([opened, Promise.resolve()]);
  });
});

describe('an explicit rescan replaces the whole adopted generation (T182)', () => {
  /** A committed generation-1 snapshot with one published skill file. */
  function committedSnapshot(): SessionSnapshot {
    return bootstrapSnapshot({
      repositoryGeneration: 1,
      files: [
        {
          sourceId: 'source-repository',
          sourceRelativePath: pathFor('entry-1'),
          encoding: 'utf-8',
          hadLeadingBom: false,
          sizeBytes: 8,
          diagnosticIds: [],
        },
      ],
    });
  }

  /** The generation-2 replacement: the prior file is gone, another exists. */
  function replacementSnapshot(): SessionSnapshot {
    return bootstrapSnapshot({
      repositoryGeneration: 2,
      files: [
        {
          sourceId: 'source-repository',
          sourceRelativePath: pathFor('entry-2'),
          encoding: 'utf-8',
          hadLeadingBom: false,
          sizeBytes: 8,
          diagnosticIds: [],
        },
      ],
    });
  }

  function rescanHarness(responses: Record<string, () => unknown>) {
    const calls: string[] = [];
    return {
      calls,
      state: new SessionViewState({
        channel: {
          call: (method: SessionRpcFunctionName) => {
            calls.push(method);
            const next = responses[method]!();
            return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
          },
        },
      }),
    };
  }

  it('adopts the replacement snapshot whole and keeps no prior-generation row', async () => {
    const sessions = [sessionResult(committedSnapshot()), sessionResult(replacementSnapshot())];
    const { state } = rescanHarness({
      'agent-customization-inspector:get-session': () =>
        sessions.length > 1 ? sessions.shift() : sessions[0],
      'agent-customization-inspector:rescan-repository': () => ({
        globalContentEpoch: 0,
        data: { scanRequestId: 'req-replace', source: committedSnapshot().sources[0] },
      }),
    });
    await state.start();
    expect(state.snapshot.value?.files.map((file) => file.sourceRelativePath)).toEqual([
      pathFor('entry-1'),
    ]);

    await state.requestRescan();
    // The refetch after acceptance adopted the committed replacement: the
    // whole prior inventory is gone with its generation, never merged.
    expect(state.activeScanRequestId.value).toBe('req-replace');
    expect(state.snapshot.value?.repositoryGeneration).toBe(2);
    expect(state.snapshot.value?.files.map((file) => file.sourceRelativePath)).toEqual([
      pathFor('entry-2'),
    ]);
  });

  it('shows the stale detail state when the replaced generation no longer holds the file', async () => {
    // The reader is on a detail page whose path the replacement commit
    // removed. The next request for it settles as the declared
    // `stale-resource` rejection, and the route lands on its stale state with
    // no prior-generation content left on screen (FR-030).
    const sessions = [sessionResult(committedSnapshot()), sessionResult(replacementSnapshot())];
    const { state } = rescanHarness({
      'agent-customization-inspector:get-session': () =>
        sessions.length > 1 ? sessions.shift() : sessions[0],
      'agent-customization-inspector:rescan-repository': () => ({
        globalContentEpoch: 0,
        data: { scanRequestId: 'req-replace', source: committedSnapshot().sources[0] },
      }),
      'agent-customization-inspector:get-file-detail': () => ({
        error: { code: 'stale-resource' },
      }),
    });
    await state.start();
    await state.requestRescan();
    expect(state.snapshot.value?.repositoryGeneration).toBe(2);

    await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.fileDetailState.value).toBe('stale');
    expect(state.entryDetail.value).toBeNull();
    expect(state.openCompanion.value).toBeNull();
  });

  it('supersedes an open detail request when the selection changes under it', async () => {
    // The request token is the invocation's ownership of the page: a detail
    // that settles after `closeFileDetail` advanced the version must not
    // repopulate the state the reader already left.
    const firstDetail = Promise.withResolvers<unknown>();
    let detailCalls = 0;
    const { state } = rescanHarness({
      'agent-customization-inspector:get-session': () => sessionResult(committedSnapshot()),
      'agent-customization-inspector:get-file-detail': () => {
        detailCalls += 1;
        return detailCalls === 1 ? firstDetail.promise : detailFor('entry-1');
      },
    });
    await state.start();
    const opened = state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
    state.closeFileDetail();
    firstDetail.resolve(detailFor('entry-1'));
    await opened;
    // The settled response was captured under a superseded token: nothing
    // re-adopts it, and the route stays where the reader left it.
    expect(state.entryDetail.value).toBeNull();
    expect(state.fileDetailState.value).toBe('idle');
  });

  it('never adopts a detail that settles behind a rescan replacement', async () => {
    // The reader opens a detail; while that request is in flight, an explicit
    // rescan commits and the view adopts generation 2. The host answers every
    // detail from its current commit, so the late settlement arrives bound to
    // the newer generation than the request's page resolved from — and it
    // must recover through a fresh snapshot-then-re-request, never render
    // under state resolved from the replaced generation
    // (contracts/http-api.md § Concurrency and lifecycle).
    const firstDetail = Promise.withResolvers<unknown>();
    const heldRefresh = Promise.withResolvers<unknown>();
    let detailCalls = 0;
    let sessionCalls = 0;
    const { state } = rescanHarness({
      'agent-customization-inspector:get-session': () => {
        sessionCalls += 1;
        if (sessionCalls === 1) {
          return sessionResult(committedSnapshot());
        }
        // The rescan's own post-acceptance refresh is held, so the client's
        // adopted baseline is still generation 1 when the detail settles.
        if (sessionCalls === 2) {
          return heldRefresh.promise;
        }
        return sessionResult(replacementSnapshot());
      },
      'agent-customization-inspector:rescan-repository': () => ({
        globalContentEpoch: 0,
        data: { scanRequestId: 'req-replace', source: committedSnapshot().sources[0] },
      }),
      'agent-customization-inspector:get-file-detail': () => {
        detailCalls += 1;
        return detailCalls === 1
          ? firstDetail.promise
          : { ...detailFor('entry-2'), repositoryGeneration: 2 };
      },
    });
    await state.start();
    const opened = state.openFileDetail(pathFor('entry-2'), pathFor('entry-2'));
    const rescanned = state.requestRescan();
    // Let the acceptance settle and its refresh dispatch (and stall).
    await Promise.resolve();
    await Promise.resolve();
    // The host has already committed the replacement, so the in-flight detail
    // settles bound to generation 2 while this client still holds 1. It is
    // withheld — never rendered under state resolved from the replaced
    // generation — and recovery re-requests after a fresh snapshot.
    firstDetail.resolve({ ...detailFor('entry-2'), repositoryGeneration: 2 });
    await Promise.resolve();
    heldRefresh.resolve(sessionResult(replacementSnapshot()));
    await opened;
    await rescanned;
    expect(state.snapshot.value?.repositoryGeneration).toBe(2);
    // Adopting the replacing generation ran the FR-027 cleanup: the open
    // selection was closed, its request token advanced, and the in-flight
    // settlement — bound to a generation this page never resolved from — was
    // discarded rather than adopted. Re-requesting the path under the
    // replacement belongs to the route's own open effect, which is not
    // mounted here, so no second request exists to adopt either.
    expect(detailCalls).toBe(1);
    expect(state.entryDetail.value).toBeNull();
    expect(state.openCompanion.value).toBeNull();
    expect(state.fileDetailState.value).toBe('idle');
  });

  it('reads a stamp inherited across a reload as pre-purge, and only after a purge', async () => {
    // The hole this closes: an entry stamped by an earlier document carries a
    // token this load never issued, and comparing tokens can only ever say
    // "unknown". Applied filters, a navigation, a reload, a purge, and Back
    // then landed on that entry with its narrowing intact — the filters the
    // purge exists to drop (data-model.md § RecoveryViewState).
    const inherited = 'stamp-from-an-earlier-document';
    const scripted = channelFrom([sessionResult(bootstrapSnapshot())]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();

    // Before any purge there is nothing to predate, so an inherited stamp
    // keeps its entry's narrowing (T1122).
    expect(state.filterGenerationPredatesPurge(inherited)).toBe(false);
    expect(state.filterGenerationPredatesPurge(state.filterGeneration())).toBe(false);

    const beforePurge = state.filterGeneration();
    state.reportChannelLost(null);
    expect(state.clientDataPurges.value).toBe(1);
    expect(state.filterGeneration()).not.toBe(beforePurge);

    // After it, both non-current stamps are pre-purge: the one this load
    // issued and then replaced, and the one it inherited.
    expect(state.filterGenerationPredatesPurge(beforePurge)).toBe(true);
    expect(state.filterGenerationPredatesPurge(inherited)).toBe(true);
    // The stamp written after the purge is not.
    expect(state.filterGenerationPredatesPurge(state.filterGeneration())).toBe(false);
    // A missing stamp is not a stamp.
    expect(state.filterGenerationPredatesPurge(undefined)).toBe(false);
    state.dispose();
  });

  it('persists nothing anywhere the page could reload it from', async () => {
    // FR-027: the browser holds inspected data in reactive memory alone. No
    // web storage write ever happens, so a rescan replacement cannot be
    // resurrected from anywhere. (CacheStorage and service workers have no
    // code path in the client at all; the session API is reached over the
    // devframe RPC channel, not `fetch`, so there is no response to cache.)
    const localSet = vi.spyOn(Storage.prototype, 'setItem');
    try {
      const scripted = channelFrom([sessionResult(committedSnapshot()), detailFor('entry-1')]);
      const state = new SessionViewState({ channel: scripted.channel });
      await state.start();
      await state.openFileDetail(pathFor('entry-1'), pathFor('entry-1'));
      state.closeFileDetail();
      expect(localSet).not.toHaveBeenCalled();
    } finally {
      localSet.mockRestore();
    }
  });
});
