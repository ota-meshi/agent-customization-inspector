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
  InspectionDataResult,
  SessionSnapshot,
} from '../../../src/shared/api-types';

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
        diagnosticIds: [],
      },
    ],
    files: [],
    instructions: [],
    skills: [],
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

  it('never repopulates the view with data captured before a purge', async () => {
    // The client's own guard and this module's assignment are in different
    // microtasks. A purge landing in that gap clears the view; the assignment
    // must not put the pre-purge snapshot back (FR-027, FR-042).
    let releaseFetch: ((value: unknown) => void) | undefined;
    const channel = {
      call: () =>
        new Promise((resolve) => {
          releaseFetch = resolve;
        }),
    };
    const state = new SessionViewState({ channel });
    const started = state.start();
    // A purge runs while the fetch is still in flight.
    state.dispose();
    releaseFetch!(sessionResult(bootstrapSnapshot()));
    await started;
    expect(state.snapshot.value).toBeNull();
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
    const state = new SessionViewState({ channel });
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
    const state = new SessionViewState({ channel: scripted.channel });
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

describe('session view state — companion failures stay confined to the pane', () => {
  it('keeps the held entry and fails only the pane when a companion request fails', async () => {
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      new Error('companion chunk lost'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.skillDetailState.value).toBe('ready');

    await state.openSkill(pathFor('entry-1'), pathFor('companion-1'));
    // The recognition and the file tree describe the skill, not the file
    // that did not load, so the entry survives its companion's failure.
    expect(state.skillDetail.value?.file.sourceRelativePath).toBe(pathFor('entry-1'));
    expect(state.openCompanion.value).toBeNull();
    expect(state.skillDetailState.value).toBe('companion-failed');
    expect(state.skillErrorMessage.value).toBe('companion chunk lost');
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
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    await state.openSkill(pathFor('entry-1'), pathFor('companion-1'));
    expect(state.skillDetailState.value).toBe('companion-failed');

    const retry = state.openSkill(pathFor('entry-1'), pathFor('companion-1'));
    // Synchronously back in flight: the failed branch — and its retry
    // button — unmounts, so a second click cannot double-dispatch.
    expect(state.skillDetailState.value).toBe('ready');
    await retry;
    expect(state.skillDetailState.value).toBe('ready');
    expect(state.openCompanion.value?.file.sourceRelativePath).toBe(pathFor('companion-1'));
    // A detail success clears the skill-owned error it answers.
    expect(state.skillErrorMessage.value).toBeNull();
  });

  it('reuses a held companion instead of refetching it', async () => {
    const scripted = channelFrom([
      sessionResult(bootstrapSnapshot()),
      detailFor('entry-1'),
      detailFor('companion-1'),
    ]);
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    await state.openSkill(pathFor('entry-1'), pathFor('companion-1'));
    const requestsBefore = scripted.calls.length;

    await state.openSkill(pathFor('entry-1'), pathFor('companion-1'));
    // Returning to what is already held is a change of selection, not of
    // content: no request leaves, and the held detail stays adopted.
    expect(scripted.calls.length).toBe(requestsBefore);
    expect(state.openCompanion.value?.file.sourceRelativePath).toBe(pathFor('companion-1'));
    expect(state.skillDetailState.value).toBe('ready');
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
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));

    expect(state.skillDetailState.value).toBe('idle');
    expect(state.skillDetail.value).toBeNull();
    expect(state.openCompanion.value).toBeNull();
    // The failure is the session refresh's, reported once by the shell; the
    // route renders its own recoverable statement without repeating it.
    expect(state.sessionErrorMessage.value).toBe('refresh lost the host briefly');
    expect(state.skillErrorMessage.value).toBeNull();
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
    expect(state.skillErrorMessage.value).toBeNull();

    // The detail failure arrives while the session failure is unresolved. Each
    // reaches its own surface: the shell keeps reporting the session's, and the
    // route now has one of its own to report.
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    await state.openSkill(pathFor('entry-1'), pathFor('companion-1'));
    expect(state.sessionErrorMessage.value).toBe('refresh lost the host briefly');
    expect(state.skillErrorMessage.value).toBe('companion chunk lost');

    // Answering one leaves the other exactly as it was — the assertion that
    // separates two owned facts from one message with a priority between them.
    await state.refresh();
    expect(state.sessionErrorMessage.value).toBeNull();
    expect(state.skillErrorMessage.value).toBe('companion chunk lost');

    // Leaving the route drops the detail failure, and nothing else changes.
    state.closeSkill();
    expect(state.skillErrorMessage.value).toBeNull();
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
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    await state.openSkill(pathFor('entry-1'), pathFor('companion-1'));

    expect(state.skillErrorMessage.value).toBe('companion chunk lost');
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
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    await state.openSkill(pathFor('entry-1'), pathFor('companion-1'));
    expect(state.skillErrorMessage.value).toBe('companion chunk lost');

    // A refresh success answers session-level failures only; the retained
    // message still describes the open detail's own failed request.
    await state.refresh();
    expect(state.skillErrorMessage.value).toBe('companion chunk lost');

    // Leaving the route takes the detail failure with it.
    state.closeSkill();
    expect(state.skillErrorMessage.value).toBeNull();
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
    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.skillDetail.value).not.toBeNull();

    let stateWhenDisposed: unknown;
    let detailWhenDisposed: unknown;
    state.registerOpenContentOwner(() => {
      stateWhenDisposed = state.skillDetailState.value;
      detailWhenDisposed = state.skillDetail.value;
    });

    state.closeSkill();
    expect(stateWhenDisposed).toBe('idle');
    expect(detailWhenDisposed).toBeNull();
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

    await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    expect(state.skillDetailState.value).toBe('stale');
    expect(state.skillDetail.value).toBeNull();
    expect(state.openCompanion.value).toBeNull();
  });

  it('supersedes an open detail request when the selection changes under it', async () => {
    // The request token is the invocation's ownership of the page: a detail
    // that settles after `closeSkill` advanced the version must not
    // repopulate the state the reader already left.
    let settleFirst!: (value: unknown) => void;
    const first = new Promise((resolve) => {
      settleFirst = resolve;
    });
    let detailCalls = 0;
    const { state } = rescanHarness({
      'agent-customization-inspector:get-session': () => sessionResult(committedSnapshot()),
      'agent-customization-inspector:get-file-detail': () => {
        detailCalls += 1;
        return detailCalls === 1 ? first : detailFor('entry-1');
      },
    });
    await state.start();
    const opened = state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
    state.closeSkill();
    settleFirst(detailFor('entry-1'));
    await opened;
    // The settled response was captured under a superseded token: nothing
    // re-adopts it, and the route stays where the reader left it.
    expect(state.skillDetail.value).toBeNull();
    expect(state.skillDetailState.value).toBe('idle');
  });

  it('never adopts a detail that settles behind a rescan replacement', async () => {
    // The reader opens a detail; while that request is in flight, an explicit
    // rescan commits and the view adopts generation 2. The host answers every
    // detail from its current commit, so the late settlement arrives bound to
    // the newer generation than the request's page resolved from — and it
    // must recover through a fresh snapshot-then-re-request, never render
    // under state resolved from the replaced generation
    // (contracts/http-api.md § Concurrency and lifecycle).
    let settleDetail!: (value: unknown) => void;
    const firstDetail = new Promise((resolve) => {
      settleDetail = resolve;
    });
    let settleRefresh!: (value: unknown) => void;
    const heldRefresh = new Promise((resolve) => {
      settleRefresh = resolve;
    });
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
          return heldRefresh;
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
          ? firstDetail
          : { ...detailFor('entry-2'), repositoryGeneration: 2 };
      },
    });
    await state.start();
    const opened = state.openSkill(pathFor('entry-2'), pathFor('entry-2'));
    const rescanned = state.requestRescan();
    // Let the acceptance settle and its refresh dispatch (and stall).
    await Promise.resolve();
    await Promise.resolve();
    // The host has already committed the replacement, so the in-flight detail
    // settles bound to generation 2 while this client still holds 1. It is
    // withheld — never rendered under state resolved from the replaced
    // generation — and recovery re-requests after a fresh snapshot.
    settleDetail({ ...detailFor('entry-2'), repositoryGeneration: 2 });
    await Promise.resolve();
    settleRefresh(sessionResult(replacementSnapshot()));
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
    expect(state.skillDetail.value).toBeNull();
    expect(state.openCompanion.value).toBeNull();
    expect(state.skillDetailState.value).toBe('idle');
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
      await state.openSkill(pathFor('entry-1'), pathFor('entry-1'));
      state.closeSkill();
      expect(localSet).not.toHaveBeenCalled();
    } finally {
      localSet.mockRestore();
    }
  });
});
