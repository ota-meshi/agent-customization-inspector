// @vitest-environment happy-dom
// T191/T201: the skill comparison view state (FR-011, FR-030, FR-027;
// data-model.md § BrowserState · ComparisonSelection). Skill-scoped by
// design: each family's comparison phase builds its own surface.
//
// The state under test is the browser's: exactly two distinct readable
// current-generation files named by Source-relative Path — the pair is the
// compare route's query, with no standing pre-selection — loaded through
// two ordinary `get-file-detail` requests, because there is no compare API,
// and dropped again by the same three cleanups every detail obeys: a newer
// committed generation, the central client-data purge, and leaving the view.
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under
// the Node environment its contract and integration members need.
import { describe, expect, it, vi } from 'vitest';

import { SessionViewState } from '../../../src/app/session/view-state';
import { SESSION_RPC_FUNCTIONS } from '../../../src/app/session/api-client';
import type {
  FileDetailDto,
  InspectionDataResult,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** The two readable fixture paths most cases compare. */
const LEFT_PATH = '.agents/skills/alpha/SKILL.md';
const RIGHT_PATH = '.agents/skills/beta/SKILL.md';

/** A committed snapshot holding the two readable skills. */
function snapshotWith(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-08-13T00:00:00.000Z',
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [
      {
        sourceId: 'source-repository',
        kind: 'repository',
        tool: null,
        enabled: true,
        status: 'ready',
        boundary: { displayRoot: '/tmp/fixture', origin: 'process-cwd' },
        generation: 0,
        scanRequestId: null,
        progress: null,
        diagnosticIds: [],
      },
    ],
    files: [LEFT_PATH, RIGHT_PATH].map((sourceRelativePath) => ({
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8' as const,
      hadLeadingBom: false,
      sizeBytes: 10,
    })),
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

/** Wraps a payload in the inspection-data success envelope. */
function dataResult<Data>(
  data: Data,
  generations: { repositoryGeneration?: number } = {},
): InspectionDataResult<Data> {
  return {
    globalContentEpoch: 0,
    repositoryGeneration: generations.repositoryGeneration ?? 0,
    globalGeneration: null,
    data,
  };
}

/** One readable detail for a path, with the exact source the host committed. */
function readableDetail(
  sourceRelativePath: string,
  sourceText = `source of ${sourceRelativePath}`,
) {
  const detail: FileDetailDto = {
    kind: 'file',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText,
      sizeBytes: sourceText.length,
    },
    diagnostics: [],
  };
  return detail;
}

/** A binary detail: committed, listed, and comparison-ineligible (FR-025). */
function binaryDetail(sourceRelativePath: string): FileDetailDto {
  return {
    kind: 'file',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'binary',
      sizeBytes: 4,
    },
    diagnostics: [],
  };
}

/**
 * A channel scripted per function: `get-session` answers from a queue that
 * repeats its last entry, and `get-file-detail` answers from the handler the
 * case installed. Every issued call is recorded with its arguments, so a case
 * can assert the exact request sequence — two detail requests and no other
 * function is what "no compare API" means on the wire.
 */
function scriptedChannel(options: {
  sessions: readonly unknown[];
  detail?: (path: string) => unknown | Promise<unknown>;
}) {
  const calls: { method: string; args: readonly unknown[] }[] = [];
  const sessions = [...options.sessions];
  return {
    calls,
    channel: {
      call: (method: string, ...args: readonly unknown[]): Promise<unknown> => {
        calls.push({ method, args });
        if (method === SESSION_RPC_FUNCTIONS.getSession) {
          const next = sessions.length > 1 ? sessions.shift() : sessions[0];
          return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
        }
        if (method === SESSION_RPC_FUNCTIONS.getFileDetail) {
          const handler = options.detail;
          if (handler === undefined) {
            return Promise.reject(new Error('no detail handler scripted'));
          }
          return Promise.resolve().then(() => handler(String(args[0])));
        }
        return Promise.reject(new Error(`unexpected call: ${method}`));
      },
    },
  };
}

/** Paths of the recorded `get-file-detail` calls, in issue order. */
function detailCalls(calls: readonly { method: string; args: readonly unknown[] }[]): string[] {
  return calls
    .filter((call) => call.method === SESSION_RPC_FUNCTIONS.getFileDetail)
    .map((call) => String(call.args[0]));
}

describe('comparison view', () => {
  it('loads exactly two existing details and adopts both, with no compare API', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.skillComparison.status.value).toBe('ready');
    expect(state.skillComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.skillComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    // Two ordinary detail requests, one per side, in selection order. Every
    // call on the wire is a member of the closed catalog the client already
    // had — nothing compare-specific was requested.
    expect(detailCalls(scripted.calls)).toEqual([LEFT_PATH, RIGHT_PATH]);
    state.dispose();
  });

  it('compares two census companions through the same generic path (T201)', async () => {
    // Two `agents/openai.yaml` companions are ordinary readable files that no
    // recognition owns: the view loads and adopts them exactly as it does a
    // pair of entry points, through the same two detail requests, and their
    // details are the unrecognized variant with nothing fabricated onto it.
    const alphaCompanion = '.agents/skills/alpha/agents/openai.yaml';
    const betaCompanion = '.agents/skills/beta/agents/openai.yaml';
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(alphaCompanion, betaCompanion);
    expect(state.skillComparison.status.value).toBe('ready');
    expect(state.skillComparison.leftDetail.value?.kind).toBe('file');
    expect(state.skillComparison.rightDetail.value?.kind).toBe('file');
    expect(detailCalls(scripted.calls)).toEqual([alphaCompanion, betaCompanion]);
    state.dispose();
  });

  it('loads a one-sided comparison for a file only one copy ships', async () => {
    // The file's absence from the other copy is itself the difference
    // (FR-011): one ordinary detail load, the present side published, the
    // absent side left null within 'ready' for the route to state.
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.openSingle(LEFT_PATH, 'left');
    expect(state.skillComparison.status.value).toBe('ready');
    expect(state.skillComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.skillComparison.rightDetail.value).toBeNull();
    expect(detailCalls(scripted.calls)).toEqual([LEFT_PATH]);
    // The present side is wherever the link put the file; the other variant
    // mirrors it.
    await state.skillComparison.openSingle(RIGHT_PATH, 'right');
    expect(state.skillComparison.leftDetail.value).toBeNull();
    expect(state.skillComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    state.dispose();
  });

  it('refuses a one-sided file with no readable source', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(binaryDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.openSingle(LEFT_PATH, 'left');
    // Binary input is textless (FR-025): one-sided or not, there is nothing
    // to show, and the state names the file.
    expect(state.skillComparison.status.value).toBe('not-readable');
    expect(state.skillComparison.unreadablePath.value).toBe(LEFT_PATH);
    expect(state.skillComparison.leftDetail.value).toBeNull();
    state.dispose();
  });

  it('rejects the same path for both inputs without issuing a request', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, LEFT_PATH);
    // The same file cannot occupy both sides even when it has several
    // recognitions (FR-011): the rejection is stated as its own outcome, and
    // no request was spent discovering it.
    expect(state.skillComparison.status.value).toBe('same-path');
    expect(detailCalls(scripted.calls)).toEqual([]);
    state.dispose();
  });

  it('reports a path no current generation holds as the stale outcome', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) =>
        path === RIGHT_PATH
          ? { error: { code: 'stale-resource' } }
          : dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.skillComparison.status.value).toBe('stale');
    // Nothing renders under a selection the generation does not hold.
    expect(state.skillComparison.leftDetail.value).toBeNull();
    expect(state.skillComparison.rightDetail.value).toBeNull();
    // The rejection proves the snapshot is older than the host's commit, so
    // the state refetches the session exactly as the detail route does. The
    // refetch is fired without being awaited, so the assertion waits for it.
    await vi.waitFor(() => {
      expect(
        scripted.calls.filter((call) => call.method === SESSION_RPC_FUNCTIONS.getSession).length,
      ).toBeGreaterThan(1);
    });
    state.dispose();
  });

  it('reports a file with no readable source text instead of comparing it', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) =>
        path === RIGHT_PATH ? dataResult(binaryDetail(path)) : dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    // Binary input is textless and comparison-ineligible (FR-025): the state
    // names the file rather than fabricating an empty side.
    expect(state.skillComparison.status.value).toBe('not-readable');
    expect(state.skillComparison.unreadablePath.value).toBe(RIGHT_PATH);
    expect(state.skillComparison.leftDetail.value).toBeNull();
    expect(state.skillComparison.rightDetail.value).toBeNull();
    state.dispose();
  });

  it('never adopts a settlement captured before the purge', async () => {
    const gate = new Map<string, (value: unknown) => void>();
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) =>
        new Promise((resolve) => {
          gate.set(path, resolve);
        }),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    const opened = state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    await vi.waitFor(() => {
      expect(gate.has(LEFT_PATH)).toBe(true);
    });
    // The channel is lost mid-flight: the central purge runs, and the detail
    // that settles afterwards was captured under the old epoch (FR-027).
    state.reportChannelLost(new Error('gone'));
    gate.get(LEFT_PATH)?.(dataResult(readableDetail(LEFT_PATH)));
    await opened;
    expect(state.skillComparison.status.value).toBe('idle');
    expect(state.skillComparison.leftDetail.value).toBeNull();
    expect(state.view.value).toBe('ended');
    state.dispose();
  });

  it('supersedes an open request when a newer pair is opened', async () => {
    const gate = new Map<string, (value: unknown) => void>();
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) =>
        new Promise((resolve) => {
          gate.set(path, resolve);
        }),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    const first = state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    await vi.waitFor(() => {
      expect(gate.has(LEFT_PATH)).toBe(true);
    });
    const gammaPath = '.agents/skills/gamma/SKILL.md';
    const deltaPath = '.agents/skills/delta/SKILL.md';
    const second = state.skillComparison.open(gammaPath, deltaPath);
    await vi.waitFor(() => {
      expect(gate.has(gammaPath)).toBe(true);
    });
    // The older request settles after the newer one was issued: its token is
    // no longer the latest, so nothing of it renders.
    gate.get(LEFT_PATH)?.(dataResult(readableDetail(LEFT_PATH)));
    await first;
    gate.get(gammaPath)?.(dataResult(readableDetail(gammaPath)));
    await vi.waitFor(() => {
      expect(gate.has(deltaPath)).toBe(true);
    });
    gate.get(deltaPath)?.(dataResult(readableDetail(deltaPath)));
    await second;
    expect(state.skillComparison.status.value).toBe('ready');
    expect(state.skillComparison.leftDetail.value?.file.sourceRelativePath).toBe(gammaPath);
    expect(state.skillComparison.rightDetail.value?.file.sourceRelativePath).toBe(deltaPath);
    state.dispose();
  });

  it('drops the view and the owned editor content when a newer generation commits', async () => {
    const scripted = scriptedChannel({
      sessions: [
        dataResult(snapshotWith()),
        dataResult(snapshotWith({ repositoryGeneration: 1 }), { repositoryGeneration: 1 }),
      ],
      detail: (path) => dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    const disposer = vi.fn();
    const unregister = state.skillComparison.registerOpenContentOwner(disposer);
    // A commit replaces the generation the open comparison was read from:
    // FR-030 invalidates the previous generation's comparison view and
    // editor-model state together; the compare route re-requests the same
    // pair — its URL — under the new snapshot.
    await state.refresh();
    expect(state.snapshot.value?.repositoryGeneration).toBe(1);
    expect(state.skillComparison.status.value).toBe('idle');
    expect(state.skillComparison.leftDetail.value).toBeNull();
    expect(state.skillComparison.rightDetail.value).toBeNull();
    expect(disposer).toHaveBeenCalled();
    unregister();
    state.dispose();
  });

  it('closes the view with the route and disposes the owned content', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(readableDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    const disposer = vi.fn();
    state.skillComparison.registerOpenContentOwner(disposer);
    state.skillComparison.close();
    // Leaving the route drops the authored content and the models that held
    // it (FR-027); the pair itself is the route's query, so nothing else
    // remains to clear.
    expect(state.skillComparison.status.value).toBe('idle');
    expect(state.skillComparison.leftDetail.value).toBeNull();
    expect(disposer).toHaveBeenCalled();
    state.dispose();
  });

  it('retains the real failure message and recovers on a retry', async () => {
    let fail = true;
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => {
        if (fail && path === RIGHT_PATH) {
          return Promise.reject(new Error('detail request failed'));
        }
        return dataResult(readableDetail(path));
      },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.skillComparison.status.value).toBe('failed');
    expect(state.skillComparison.errorMessage.value).toBe('detail request failed');
    // An ordinary request failure is this comparison's alone: the session and
    // its snapshot are untouched, and the same open is the retry.
    expect(state.view.value).toBe('inspection');
    fail = false;
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.skillComparison.status.value).toBe('ready');
    expect(state.skillComparison.errorMessage.value).toBeNull();
    state.dispose();
  });

  it('refreshes instead of rendering a detail bound under a newer generation', async () => {
    const scripted = scriptedChannel({
      sessions: [
        dataResult(snapshotWith()),
        dataResult(snapshotWith({ repositoryGeneration: 1 }), { repositoryGeneration: 1 }),
      ],
      // The host answers from its newer commit: the content would render
      // under labels resolved from the older snapshot, so it is withheld.
      detail: (path) => dataResult(readableDetail(path), { repositoryGeneration: 1 }),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.skillComparison.open(LEFT_PATH, RIGHT_PATH);
    // The newer snapshot was adopted — which is itself the generation change
    // that dropped this open — and the view rests on the recoverable idle
    // state for the route to re-request under the new generation.
    expect(state.snapshot.value?.repositoryGeneration).toBe(1);
    expect(state.skillComparison.status.value).toBe('idle');
    expect(state.skillComparison.leftDetail.value).toBeNull();
    state.dispose();
  });
});
