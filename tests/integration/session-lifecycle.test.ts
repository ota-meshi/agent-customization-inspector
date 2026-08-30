// T928: what a committed generation does to everything that pointed at the
// previous one (FR-027, FR-030).
//
// A generation is the whole state as of its commit, so a rescan is the event
// every held identity has to survive or be answered about: a path the new
// generation lost, a carrier admitted only by the new one, a request token
// from the attempt before. This suite drives the real scan over a real tree
// and asks the session what it answers afterwards.
//
// The client half of the same lifecycle — the view state's held details, the
// Monaco models a comparison mounts, the epoch that makes a late settlement a
// no-op — is the app suite's, because it is browser state: `client-data`,
// `session-view-state`, and each comparison surface's own unit file assert it
// under a DOM. What is here is the half the session owns, where a Monaco model
// cannot exist at all.
//
// There is no acknowledgement state anywhere in it (FR-027): nothing is
// retained to reset, so a purge has nothing of that kind to clear and this
// file has nothing of that kind to assert.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CLAUDE_GLOBAL_RULES } from '../../src/server/inspection/rules/claude';
import { CODEX_GLOBAL_RULES } from '../../src/server/inspection/rules/codex';
import { runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { createInspectorDevframe } from '../../src/server/host/devframe-app';
import { SessionViewState } from '../../src/app/session/view-state';
import { RecordingFileOpener } from '../fixtures/file-opener';
import {
  buildGlobalHomeFixture,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

/** One session and coordinator over `root`, as the host bootstraps them. */
function bootstrap(root: string) {
  const session = new InspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

/** Runs one accepted attempt through the coordinator and returns its request ID. */
async function scanOnce(
  context: ReturnType<typeof bootstrap>,
  trigger: 'startup' | 'request' = 'startup',
): Promise<string> {
  const sourceId = context.session.repositorySourceId;
  const admitted = context.coordinator.admitScan(
    sourceId,
    trigger === 'startup'
      ? { kind: 'startup', operationId: null }
      : { kind: 'request', operationId: `op-${trigger}-${Math.trunc(performance.now())}` },
  );
  if (admitted.kind !== 'admitted') {
    throw new Error('expected admission');
  }
  const publication = await runSourceScan({
    sourceId,
    root: context.session.selectedRepositoryRoot,
    rootFailureOwner: trigger === 'startup' ? 'repository' : `published-source:${sourceId}`,
    scope: 'repository',
  });
  if (publication.kind !== 'publishable') {
    throw new Error('expected a publishable outcome');
  }
  await context.coordinator.completeScan(admitted.scanRequestId, {
    files: publication.files,
    recognitions: publication.recognitions,
    diagnostics: publication.diagnostics,
    outcome: publication.outcome,
    visitedEntries: publication.visitedEntries,
    candidateFiles: publication.candidateFiles,
    readBytes: publication.readBytes,
    censusEscapedDirectories: publication.censusEscapedDirectories,
  });
  return admitted.scanRequestId;
}

/** Writes one skill whose entry point declares `name`. */
function writeSkill(root: string, directory: string, name: string): void {
  mkdirSync(join(root, '.claude/skills', directory), { recursive: true });
  writeFileSync(
    join(root, '.claude/skills', directory, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${name} does something.\n---\n\nBody of ${name}.\n`,
    'utf8',
  );
}

describe('a committed generation replaces what pointed at the last one (T928)', () => {
  it('answers a path the new generation lost, and serves one it gained', async () => {
    const root = mkdtempSync(join(tmpdir(), 'inspector-lifecycle-paths-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeSkill(root, 'leaving', 'leaving');
    const context = bootstrap(root);
    await scanOnce(context);
    // The identity a client holds is the Source-relative Path, and while the
    // generation holds it the detail resolves.
    expect(
      context.session.fileDetail('.claude/skills/leaving/SKILL.md', 'repository'),
    ).not.toBeNull();

    rmSync(join(root, '.claude/skills/leaving'), { recursive: true, force: true });
    writeSkill(root, 'arriving', 'arriving');
    await scanOnce(context, 'request');

    // The link a reader still has open is answered rather than served from the
    // generation that had it: a stale identity resolves to nothing, which the
    // host publishes as its own rejection (contracts/http-api.md
    // § get-file-detail).
    expect(context.session.fileDetail('.claude/skills/leaving/SKILL.md', 'repository')).toBeNull();
    expect(
      context.session.fileDetail('.claude/skills/arriving/SKILL.md', 'repository'),
    ).not.toBeNull();
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(2);
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual([
      '.claude/skills/arriving/SKILL.md',
    ]);
  });

  it('gives every attempt its own token, and the Source carries the newest', async () => {
    const root = mkdtempSync(join(tmpdir(), 'inspector-lifecycle-tokens-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeSkill(root, 'deploy', 'deploy');
    const context = bootstrap(root);
    const first = await scanOnce(context);
    const second = await scanOnce(context, 'request');
    const third = await scanOnce(context, 'request');

    // Three attempts, three tokens: a reused one would let a stale status or a
    // stale inventory satisfy a later command (FR-030).
    expect(new Set([first, second, third]).size).toBe(3);
    const snapshot = context.session.snapshot();
    expect(snapshot.sources[0]!.scanRequestId).toBe(third);
    expect(snapshot.sources[0]!.progress?.scanRequestId).toBe(third);
    expect(snapshot.repositoryGeneration).toBe(3);
  });

  it('projects a carrier only from the generation that admitted it', async () => {
    const root = mkdtempSync(join(tmpdir(), 'inspector-lifecycle-carrier-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeSkill(root, 'deploy', 'deploy');
    const context = bootstrap(root);
    await scanOnce(context);
    // Before the carrier exists there is nothing to project: an MCP row is one
    // declared server name, and a name no carrier declares is on no row.
    expect(context.session.snapshot().mcp).toEqual([]);
    expect(context.session.mcpCarrierDetail('.mcp.json', 'repository')).toBeNull();

    writeFileSync(
      join(root, '.mcp.json'),
      `${JSON.stringify({ mcpServers: { docs: { command: 'npx', args: ['-y', 'mcp-docs'] } } }, null, 2)}\n`,
      'utf8',
    );
    await scanOnce(context, 'request');

    // The projection arrives with the generation that admitted the carrier,
    // under that carrier's own path — never retroactively into the generation
    // before it.
    const snapshot = context.session.snapshot();
    expect(snapshot.mcp.map((entry) => entry.name)).toEqual(['docs']);
    const detail = context.session.mcpCarrierDetail('.mcp.json', 'repository');
    expect(detail?.servers?.map((server) => server.name)).toEqual(['docs']);
    expect(detail?.file.sourceRelativePath).toBe('.mcp.json');
  });

  it('publishes the same epoch and fence throughout, so a client can compare them', async () => {
    const root = mkdtempSync(join(tmpdir(), 'inspector-lifecycle-envelope-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeSkill(root, 'deploy', 'deploy');
    const context = bootstrap(root);
    const before = context.session.dataEnvelope();
    await scanOnce(context);
    await scanOnce(context, 'request');
    const after = context.session.dataEnvelope();

    // No Global sequence exists, so its generation stays null and the content
    // epoch stays where it started: the epoch moves only when a Global disable
    // barrier is accepted, and a Repository rescan is not one. A client
    // comparing them is what makes a late settlement a no-op
    // (data-model.md § BrowserState).
    expect(before.globalGeneration).toBeNull();
    expect(after.globalGeneration).toBeNull();
    expect(after.globalContentEpoch).toBe(before.globalContentEpoch);
    expect(after.repositoryGeneration).toBe(2);
    expect(context.session.snapshot().globalDisableInProgress).toBeNull();
  });

  it('keeps each held detail its own, so one replacement drops nothing else', async () => {
    const root = mkdtempSync(join(tmpdir(), 'inspector-lifecycle-scoped-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeSkill(root, 'deploy', 'deploy');
    writeFileSync(
      join(root, '.mcp.json'),
      `${JSON.stringify({ mcpServers: { docs: { command: 'npx' } } }, null, 2)}\n`,
      'utf8',
    );
    const context = bootstrap(root);
    await scanOnce(context);

    // Scoped cleanup is per identity: the session answers each detail from the
    // committed generation, so reading one never invalidates another. The
    // browser's held-slot rule — a file detail opening over a carrier detail —
    // is the view state's and is asserted under a DOM
    // (`tests/unit/app/session-view-state.test.ts`).
    const skill = context.session.fileDetail('.claude/skills/deploy/SKILL.md', 'repository');
    const carrier = context.session.mcpCarrierDetail('.mcp.json', 'repository');
    expect(skill).not.toBeNull();
    expect(carrier).not.toBeNull();
    expect(context.session.fileDetail('.claude/skills/deploy/SKILL.md', 'repository')).toEqual(
      skill,
    );
    expect(context.session.mcpCarrierDetail('.mcp.json', 'repository')).toEqual(carrier);
  });
});

describe('one Global batch commits once, and no poll sees less (T994)', () => {
  it('shows no member until the one commit publishes them together', async () => {
    // Both member scans have finished reading before anything commits, and a
    // poll between them must still see no Global Source, no generation, and
    // no provisional context: the batch is one atomic publication, never a
    // per-member sequence a refresh could catch half-done (FR-014).
    const base = mkdtempSync(join(tmpdir(), 'aci-lifecycle-batch-'));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const homes = { claude: join(base, 'claude-home'), codex: join(base, 'codex-home') } as const;
    mkdirSync(homes.claude, { recursive: true });
    mkdirSync(homes.codex, { recursive: true });
    writeFileSync(join(homes.claude, 'CLAUDE.md'), '# personal instructions\n', 'utf8');
    writeFileSync(join(homes.codex, 'AGENTS.md'), '# personal codex instructions\n', 'utf8');

    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const registered = coordinator.registerGlobalEnable('preview-lifecycle', 'initial-enable');
    if (registered.kind !== 'admitted') {
      throw new Error('expected the operation to be registered');
    }
    const settled = coordinator.settleGlobalEnable(registered.operationId, 'preview-lifecycle', [
      ...(['claude', 'codex'] as const).map((member) => ({
        member: {
          member,
          origin: 'environment' as const,
          lexicalRoot: homes[member],
          inputState: 'eligible' as const,
          port: null,
        },
        outcome: { kind: 'admitted' as const, root: homes[member] },
      })),
    ]);
    if (settled.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    const catalogs = { claude: CLAUDE_GLOBAL_RULES, codex: CODEX_GLOBAL_RULES } as const;
    const results = [];
    for (const member of ['claude', 'codex'] as const) {
      const publication = await runSourceScan({
        sourceId: session.globalConsent!.controls.get(member)!.sourceId!,
        root: homes[member],
        rootFailureOwner: `global:${member}`,
        scope: 'global',
        rules: catalogs[member],
      });
      if (publication.kind !== 'publishable') {
        throw new Error(`expected the ${member} scan to publish`);
      }
      results.push({
        member,
        files: publication.files,
        recognitions: publication.recognitions,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
        visitedEntries: publication.visitedEntries,
        candidateFiles: publication.candidateFiles,
        readBytes: publication.readBytes,
        censusEscapedDirectories: publication.censusEscapedDirectories,
      });
      // The intermediate poll: every member result so far is in hand, and the
      // public session still carries none of it.
      const between = session.snapshot();
      expect(between.globalGeneration).toBeNull();
      expect(between.sources.filter((source) => source.kind === 'global')).toEqual([]);
      expect(session.fileDetail('CLAUDE.md', 'global-claude')).toBeNull();
    }

    coordinator.completeGlobalBatch(settled.scanRequestId, results);
    const after = session.snapshot();
    // Exactly one generation of the independent Global sequence, publishing
    // both admitted Sources together, with the Repository sequence untouched.
    expect(after.globalGeneration).toBe(1);
    expect(
      after.sources.filter((source) => source.kind === 'global').map((source) => source.member),
    ).toEqual(['claude', 'codex']);
    expect(after.repositoryGeneration).toBe(0);
    // And no pending admission leaks past the commit: the operation is done.
    expect(after.globalEnableInProgress).toBeNull();
  });
});

describe('a batch publishes together; an explicit rescan replaces one Source and carries the rest (T1010)', () => {
  it('distinguishes the two commits while every Source ID and carried graph survives', async () => {
    const base = mkdtempSync(join(tmpdir(), 'aci-lifecycle-rescan-'));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const homes = { claude: join(base, 'claude-home'), codex: join(base, 'codex-home') } as const;
    mkdirSync(homes.claude, { recursive: true });
    mkdirSync(homes.codex, { recursive: true });
    writeFileSync(join(homes.claude, 'CLAUDE.md'), '# personal instructions\n', 'utf8');
    writeFileSync(join(homes.codex, 'AGENTS.md'), '# personal codex instructions\n', 'utf8');

    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const registered = coordinator.registerGlobalEnable('preview-rescan', 'initial-enable');
    if (registered.kind !== 'admitted') {
      throw new Error('expected the operation to be registered');
    }
    const settled = coordinator.settleGlobalEnable(registered.operationId, 'preview-rescan', [
      ...(['claude', 'codex'] as const).map((member) => ({
        member: {
          member,
          origin: 'environment' as const,
          lexicalRoot: homes[member],
          inputState: 'eligible' as const,
          port: null,
        },
        outcome: { kind: 'admitted' as const, root: homes[member] },
      })),
    ]);
    if (settled.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    const catalogs = { claude: CLAUDE_GLOBAL_RULES, codex: CODEX_GLOBAL_RULES } as const;
    const scanOf = async (member: 'claude' | 'codex') => {
      const publication = await runSourceScan({
        sourceId: session.globalConsent!.controls.get(member)!.sourceId!,
        root: homes[member],
        rootFailureOwner: `global:${member}`,
        scope: 'global',
        rules: catalogs[member],
      });
      if (publication.kind !== 'publishable') {
        throw new Error(`expected the ${member} scan to publish`);
      }
      return publication;
    };
    const initialResults = [];
    for (const member of ['claude', 'codex'] as const) {
      const publication = await scanOf(member);
      initialResults.push({
        member,
        files: publication.files,
        recognitions: publication.recognitions,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
        visitedEntries: publication.visitedEntries,
        candidateFiles: publication.candidateFiles,
        readBytes: publication.readBytes,
        censusEscapedDirectories: publication.censusEscapedDirectories,
      });
    }
    coordinator.completeGlobalBatch(settled.scanRequestId, initialResults);
    const published = session.snapshot();
    expect(published.globalGeneration).toBe(1);
    const sourceIds = published.sources.map((source) => source.sourceId).toSorted();
    const claudeSourceId = session.globalConsent!.controls.get('claude')!.sourceId!;
    const codexSourceId = session.globalConsent!.controls.get('codex')!.sourceId!;
    const codexFilesBefore = published.files.filter((file) => file.sourceId === codexSourceId);

    // The explicit rescan of one member: its own directory grew a file, and
    // the commit replaces exactly that Source's graph while the sibling's
    // rides forward — same DTOs, same IDs — and the Repository sequence and
    // views stay untouched (contracts/http-api.md § rescan-global).
    mkdirSync(join(homes.claude, 'rules'), { recursive: true });
    writeFileSync(join(homes.claude, 'rules/style.md'), '# rule\n', 'utf8');
    writeFileSync(join(homes.claude, 'CLAUDE.md'), '# personal instructions, revised\n', 'utf8');
    const admission = coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-rescan',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    const publication = await scanOf('claude');
    await coordinator.completeScan(admission.scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
      censusEscapedDirectories: publication.censusEscapedDirectories,
    });
    const rescanned = session.snapshot();
    expect(rescanned.globalGeneration).toBe(2);
    expect(rescanned.repositoryGeneration).toBe(published.repositoryGeneration);
    expect(rescanned.sources.map((source) => source.sourceId).toSorted()).toEqual(sourceIds);
    expect(rescanned.files.filter((file) => file.sourceId === codexSourceId)).toEqual(
      codexFilesBefore,
    );
    // The rescanned Source's graph is the new directory's: the added rule
    // file joined, and the rewritten instruction file's summary reports the
    // revised bytes. (A snapshot carries no `sourceText` — FR-027 — so the
    // replacement shows through the census and the size.)
    expect(
      rescanned.files
        .filter((file) => file.sourceId === claudeSourceId)
        .map((file) => file.sourceRelativePath)
        .toSorted(),
    ).toEqual(['CLAUDE.md', 'rules/style.md']);
    const revisedSummary = rescanned.files.find(
      (file) => file.sourceId === claudeSourceId && file.sourceRelativePath === 'CLAUDE.md',
    );
    if (revisedSummary?.encoding !== 'utf-8') {
      throw new Error(`expected a utf-8 summary, got ${JSON.stringify(revisedSummary)}`);
    }
    expect(revisedSummary.sizeBytes).toBe('# personal instructions, revised\n'.length);

    // An all-rejected retry disposition commits nothing: no generation, no
    // Source change — the consent stays active for another retry or disable.
    const retryRegistered = coordinator.registerGlobalEnable('preview-rescan', 'retry');
    if (retryRegistered.kind !== 'admitted') {
      throw new Error('expected the retry to be registered');
    }
    const retrySettled = coordinator.settleGlobalEnable(
      retryRegistered.operationId,
      'preview-rescan',
      [
        {
          member: {
            member: 'copilot',
            origin: 'environment' as const,
            lexicalRoot: '/env/copilot',
            inputState: 'eligible' as const,
            port: null,
          },
          outcome: { kind: 'rejected' as const, failureCode: 'root-unreadable' as const },
        },
      ],
    );
    expect(retrySettled.state).toBe('active-no-job');
    const afterRetry = session.snapshot();
    expect(afterRetry.globalGeneration).toBe(2);
    expect(afterRetry.sources.map((source) => source.sourceId).toSorted()).toEqual(sourceIds);
  });
});

describe('the browser purge and fence across disable (T1021, T1026/T1027)', () => {
  let fixture: GlobalHomeFixture;
  let repositoryRoot: string;
  const environment = { ...process.env };

  beforeEach(() => {
    fixture = buildGlobalHomeFixture();
    for (const [variable, value] of Object.entries(fixture.environment)) {
      process.env[variable] = value;
    }
    process.env.HOME = fixture.home;
    repositoryRoot = mkdtempSync(join(tmpdir(), 'aci-disable-repo-'));
  });

  afterEach(() => {
    rmSync(fixture.base, { recursive: true, force: true });
    rmSync(repositoryRoot, { recursive: true, force: true });
    for (const variable of Object.keys(process.env)) {
      if (!(variable in environment)) {
        Reflect.deleteProperty(process.env, variable);
      }
    }
    Object.assign(process.env, environment);
  });

  /** A real host's captured functions bridged as the view state's channel. */
  function bridgedHost(): {
    context: { session: InspectionSession; coordinator: SessionCoordinator };
    channel: { call: (name: string, payload?: unknown) => Promise<unknown> };
    call: (name: string, payload?: unknown) => Promise<unknown>;
  } {
    const session = new InspectionSession({
      invocationCwd: repositoryRoot,
      rootOptionValue: repositoryRoot,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
    const functions = new Map<string, { handler: (body?: unknown) => unknown }>();
    createInspectorDevframe(context).setup?.(
      {
        rpc: {
          register(fn: { name: string; handler: (body?: unknown) => unknown }) {
            functions.set(fn.name, fn);
          },
        },
      } as never,
      undefined as never,
    );
    const call = async (name: string, payload?: unknown): Promise<unknown> => {
      const fn = functions.get(name);
      if (fn === undefined) {
        throw new Error(`no such function: ${name}`);
      }
      return fn.handler(payload);
    };
    return { context, channel: { call }, call };
  }

  /** Enables the members over the fixture homes and waits for the commit. */
  async function enabledHost(): Promise<ReturnType<typeof bridgedHost>> {
    const built = bridgedHost();
    const preview = (
      (await built.call('agent-customization-inspector:create-global-consent-preview')) as {
        data: { previewId: string; allowlistVersion: string };
      }
    ).data;
    await built.call('agent-customization-inspector:enable-global', {
      confirmed: true,
      allowlistVersion: preview.allowlistVersion,
      previewId: preview.previewId,
    });
    await expect
      .poll(() => built.context.session.snapshot().globalControl?.batchStatus, {
        timeout: 10_000,
      })
      .toBeNull();
    return built;
  }

  it('purges before sending, discards the Global sequence, and refetches fresh', async () => {
    const { context, channel } = await enabledHost();
    const state = new SessionViewState({ channel });
    await state.start();
    const before = state.snapshot.value!;
    expect(before.globalGeneration).toBe(1);
    const repositoryBefore = before.sources.find((source) => source.kind === 'repository')!;
    // An open Global detail holds authored content the purge must remove.
    const claudeSelector = 'global-claude';
    await state.openFileDetail('CLAUDE.md', 'CLAUDE.md', undefined, claudeSelector);
    expect(state.entryDetail.value).not.toBeNull();

    await state.requestGlobalDisable();
    // The terminal fresh snapshot: Repository-only, its generation and Source
    // exactly as they were, the Global sequence gone, and nothing of the
    // purged detail restored (FR-042).
    expect(state.view.value).toBe('inspection');
    const after = state.snapshot.value!;
    expect(after.globalGeneration).toBeNull();
    expect(after.globalControl).toBeNull();
    expect(after.sources.map((source) => source.sourceId)).toEqual([repositoryBefore.sourceId]);
    expect(after.repositoryGeneration).toBe(before.repositoryGeneration);
    expect(after.globalContentEpoch).toBe(1);
    expect(state.entryDetail.value).toBeNull();
    expect(state.fenceRecovery.value).toBeNull();
    // Nothing was re-read to produce this: the disable committed no
    // generation in either sequence.
    expect(context.session.snapshot().repositoryGeneration).toBe(before.repositoryGeneration);
    state.dispose();
  });

  it('renders only the recovery while fenced, then recovers through retry', async () => {
    const { context, channel } = await enabledHost();
    // A retained post-acceptance failure fences the host before this tab
    // ever connects.
    const failing = context.coordinator.disposeGlobalDisable(() => {
      throw new Error('cleanup interrupted');
    });
    if (failing.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    await expect(failing.completion).rejects.toThrow('cleanup interrupted');

    const state = new SessionViewState({ channel });
    await state.start();
    // The fresh tab observes the fence: full purge, no snapshot, only the
    // control-only recovery with the retained error.
    expect(state.view.value).toBe('fenced');
    expect(state.snapshot.value).toBeNull();
    expect(state.fenceRecovery.value?.globalDisableInProgress).toMatchObject({
      state: 'failed',
      message: 'cleanup interrupted',
    });
    // Retry from the fenced view: terminal success clears the fence and the
    // full authoritative snapshot is fetched, never reconstructed.
    await state.requestGlobalDisable();
    expect(state.view.value).toBe('inspection');
    expect(state.snapshot.value?.globalGeneration).toBeNull();
    expect(state.snapshot.value?.globalControl).toBeNull();
    expect(state.fenceRecovery.value).toBeNull();
    state.dispose();
  });

  it('recovers a full snapshot immediately after a true no-op', async () => {
    const { channel } = bridgedHost();
    const state = new SessionViewState({ channel });
    await state.start();
    const before = state.snapshot.value!;
    await state.requestGlobalDisable();
    expect(state.view.value).toBe('inspection');
    expect(state.snapshot.value?.repositoryGeneration).toBe(before.repositoryGeneration);
    expect(state.snapshot.value?.globalContentEpoch).toBe(0);
    state.dispose();
  });

  it('never publishes a late Global result across the barrier', async () => {
    const { context, channel, call } = await enabledHost();
    const claudeSourceId = context.session
      .snapshot()
      .sources.find((source) => source.member === 'claude')!.sourceId;
    // A rescan is running when the barrier arrives; its result settles
    // during the drain and must publish nothing.
    await call('agent-customization-inspector:rescan-global', { sourceId: claudeSourceId });
    const state = new SessionViewState({ channel });
    await state.start();
    await state.requestGlobalDisable();
    expect(state.view.value).toBe('inspection');
    expect(state.snapshot.value?.globalGeneration).toBeNull();
    expect(state.snapshot.value?.sources.some((source) => source.sourceId === claudeSourceId)).toBe(
      false,
    );
    state.dispose();
  });
});
