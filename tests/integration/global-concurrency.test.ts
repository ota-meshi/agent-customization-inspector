// T1009: Repository and Global work queued side by side — the enable's batch
// completion, concurrent explicit rescans of both sequences, a member that
// publishes `partial`, fatal retention, and explicit retry — with the consent
// and every admitted boundary unchanged throughout (FR-014, FR-030;
// contracts/http-api.md § rescan-global, § Concurrency and lifecycle).
import { chmodSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createInspectorDevframe,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { RecordingFileOpener } from '../fixtures/file-opener';
import {
  buildGlobalHomeFixture,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import type { CommandResult, ScanAdmission } from '../../src/shared/api-types';

/** One registered RPC function as captured from the definition's `setup`. */
interface CapturedRpcFunction {
  readonly name: string;
  readonly type: string;
  readonly handler: (...args: never[]) => unknown;
}

/** The acceptance payload, or a failure naming what came back. */
function acceptedData<Data>(result: unknown): Data {
  const success = result as CommandResult<Data>;
  if (typeof success !== 'object' || success === null || !('data' in success)) {
    throw new Error(`expected an acceptance, got ${JSON.stringify(result)}`);
  }
  return success.data;
}

const realEnvironment = { ...process.env };

describe('Repository and Global work side by side (T1009)', () => {
  let fixture: GlobalHomeFixture;

  beforeEach(() => {
    fixture = buildGlobalHomeFixture();
    for (const [variable, value] of Object.entries(fixture.environment)) {
      process.env[variable] = value;
    }
    process.env.HOME = fixture.home;
  });

  afterEach(() => {
    chmodSync(fixture.homes.codex, 0o700);
    rmSync(fixture.base, { recursive: true, force: true });
    for (const variable of Object.keys(process.env)) {
      if (!(variable in realEnvironment)) {
        Reflect.deleteProperty(process.env, variable);
      }
    }
    Object.assign(process.env, realEnvironment);
  });

  /** One host enabled over the fixture homes, with its batch committed. */
  async function publishedHost(): Promise<{
    context: InspectorHostContext;
    functions: Map<string, CapturedRpcFunction>;
  }> {
    // Its own empty Repository root: the homes must never double as the
    // selected repository, or the Repository scan would read them under the
    // Repository rules (FR-001).
    const repositoryRoot = mkdtempSync(join(tmpdir(), 'aci-concurrency-repo-'));
    const session = new InspectionSession({
      invocationCwd: repositoryRoot,
      rootOptionValue: repositoryRoot,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
    const functions = new Map<string, CapturedRpcFunction>();
    createInspectorDevframe(context).setup?.(
      {
        rpc: {
          register(fn: CapturedRpcFunction) {
            functions.set(fn.name, fn);
          },
        },
      } as never,
      undefined as never,
    );
    const create = functions.get('agent-customization-inspector:create-global-consent-preview')!;
    const enable = functions.get('agent-customization-inspector:enable-global')!;
    const preview = acceptedData<{ previewId: string; allowlistVersion: string }>(create.handler());
    acceptedData(
      await (enable.handler as (body: unknown) => Promise<unknown>)({
        confirmed: true,
        allowlistVersion: preview.allowlistVersion,
        previewId: preview.previewId,
      }),
    );
    // The enable answers once its batch committed (contracts/http-api.md
    // § enable-global), so the rescans below run against the committed
    // generation with no batch left in flight.
    expect(context.session.snapshot().globalControl?.batchStatus).toBeNull();
    return { context, functions };
  }

  it('commits concurrent Repository and Global rescans independently, consent unchanged', async () => {
    const { context, functions } = await publishedHost();
    const before = context.session.snapshot();
    // The committed batch published each member with its final progress: the
    // walk's own counters carried through the batch commit, never null and
    // never the admission's zeros (data-model.md § ScanProgress).
    for (const source of before.sources.filter((entry) => entry.kind === 'global')) {
      expect(source.progress?.phase).toBe('complete');
      expect(source.progress?.visitedEntries).toBeGreaterThan(0);
    }
    const claudeSourceId = before.sources.find((source) => source.member === 'claude')!.sourceId;
    const boundariesBefore = before.sources.map((source) => source.boundary);
    const consentBefore = before.globalControl;

    const rescanRepository = functions.get('agent-customization-inspector:rescan-repository')!;
    const rescanGlobal = functions.get('agent-customization-inspector:rescan-global')!;
    // Both commands admitted while the other runs: each sequence admits its
    // own work, and each answers with its own commit rather than waiting for
    // the other's (contracts/http-api.md § rescan-repository, § rescan-global).
    const [repositoryAnswer, globalAnswer] = await Promise.all([
      (rescanRepository.handler as () => Promise<unknown>)(),
      (rescanGlobal.handler as (body: unknown) => Promise<unknown>)({
        sourceId: claudeSourceId,
      }),
    ]);
    const repositoryResult = acceptedData<ScanAdmission>(repositoryAnswer);
    expect(['ready', 'partial']).toContain(repositoryResult.source.status);
    expect(repositoryResult.source.progress?.phase).toBe('complete');
    expect(acceptedData<ScanAdmission>(globalAnswer).source.sourceId).toBe(claudeSourceId);

    const after = context.session.snapshot();
    expect([after.repositoryGeneration, after.globalGeneration]).toEqual([
      before.repositoryGeneration + 1,
      (before.globalGeneration ?? 0) + 1,
    ]);
    // Each commit advanced only its own sequence, every Source ID survived,
    // and the consent — controls, confirmed set, boundaries — is exactly what
    // it was: a rescan reads what consent already granted and grants nothing
    // (FR-013, FR-030).
    expect(after.sources.map((source) => source.sourceId).toSorted()).toEqual(
      before.sources.map((source) => source.sourceId).toSorted(),
    );
    expect(after.sources.map((source) => source.boundary)).toEqual(boundariesBefore);
    expect(after.globalControl).toEqual(consentBefore);
    expect(after.snapshotState).toBe('current');
  });

  it('keeps a partial member partial across its own rescan while siblings stay ready', async () => {
    const { context, functions } = await publishedHost();
    if (!fixture.capabilities.symlinks) {
      // The copilot home's broken link is what makes it partial; without
      // links the premise does not exist on this platform.
      return;
    }
    const before = context.session.snapshot();
    const copilot = before.sources.find((source) => source.member === 'copilot')!;
    expect(copilot.status).toBe('partial');

    const rescanGlobal = functions.get('agent-customization-inspector:rescan-global')!;
    acceptedData(
      await (rescanGlobal.handler as (body: unknown) => Promise<unknown>)({
        sourceId: copilot.sourceId,
      }),
    );
    await expect
      .poll(() => context.session.snapshot().globalGeneration, { timeout: 15_000 })
      .toBe((before.globalGeneration ?? 0) + 1);
    const after = context.session.snapshot();
    // The file-confined outcomes are the member's own and publish again as
    // `partial` (FR-028); the siblings' carried graphs keep their statuses.
    expect(after.sources.find((source) => source.sourceId === copilot.sourceId)?.status).toBe(
      'partial',
    );
    expect(after.sources.find((source) => source.member === 'claude')?.status).toBe('ready');
    expect(after.snapshotState).toBe('current');
  });

  it('retains a fatal Global rescan and recovers it with an explicit retry', async () => {
    const { context, functions } = await publishedHost();
    const before = context.session.snapshot();
    const codexSourceId = before.sources.find((source) => source.member === 'codex')!.sourceId;
    const rescanGlobal = functions.get('agent-customization-inspector:rescan-global')!;
    const rescan = rescanGlobal.handler as (body: unknown) => Promise<unknown>;

    chmodSync(fixture.homes.codex, 0o000);
    if (statSync(fixture.homes.codex).mode & 0o700) {
      // Running as root, or a filesystem that ignores the mode: the failing
      // premise cannot be materialized here.
      return;
    }
    try {
      acceptedData(await rescan({ sourceId: codexSourceId }));
      await expect
        .poll(() => context.session.snapshot().snapshotState, { timeout: 10_000 })
        .toBe('stale-after-fatal-rescan');
      const stale = context.session.snapshot();
      // Nothing committed and nothing granted or revoked: the retained graph,
      // the consent, and every boundary are exactly the pre-failure ones.
      expect(stale.globalGeneration).toBe(before.globalGeneration);
      expect(stale.globalControl?.previewId).toBe(before.globalControl?.previewId);
      expect(stale.sources.map((source) => source.boundary)).toEqual(
        before.sources.map((source) => source.boundary),
      );
    } finally {
      chmodSync(fixture.homes.codex, 0o700);
    }
    acceptedData(await rescan({ sourceId: codexSourceId }));
    await expect
      .poll(() => context.session.snapshot().snapshotState, { timeout: 10_000 })
      .toBe('current');
    expect(context.session.snapshot().globalGeneration).toBe((before.globalGeneration ?? 0) + 1);
  });

  describe('the disable barrier across running and queued work (T1019, T1023/T1024)', () => {
    it('waits out an enable batch still reading before committing the removal', async () => {
      // The barrier arrives while the enable's batch is still in flight: the
      // batch is one Global-sequence transaction the drain must wait for, and
      // its late results publish nothing. Expected cancellation retains no
      // error and no Diagnostic (contracts/http-api.md § disable-global).
      const repositoryRoot = mkdtempSync(join(tmpdir(), 'aci-disable-batch-repo-'));
      const session = new InspectionSession({
        invocationCwd: repositoryRoot,
        rootOptionValue: repositoryRoot,
        fileOpener: new RecordingFileOpener(),
      });
      const context = { session, coordinator: new SessionCoordinator(session) };
      const functions = new Map<string, CapturedRpcFunction>();
      createInspectorDevframe(context).setup?.(
        {
          rpc: {
            register(fn: CapturedRpcFunction) {
              functions.set(fn.name, fn);
            },
          },
        } as never,
        undefined as never,
      );
      const call = async (name: string, body?: unknown): Promise<unknown> =>
        (
          functions.get(`agent-customization-inspector:${name}`)!.handler as (
            body?: unknown,
          ) => unknown
        )(body);
      const preview = acceptedData<{ previewId: string; allowlistVersion: string }>(
        await call('create-global-consent-preview'),
      );
      acceptedData(
        await call('enable-global', {
          confirmed: true,
          allowlistVersion: preview.allowlistVersion,
          previewId: preview.previewId,
        }),
      );
      // No poll: the batch is accepted and very likely still reading.
      const disabled = acceptedData<{ state: string }>(await call('disable-global'));
      expect(disabled.state).toBe('disabled');
      const after = context.session.snapshot();
      expect(after.globalGeneration).toBeNull();
      expect(after.globalControl).toBeNull();
      expect(after.sources.map((source) => source.kind)).toEqual(['repository']);
      expect(after.staleFailures).toEqual([]);
      expect(after.snapshotState).toBe('current');
    });

    it('cancels Global work, holds Repository work, and requeues it after success', async () => {
      const { context, functions } = await publishedHost();
      const before = context.session.snapshot();
      const claudeSourceId = before.sources.find((source) => source.member === 'claude')!.sourceId;
      const codexSourceId = before.sources.find((source) => source.member === 'codex')!.sourceId;
      const call = async (name: string, body?: unknown): Promise<unknown> =>
        (
          functions.get(`agent-customization-inspector:${name}`)!.handler as (
            body?: unknown,
          ) => unknown
        )(body);

      // Running Global work, queued Global work, and a Repository command all
      // in flight when the barrier arrives.
      acceptedData(await call('rescan-global', { sourceId: claudeSourceId }));
      acceptedData(await call('rescan-global', { sourceId: codexSourceId }));
      acceptedData(await call('rescan-repository'));
      const disabled = acceptedData<{ state: string; commitKind: string }>(
        await call('disable-global'),
      );
      expect(disabled).toMatchObject({ state: 'disabled', commitKind: 'remove-active-state' });

      // The Global sequence is gone whole — running and queued commands alike
      // published nothing — while the held Repository command was requeued once
      // under its own admission and later commits its sequence's N+1.
      const after = context.session.snapshot();
      expect(after.globalGeneration).toBeNull();
      expect(after.globalControl).toBeNull();
      expect(after.sources.map((source) => source.kind)).toEqual(['repository']);
      await expect
        .poll(() => context.session.snapshot().repositoryGeneration, { timeout: 15_000 })
        .toBe(before.repositoryGeneration + 1);
      expect(context.session.snapshot().snapshotState).toBe('current');
      // Expected cancellation retained nothing: no stale overlay, no batch
      // error, no diagnostic of the cancelled commands.
      expect(context.session.snapshot().staleFailures).toEqual([]);
    });

    it('keeps every fence closed through a retained failure, then drains on retry', async () => {
      const { context, functions } = await publishedHost();
      const call = async (name: string, body?: unknown): Promise<unknown> =>
        (
          functions.get(`agent-customization-inspector:${name}`)!.handler as (
            body?: unknown,
          ) => unknown
        )(body);
      const failing = context.coordinator.disposeGlobalDisable(() => {
        throw new Error('interrupted');
      });
      if (failing.kind !== 'pending') {
        throw new Error('expected an accepted barrier');
      }
      await expect(failing.completion).rejects.toThrow('interrupted');
      // The fence never reopens on failure: every inspection-data route stays
      // on the conflict, and the epoch stays at its single increment.
      expect(await call('rescan-repository')).toEqual({
        error: { code: 'global-disable-pending' },
      });
      expect(context.session.globalContentEpoch).toBe(1);
      const retried = acceptedData<{ state: string }>(await call('disable-global'));
      expect(retried.state).toBe('disabled');
      expect(context.session.snapshot().globalDisableInProgress).toBeNull();
    });
  });
});
