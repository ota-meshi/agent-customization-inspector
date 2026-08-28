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
import { afterEach, describe, expect, it } from 'vitest';

import { CLAUDE_GLOBAL_RULES } from '../../src/server/inspection/rules/claude';
import { CODEX_GLOBAL_RULES } from '../../src/server/inspection/rules/codex';
import { runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { RecordingFileOpener } from '../fixtures/file-opener';

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
    expect(context.session.fileDetail('.claude/skills/leaving/SKILL.md')).not.toBeNull();

    rmSync(join(root, '.claude/skills/leaving'), { recursive: true, force: true });
    writeSkill(root, 'arriving', 'arriving');
    await scanOnce(context, 'request');

    // The link a reader still has open is answered rather than served from the
    // generation that had it: a stale identity resolves to nothing, which the
    // host publishes as its own rejection (contracts/http-api.md
    // § get-file-detail).
    expect(context.session.fileDetail('.claude/skills/leaving/SKILL.md')).toBeNull();
    expect(context.session.fileDetail('.claude/skills/arriving/SKILL.md')).not.toBeNull();
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
    expect(context.session.mcpCarrierDetail('.mcp.json')).toBeNull();

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
    const detail = context.session.mcpCarrierDetail('.mcp.json');
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
    const skill = context.session.fileDetail('.claude/skills/deploy/SKILL.md');
    const carrier = context.session.mcpCarrierDetail('.mcp.json');
    expect(skill).not.toBeNull();
    expect(carrier).not.toBeNull();
    expect(context.session.fileDetail('.claude/skills/deploy/SKILL.md')).toEqual(skill);
    expect(context.session.mcpCarrierDetail('.mcp.json')).toEqual(carrier);
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
