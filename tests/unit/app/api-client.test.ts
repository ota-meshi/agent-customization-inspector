// @vitest-environment happy-dom
// T041: session API client guards (contracts/http-api.md § Common results
// and errors, § get-session). Covers the request-token, `clientDataEpoch`,
// `globalContentEpoch`, and per-sequence generation guards; the rule that
// an inspection-data success renders only while the fence is null and the
// epoch it was bound under is unchanged; late responses; zero persistence;
// and zero calls outside the session API contract.
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under
// the Node environment its contract and integration members need.
import { DevframeConnectionError } from 'devframe/client';
import { describe, expect, it, vi } from 'vitest';

import {
  SESSION_RPC_FUNCTIONS,
  SessionApiClient,
  type ClientDataGuard,
  type SessionRpcFunctionName,
} from '../../../src/app/session/api-client';
import type {
  InspectionDataResult,
  SessionSnapshot,
  SourceDto,
} from '../../../src/shared/api-types';

/** A snapshot skeleton; each test overrides only the fields it asserts on. */
function snapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-07-24T00:00:00.000Z',
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [],
    files: [],
    instructions: [],
    rules: [],
    prompts: [],
    permissions: [],
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
function sessionResult(
  data: SessionSnapshot,
  overrides: Partial<Omit<InspectionDataResult<SessionSnapshot>, 'data'>> = {},
): InspectionDataResult<SessionSnapshot> {
  return {
    globalContentEpoch: data.globalContentEpoch,
    repositoryGeneration: data.repositoryGeneration,
    globalGeneration: data.globalGeneration,
    data,
    ...overrides,
  };
}

/** A scripted channel that records every invoked function name. */
function scriptedChannel(responses: readonly unknown[]) {
  const calls: SessionRpcFunctionName[] = [];
  let index = 0;
  return {
    calls,
    channel: {
      call: (method: SessionRpcFunctionName) => {
        calls.push(method);
        const response = responses[index] ?? responses.at(-1);
        index += 1;
        return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
      },
    },
  };
}

/** A client-data guard whose epoch the test advances explicitly. */
function guard(): ClientDataGuard & { advance: () => void; purges: string[] } {
  let epoch = 0;
  const purges: string[] = [];
  return {
    epoch: () => epoch,
    purge: (reason) => {
      purges.push(reason);
      epoch += 1;
    },
    advance: () => {
      epoch += 1;
    },
    purges,
  };
}

/** The one Source a rescan admission names, as the host projects it. */
const REPOSITORY_SOURCE: SourceDto = {
  sourceId: 'src-repo',
  kind: 'repository',
  tool: null,
  enabled: true,
  status: 'ready',
  boundary: { displayRoot: '/tmp/repo', origin: 'process-cwd' },
  generation: 2,
  scanRequestId: 'req-1',
  progress: null,
  diagnosticIds: [],
};

describe('a newer generation abandons data, not commands', () => {
  it('keeps an in-flight rescan while superseding the snapshot fetch', async () => {
    // A rescan is work the user asked for and is waiting on its admission
    // response. Adopting a newer snapshot invalidates that sequence's *data*,
    // not a command still in flight (contracts/http-api.md § Concurrency and
    // lifecycle), so the command must settle on its own terms.
    const rescanResponse = Promise.withResolvers<unknown>();
    const channel = {
      call: (method: SessionRpcFunctionName) =>
        method === SESSION_RPC_FUNCTIONS.rescanRepository
          ? rescanResponse.promise
          : Promise.resolve(sessionResult(snapshot(), { repositoryGeneration: 2 })),
    };
    const client = new SessionApiClient({ channel, clientData: guard() });
    const rescan = client.rescanRepository();
    // A snapshot at a newer generation arrives while the command is pending.
    const adopted = await client.fetchSession();
    expect(adopted.kind).toBe('adopted');
    rescanResponse.resolve({
      globalContentEpoch: 0,
      repositoryGeneration: 2,
      globalGeneration: null,
      data: { scanRequestId: 'req-1', source: REPOSITORY_SOURCE },
    });
    // Not discarded: the command's own token is still the latest of its family.
    expect(await rescan).toMatchObject({ kind: 'accepted', scanRequestId: 'req-1' });
  });
});

describe('session API client — invoked functions', () => {
  it('calls nothing outside the closed session function catalog', async () => {
    const scripted = scriptedChannel([sessionResult(snapshot())]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData: guard() });
    await client.fetchSession();
    const catalog = Object.values(SESSION_RPC_FUNCTIONS);
    expect(scripted.calls).toHaveLength(1);
    for (const call of scripted.calls) {
      expect(catalog).toContain(call);
    }
  });

  it('persists nothing to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const scripted = scriptedChannel([sessionResult(snapshot())]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData: guard() });
    await client.fetchSession();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe('session API client — inspection-data guards', () => {
  it('adopts a snapshot that passes every guard', async () => {
    const scripted = scriptedChannel([sessionResult(snapshot())]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData: guard() });
    const outcome = await client.fetchSession();
    expect(outcome).toEqual({
      kind: 'adopted',
      snapshot: snapshot(),
      advancedSequences: ['repository'],
    });
  });

  it('reports the advanced sequence when a newer generation arrives', async () => {
    const scripted = scriptedChannel([
      sessionResult(snapshot()),
      sessionResult(snapshot({ repositoryGeneration: 1 })),
    ]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData: guard() });
    await client.fetchSession();
    const outcome = await client.fetchSession();
    expect(outcome).toMatchObject({ kind: 'adopted', advancedSequences: ['repository'] });
  });

  it('ignores an older generation of an already adopted sequence', async () => {
    const scripted = scriptedChannel([
      sessionResult(snapshot({ repositoryGeneration: 2 })),
      sessionResult(snapshot({ repositoryGeneration: 1 })),
      sessionResult(snapshot({ repositoryGeneration: 2 })),
    ]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData: guard() });
    await client.fetchSession();
    const outcome = await client.fetchSession();
    expect(outcome).toEqual({ kind: 'discarded', reason: 'older-generation' });
    await expect(client.fetchSession()).resolves.toMatchObject({
      kind: 'adopted',
      advancedSequences: [],
    });
  });

  it('guards older and newer Global generations independently from Repository', async () => {
    const scripted = scriptedChannel([
      sessionResult(snapshot({ repositoryGeneration: 4, globalGeneration: 2 })),
      sessionResult(snapshot({ repositoryGeneration: 4, globalGeneration: 1 })),
      sessionResult(snapshot({ repositoryGeneration: 4, globalGeneration: 3 })),
    ]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData: guard() });
    await client.fetchSession();

    await expect(client.fetchSession()).resolves.toEqual({
      kind: 'discarded',
      reason: 'older-generation',
    });

    await expect(client.fetchSession()).resolves.toMatchObject({
      kind: 'adopted',
      advancedSequences: ['global'],
    });
  });

  it('adopts equal non-null generations only for the latest request token', async () => {
    const heldResponse = Promise.withResolvers<unknown>();
    const responses: unknown[] = [
      // The baseline adoption, so the two overlapping requests below carry
      // an equal generation and no sequence advances between them.
      Promise.resolve(sessionResult(snapshot({ globalGeneration: 3 }))),
      heldResponse.promise,
      Promise.resolve(sessionResult(snapshot({ globalGeneration: 3 }))),
    ];
    let index = 0;
    const channel = {
      call: () => {
        const response = responses[index];
        index += 1;
        return response as Promise<unknown>;
      },
    };
    const client = new SessionApiClient({ channel, clientData: guard() });
    await client.fetchSession();
    const stale = client.fetchSession();
    const fresh = await client.fetchSession();
    expect(fresh.kind).toBe('adopted');
    heldResponse.resolve(sessionResult(snapshot({ globalGeneration: 3 })));
    // The first of the pair settled last; its token is no longer the latest,
    // so it is a late response and never reaches rendered state.
    await expect(stale).resolves.toEqual({ kind: 'discarded', reason: 'superseded-request' });
  });

  it('discards a result captured under a superseded clientDataEpoch', async () => {
    const clientData = guard();
    const channel = {
      call: () => {
        // A purge lands while the request is in flight.
        clientData.advance();
        return Promise.resolve(sessionResult(snapshot()));
      },
    };
    const client = new SessionApiClient({ channel, clientData });
    await expect(client.fetchSession()).resolves.toEqual({
      kind: 'discarded',
      reason: 'client-data-epoch-advanced',
    });
  });

  it('purges instead of rendering a result that carries a non-null fence', async () => {
    const clientData = guard();
    const fenced = snapshot({
      globalDisableInProgress: { operationId: 'op', state: 'draining' },
    } as unknown as Partial<SessionSnapshot>);
    const scripted = scriptedChannel([sessionResult(fenced)]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData });
    const outcome = await client.fetchSession();
    expect(outcome).toEqual({ kind: 'purged', reason: 'global-disable-fence' });
    expect(clientData.purges).toEqual(['global-disable-fence']);
  });

  it('purges when the Global content epoch advanced under the result', async () => {
    const clientData = guard();
    const scripted = scriptedChannel([
      sessionResult(snapshot()),
      sessionResult(snapshot({ globalContentEpoch: 1 })),
    ]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData });
    await client.fetchSession();
    const outcome = await client.fetchSession();
    expect(outcome).toEqual({ kind: 'purged', reason: 'global-content-epoch-advanced' });
    expect(clientData.purges).toEqual(['global-content-epoch-advanced']);
  });

  it('purges when the host answers as a different session', async () => {
    const clientData = guard();
    const scripted = scriptedChannel([
      sessionResult(snapshot()),
      sessionResult(snapshot({ sessionId: 'session-b' })),
    ]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData });
    await client.fetchSession();
    await expect(client.fetchSession()).resolves.toEqual({
      kind: 'purged',
      reason: 'session-identity-lost',
    });
  });

  it('treats a lower epoch from another session as identity loss, not stale data', async () => {
    const clientData = guard();
    const scripted = scriptedChannel([
      sessionResult(snapshot({ globalContentEpoch: 5 })),
      sessionResult(snapshot({ sessionId: 'session-b', globalContentEpoch: 0 })),
    ]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData });
    await client.fetchSession();
    await expect(client.fetchSession()).resolves.toEqual({
      kind: 'purged',
      reason: 'session-identity-lost',
    });
    expect(clientData.purges).toEqual(['session-identity-lost']);
  });

  it('surfaces a deterministic rejection as its closed code', async () => {
    const scripted = scriptedChannel([{ error: { code: 'global-disable-pending' } }]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData: guard() });
    await expect(client.fetchSession()).resolves.toEqual({
      kind: 'rejected',
      code: 'global-disable-pending',
    });
  });

  it('purges and fails closed for a rejection code outside the catalog', async () => {
    const clientData = guard();
    const scripted = scriptedChannel([{ error: { code: 'invented-rejection' } }]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData });
    await expect(client.fetchSession()).resolves.toMatchObject({
      kind: 'failed',
      error: {
        message:
          'The local session returned an unsupported rejection. Restart the inspector and reload this page.',
      },
    });
    expect(clientData.purges).toEqual(['channel-failure']);
  });

  it('purges and ends the session when the channel itself is gone', async () => {
    const clientData = guard();
    const scripted = scriptedChannel([new DevframeConnectionError('connection', 'socket closed')]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData });
    const outcome = await client.fetchSession();
    expect(outcome).toMatchObject({ kind: 'failed', fatal: true });
    expect(clientData.purges).toEqual(['channel-failure']);
  });

  it('keeps the session for a handler or delivery failure', async () => {
    // A handler that threw, or a serialization failure after it returned, is
    // that request's own error (contracts/http-api.md § Concurrency and
    // lifecycle). Purging for it would discard a committed snapshot the user is
    // still reading over one failed call.
    const clientData = guard();
    const scripted = scriptedChannel([new Error('handler blew up')]);
    const client = new SessionApiClient({ channel: scripted.channel, clientData });
    const outcome = await client.fetchSession();
    expect(outcome).toMatchObject({ kind: 'failed', fatal: false });
    expect(clientData.purges).toEqual([]);
  });

  it('discards a superseded rejection without purging newer client state', async () => {
    const heldResponse = Promise.withResolvers<unknown>();
    const responses: unknown[] = [
      Promise.resolve(sessionResult(snapshot())),
      heldResponse.promise,
      Promise.resolve(sessionResult(snapshot())),
    ];
    let index = 0;
    const channel = {
      call: () => {
        const response = responses[index];
        index += 1;
        return response as Promise<unknown>;
      },
    };
    const clientData = guard();
    const client = new SessionApiClient({ channel, clientData });
    await client.fetchSession();
    const stale = client.fetchSession();
    const fresh = await client.fetchSession();
    expect(fresh.kind).toBe('adopted');
    heldResponse.reject(new Error('superseded socket failure'));
    await expect(stale).resolves.toEqual({ kind: 'discarded', reason: 'superseded-request' });
    expect(clientData.purges).toEqual([]);
  });

  it('discards a settlement whose request was aborted', async () => {
    const heldResponse = Promise.withResolvers<unknown>();
    const channel = { call: () => heldResponse.promise };
    const client = new SessionApiClient({ channel, clientData: guard() });
    const pending = client.fetchSession();
    client.abortOutstandingRequests();
    heldResponse.resolve(sessionResult(snapshot()));
    await expect(pending).resolves.toEqual({ kind: 'discarded', reason: 'aborted' });
  });
});
