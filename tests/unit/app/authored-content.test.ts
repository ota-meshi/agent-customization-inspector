// @vitest-environment happy-dom
// T084: how the browser holds authored file content (FR-027).
//
// Three properties, and the first is what the others exist to bound. Authored
// content is published exactly as written — there is no operation anywhere that
// masks a value or reveals a masked one, because the product publishes a value
// as authored or not at all. It is reached only by asking for one file at a
// time; the inventory carries none. And it is held in memory only, so a purge,
// a route change, or the commit that replaces the generation takes it away
// again.
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
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [],
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

/** One committed readable file's detail, with a credential-shaped literal. */
function fileDetail(): FileDetailDto {
  return {
    kind: 'skill',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath: '.agents/skills/secretive/SKILL.md',
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: '---\nname: secretive\n---\n\nghp_FIXTURE000\n',
      sizeBytes: 40,
      diagnosticIds: [],
    },
    presentation: {
      frontmatter: [
        {
          key: 'name',
          keyKind: 'string',
          value: { kind: 'scalar', scalarKind: 'string', text: 'secretive' },
        },
      ],
      bodyText: 'ghp_FIXTURE000\n',
    },
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
    await state.openFileDetail('file-1', 'file-1');
    expect(state.fileDetailState.value).toBe('ready');
    const file = state.entryDetail.value?.file;
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
      'carrierDetail',
      'closeFileDetail',
      // The custom-agent comparison view (FR-011): the agent kind's own two
      // ordinary detail loads, with the same guards as the skill one and
      // nothing that masks or reveals either side.
      'customAgentComparison',
      'detailErrorMessage',
      'dispose',
      'entryDetail',
      // What a plugin manifest's own request failed with: a message about a
      // file, never any of its content, in the slot the manifest is shown in.
      'entryDetailError',
      'fileDetailState',
      // The hook comparison view (FR-011): the hook kind's own two ordinary
      // carrier-detail loads of declarations alone — a hook carrier's source
      // reaches no surface (FR-007), so neither side has anything to mask or
      // reveal.
      'hookComparison',
      // One hook carrier's declarations: the events the file declares, with no
      // source text on the wire at all (FR-007), so there is nothing to mask
      // and nothing to reveal.
      'hookDetail',
      // The instruction comparison view (FR-011): the instruction kind's own
      // two ordinary detail loads, with the same guards as the skill one and
      // nothing that masks or reveals either side.
      'instructionComparison',
      // The MCP comparison view (FR-011): two ordinary carrier-detail loads
      // of declarations alone — no carrier source exists to reveal (FR-007).
      'mcpComparison',
      'openCarrierDetail',
      'openCompanion',
      // Asks the host to hand one committed file to an application on the
      // reader's own machine (FR-022). It uncovers nothing this product hid:
      // the file opens exactly as it would from the reader's own file
      // browser, and the command carries no content in either direction.
      'openFile',
      'openFileDetail',
      // One declared permission policy's own load: a permissions row names a
      // policy rather than a file, so it is its own function's result and its
      // own slot, with the same guards and nothing that masks or reveals it.
      // The hook carrier request, the same guarded detail load every other
      // carrier takes.
      'openHookCarrierDetail',
      'openPluginDetail',
      'openPolicyDetail',
      // The active route's title subject — a display name the page already
      // renders as its heading, never authored content.
      'pageSubject',
      // The plugin kind's own comparison view: two ordinary carrier-detail
      // loads and, for a file selected inside it, two ordinary file-detail
      // loads — with the same guards as the sibling surfaces and nothing that
      // masks or reveals either side.
      'pluginComparison',
      'pluginDetail',
      // A plugin's own files, in their own slots: the plugin's file function
      // answers with the file and its diagnostics, so a file a rule
      // independently admitted keeps its own row for its own kind while these
      // hold what the plugin ships (contracts/http-api.md
      // § get-plugin-file-detail). Nothing masks or reveals either.
      'pluginManifestFile',
      'pluginOpenFile',
      'policyDetail',
      // The prompt-and-command comparison view (FR-011): this kind's own two
      // ordinary detail loads, with the same guards as the others and
      // nothing that masks or reveals either side.
      'promptComparison',
      'refresh',
      // Lets a component register its Monaco model for synchronous disposal
      // on purge and on generation replacement — the opposite of a reveal.
      'registerOpenContentOwner',
      // The subject's ownership pair (`usePageOwnership`): a report and its
      // guarded release, both over the display name above.
      'releasePageSubject',
      'reportChannelLost',
      'reportPageSubject',
      'requestRescan',
      'rescanRejection',
      'rescanState',
      'sessionErrorMessage',
      // The skill comparison view (FR-011): two ordinary detail loads with
      // the same guards as the single open file, and nothing that masks or
      // reveals either side.
      'skillComparison',
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
    await state.openFileDetail('file-1', 'file-1');
    // A lost channel purges, and the content belongs to the session that is
    // gone — it is held in memory only and goes with it.
    state.reportChannelLost(new Error('socket closed'));
    expect(state.entryDetail.value).toBeNull();
    expect(state.fileDetailState.value).toBe('idle');
    state.dispose();
  });

  it('drops the open content when the route leaves the file', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
      [SESSION_RPC_FUNCTIONS.getFileDetail]: dataResult(fileDetail()),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail('file-1', 'file-1');
    state.closeFileDetail();
    expect(state.entryDetail.value).toBeNull();
    state.dispose();
  });

  it('reports nothing when a detail fails after the route already left', async () => {
    // Leaving a route is not an error and cancels nothing already sent, so the
    // answer still arrives — at a page that is no longer the skill's. Writing
    // it would put a file's failure in front of a reader who is back on the
    // inventory, with no file on screen to explain it.
    const detailResponse = Promise.withResolvers<unknown>();
    const state = new SessionViewState({
      channel: {
        call: (method: SessionRpcFunctionName) =>
          method === SESSION_RPC_FUNCTIONS.getSession
            ? Promise.resolve(dataResult(bootstrapSnapshot()))
            : detailResponse.promise,
      },
    });
    await state.start();
    const opening = state.openFileDetail('file-1', 'file-1');
    state.closeFileDetail();
    detailResponse.reject(new Error('the host failed while the reader was leaving'));
    await opening;
    expect(state.detailErrorMessage.value).toBeNull();
    expect(state.fileDetailState.value).toBe('idle');
    expect(state.entryDetail.value).toBeNull();
    state.dispose();
  });

  it('drops the open content when a commit replaces the generation', async () => {
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
    await state.openFileDetail('file-1', 'file-1');
    expect(state.fileDetailState.value).toBe('ready');
    // The next adoption advances the sequence, so the ID this page holds names
    // a file that no longer exists.
    await state.refresh();
    expect(state.entryDetail.value).toBeNull();
    state.dispose();
  });

  it('shows a stale file as its own recoverable state, not as an error', async () => {
    const scripted = channelFor({
      [SESSION_RPC_FUNCTIONS.getSession]: dataResult(bootstrapSnapshot()),
      [SESSION_RPC_FUNCTIONS.getFileDetail]: { error: { code: 'stale-resource' } },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openFileDetail('from-an-older-generation', 'from-an-older-generation');
    expect(state.fileDetailState.value).toBe('stale');
    expect(state.detailErrorMessage.value).toBeNull();
    state.dispose();
  });

  it('withholds a detail read from a generation newer than the adopted snapshot', async () => {
    // The path — the file's whole identity — can survive a commit, so the
    // host answers a generation-1 page from its newer commit with no
    // rejection at all. Adopting that content would put the newer
    // generation's source under the name and census this page resolved from
    // the older snapshot, so the client withholds it and refreshes instead;
    // the route then re-requests the same path under the adopted snapshot.
    let hostGeneration = 1;
    const calls: SessionRpcFunctionName[] = [];
    const channel = {
      call: (method: SessionRpcFunctionName) => {
        calls.push(method);
        if (method === SESSION_RPC_FUNCTIONS.getSession) {
          return Promise.resolve({
            globalContentEpoch: 0,
            repositoryGeneration: hostGeneration,
            globalGeneration: null,
            data: bootstrapSnapshot({ repositoryGeneration: hostGeneration }),
          });
        }
        return Promise.resolve({
          globalContentEpoch: 0,
          // The host has committed past the adopted generation 1.
          repositoryGeneration: 2,
          globalGeneration: null,
          data: fileDetail(),
        });
      },
    };
    const state = new SessionViewState({ channel });
    await state.start();
    hostGeneration = 2;
    await state.openFileDetail('file-1', 'file-1');
    // Nothing mixed rendered: the newer-generation response was withheld
    // rather than adopted.
    expect(state.entryDetail.value).toBeNull();
    // The withholding triggered the refresh that adopts the newer snapshot.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls.filter((method) => method === SESSION_RPC_FUNCTIONS.getSession).length).toBe(2);
    expect(state.snapshot.value?.repositoryGeneration).toBe(2);
    state.dispose();
  });
});
