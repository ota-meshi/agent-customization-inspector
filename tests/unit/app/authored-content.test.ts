// @vitest-environment happy-dom
// T084: how the browser holds authored file content (FR-027).
//
// Three properties, and the first is what the others exist to bound. Authored
// content is published exactly as written — there is no operation anywhere that
// masks a value or reveals a masked one, because the product publishes a value
// as authored or not at all. It is reached only by asking for one file at a
// time; the inventory carries none. And it is held in memory only, so a purge,
// a route change, or the commit that rekeys every file ID takes it away again.
//
// There is deliberately nothing here about an acknowledgement gate. FR-027 has
// none: one would stand in front of a loopback-only session showing the viewer
// their own files, protecting nothing while making every file take two
// interactions to read.
//
// The assertions run against the view state rather than a mounted component:
// the unit project has no single-file-component compiler, and adding one
// changes the approved dependency baseline that T001 gates (the same reason
// T058 gives). What the detail page renders — that the content appears whole
// and that no reveal control sits beside it — is asserted against the real page
// in `tests/e2e/codex-skills-detail.spec.ts`.
import { describe, expect, it } from 'vitest';

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
    sources: [],
    files: [],
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

/** One committed readable file's detail, with a credential-shaped literal. */
function fileDetail(fileId = 'file-1'): FileDetailDto {
  return {
    file: {
      fileId,
      sourceId: 'source-repository',
      sourceRelativePath: '.agents/skills/secretive/SKILL.md',
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: '---\nname: secretive\n---\n\nghp_FIXTURE000\n',
      sizeBytes: 40,
      diagnosticIds: [],
    },
    recognitions: [],
    diagnostics: [],
  };
}

/** Wraps a payload in the inspection-data success envelope. */
function dataResult<Data>(data: Data): InspectionDataResult<Data> {
  return { globalContentEpoch: 0, repositoryGeneration: 0, globalGeneration: null, data };
}

/** A channel answering each function from a fixed map, recording every call. */
function channelFor(responses: Partial<Record<SessionRpcFunctionName, unknown>>) {
  const calls: SessionRpcFunctionName[] = [];
  return {
    calls,
    channel: {
      call: (method: SessionRpcFunctionName) => {
        calls.push(method);
        return Promise.resolve(responses[method]);
      },
    },
  };
}

describe('authored file content in the browser', () => {
  it('fetches no file content while only the inventory is open', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    // The snapshot carries no `sourceText`, so browsing the inventory fetches
    // no file content at all: it is reached only by opening one file.
    expect(scripted.calls).toEqual([SESSION_RPC_FUNCTIONS.getSession]);
    state.dispose();
  });

  it('serves the complete authored source of the file that was opened', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
      [SESSION_RPC_FUNCTIONS.getFileDetail]: dataResult(fileDetail()),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openSkill('file-1', 'file-1');
    expect(state.skillDetailState.value).toBe('ready');
    const file = state.skillDetail.value?.file;
    if (file?.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    // Exactly as authored: the credential-shaped literal is present, whole,
    // and unmarked. There is nothing to un-hide because nothing was hidden.
    expect(file.sourceText).toContain('ghp_FIXTURE000');
    state.dispose();
  });

  it('offers no operation that masks a value or reveals a masked one', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    // Opening and closing a file is the whole surface: there is no `reveal`,
    // `unmask`, or `resolve` command to call, because nothing was hidden. The
    // surface is the instance's own fields plus its class's methods — private
    // state is `#`-private, so nothing else is reachable at runtime either.
    const surface = [
      ...Object.keys(state),
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(state)).filter(
        (name) => name !== 'constructor',
      ),
    ];
    expect(surface.toSorted()).toEqual([
      'activeScanRequestId',
      'closeSkill',
      'dispose',
      'openCompanion',
      'openSkill',
      // The active route's title subject — a display name the page already
      // renders as its heading, never authored content.
      'pageSubject',
      'refresh',
      // Lets a component register its Monaco model for synchronous disposal
      // on purge and on generation replacement — the opposite of a reveal.
      'registerOpenContentOwner',
      'reportChannelLost',
      'requestRescan',
      'rescanRejection',
      'rescanState',
      'sessionErrorMessage',
      'skillDetail',
      'skillDetailState',
      'skillErrorMessage',
      'snapshot',
      'start',
      'view',
    ]);
    state.dispose();
  });

  it('drops the open content on a client-data purge', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
      [SESSION_RPC_FUNCTIONS.getFileDetail]: dataResult(fileDetail()),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openSkill('file-1', 'file-1');
    // A lost channel purges, and the content belongs to the session that is
    // gone — it is held in memory only and goes with it.
    state.reportChannelLost(new Error('socket closed'));
    expect(state.skillDetail.value).toBeNull();
    expect(state.skillDetailState.value).toBe('idle');
    state.dispose();
  });

  it('drops the open content when the route leaves the file', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
      [SESSION_RPC_FUNCTIONS.getFileDetail]: dataResult(fileDetail()),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openSkill('file-1', 'file-1');
    state.closeSkill();
    expect(state.skillDetail.value).toBeNull();
    state.dispose();
  });

  it('reports nothing when a detail fails after the route already left', async () => {
    // Leaving a route is not an error and cancels nothing already sent, so the
    // answer still arrives — at a page that is no longer the skill's. Writing
    // it would put a file's failure in front of a reader who is back on the
    // inventory, with no file on screen to explain it.
    let settleDetail: (value: unknown) => void = () => {};
    const state = new SessionViewState({
      channel: {
        call: (method: SessionRpcFunctionName) =>
          method === SESSION_RPC_FUNCTIONS.getSession
            ? Promise.resolve(dataResult(bootstrapSnapshot()))
            : new Promise((_resolve, reject) => {
                settleDetail = reject;
              }),
      },
    });
    await state.start();
    const opening = state.openSkill('file-1', 'file-1');
    state.closeSkill();
    settleDetail(new Error('the host failed while the reader was leaving'));
    await opening;
    expect(state.skillErrorMessage.value).toBeNull();
    expect(state.skillDetailState.value).toBe('idle');
    expect(state.skillDetail.value).toBeNull();
    state.dispose();
  });

  it('drops the open content when a commit rekeys every file ID', async () => {
    // Two snapshots: the one the page adopted, then the one a completed rescan
    // published. Only the second advances the sequence.
    const sessions = [
      dataResult(bootstrapSnapshot()),
      {
        ...dataResult(bootstrapSnapshot({ repositoryGeneration: 1 })),
        repositoryGeneration: 1,
      },
    ];
    const state = new SessionViewState({
      channel: {
        call: (method: SessionRpcFunctionName) =>
          Promise.resolve(
            method === SESSION_RPC_FUNCTIONS.getSession
              ? (sessions.shift() ?? sessions[0])
              : dataResult(fileDetail()),
          ),
      },
    });
    await state.start();
    await state.openSkill('file-1', 'file-1');
    expect(state.skillDetailState.value).toBe('ready');
    // The next adoption advances the sequence, so the ID this page holds names
    // a file that no longer exists.
    await state.refresh();
    expect(state.skillDetail.value).toBeNull();
    state.dispose();
  });

  it('shows a stale file as its own recoverable state, not as an error', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
      [SESSION_RPC_FUNCTIONS.getFileDetail]: { error: { code: 'stale-resource' } },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openSkill('from-an-older-generation', 'from-an-older-generation');
    expect(state.skillDetailState.value).toBe('stale');
    expect(state.skillErrorMessage.value).toBeNull();
    state.dispose();
  });
});
