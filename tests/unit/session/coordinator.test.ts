// T946: the fixed-three Global enable coordinator (FR-013, FR-014,
// contracts/http-api.md § enable-global, data-model.md
// § GlobalEnableOperation).
//
// Every member outcome here is injected. That is the point of the port
// boundary: the coordinator's job is the partition, the atomic disposition,
// and the single batch — not admission, which belongs to the inspection module
// and is measured against real directories by
// `tests/integration/global-boundaries.test.ts`. Injecting outcomes is what
// lets one-to-three-admitted partitions be driven without a production root,
// and no case here synthesizes one.
//
// This suite is deliberately not a claim that all three production ports work:
// Codex is the one bound member of this slice, and T991/T993 own the
// all-real-port proof once Phases 97–98 bind the other two.
import { describe, expect, it } from 'vitest';

import { InspectionSession, SessionCoordinator } from '../../../src/server/session/session';
import { RecordingFileOpener } from '../../fixtures/file-opener';
import type {
  GlobalEnableMember,
  GlobalResolvedOutcome,
} from '../../../src/server/session/global-control';
import type { GlobalMemberId } from '../../../src/shared/api-types';

/** The frozen preview ID every case binds its operation to. */
const PREVIEW_ID = 'preview-under-test';

/** One session and coordinator, as the host bootstraps them. */
function bootstrap() {
  const session = new InspectionSession({
    invocationCwd: '/repo',
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

/** One resolved member slot, with the outcome the case is about. */
function slot(memberId: GlobalMemberId, outcome: GlobalResolvedOutcome) {
  const member: GlobalEnableMember = {
    member: memberId,
    origin: 'environment',
    lexicalRoot: `/env/${memberId}`,
    inputState: outcome.kind === 'admitted' ? 'eligible' : 'present-empty',
    // Null because nothing in this suite calls a port: the outcome is the
    // input, which is what makes these cases independent of admission.
    port: null,
  };
  return { member, outcome };
}

/** An admitted slot for `memberId`, with the root an admission would have returned. */
function admitted(memberId: GlobalMemberId) {
  return slot(memberId, { kind: 'admitted', root: `/env/${memberId}` });
}

/** A rejected slot for `memberId` with the given closed reason. */
function rejected(memberId: GlobalMemberId, failureCode: 'present-empty' | 'root-unreadable') {
  return slot(memberId, { kind: 'rejected', failureCode });
}

/** Registers an operation and returns its ID, failing the case if refused. */
function register(
  coordinator: SessionCoordinator,
  kind: 'initial-enable' | 'retry' = 'initial-enable',
) {
  const registered = coordinator.registerGlobalEnable(PREVIEW_ID, kind);
  if (registered.kind !== 'admitted') {
    throw new Error('expected the operation to be registered');
  }
  return registered.operationId;
}

describe('registering one Global enable operation (T946)', () => {
  it('exposes only the authority-free projection while it runs', () => {
    const { session, coordinator } = bootstrap();
    const operationId = register(coordinator);
    const snapshot = session.snapshot();

    // What a poll can see is that an operation exists — and nothing else. No
    // control, no pending tool, no Source, no job: a partial tool outcome
    // visible here would be a transaction observable before it committed.
    expect(snapshot.globalEnableInProgress).toEqual({
      kind: 'initial-enable',
      operationId,
      previewId: PREVIEW_ID,
    });
    expect(snapshot.globalControl).toBeNull();
    expect(snapshot.sources.filter((source) => source.kind === 'global')).toEqual([]);
    expect(snapshot.globalGeneration).toBeNull();
  });

  it('refuses a duplicate rather than running two transactions', () => {
    const { coordinator } = bootstrap();
    register(coordinator);
    // Two operations over one consent would each prepare a batch and only one
    // could commit, so the second is the fixed conflict.
    expect(coordinator.registerGlobalEnable(PREVIEW_ID, 'initial-enable')).toEqual({
      kind: 'conflict',
    });
  });

  it('leaves nothing behind when an operation is abandoned', () => {
    const { session, coordinator } = bootstrap();
    const operationId = register(coordinator);
    coordinator.abandonGlobalEnable(operationId);

    // A throw during admission is not confined to one tool: the transaction
    // aborts with no consent, no control, and no job, and no terminal
    // operation history is kept.
    expect(session.globalEnableInProgress).toBeNull();
    expect(session.globalConsent).toBeNull();
    // And the next enable is admitted, because the abandoned one holds nothing.
    expect(coordinator.registerGlobalEnable(PREVIEW_ID, 'initial-enable').kind).toBe('admitted');
  });

  it('refuses a disposition from an operation that is no longer registered', () => {
    const { coordinator } = bootstrap();
    const operationId = register(coordinator);
    coordinator.abandonGlobalEnable(operationId);
    // A drained operation has no authority to activate anything; the throw is
    // what stops a late continuation from committing a transaction the
    // coordinator has forgotten.
    expect(() =>
      coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [admitted('codex')]),
    ).toThrow();
  });
});

describe('the atomic disposition (T946)', () => {
  it('returns active-no-job with no job, Source, or generation when none is admitted', () => {
    const { session, coordinator } = bootstrap();
    const operationId = register(coordinator);
    const result = coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      rejected('codex', 'present-empty'),
    ]);

    expect(result).toEqual({
      state: 'active-no-job',
      scanRequestId: null,
      acceptedTools: [],
      rejectedTools: ['codex'],
    });
    const snapshot = session.snapshot();
    // Consent stays active so the reader can retry or disable, and nothing was
    // created to scan.
    expect(snapshot.globalControl?.state).toBe('active');
    expect(snapshot.globalControl?.batchStatus).toBeNull();
    expect(snapshot.globalControl?.pendingTools).toEqual([]);
    expect(snapshot.globalGeneration).toBeNull();
    expect(snapshot.sources.filter((source) => source.kind === 'global')).toEqual([]);
    expect(snapshot.globalEnableInProgress).toBeNull();
  });

  it('queues exactly one batch with one shared request ID for any admitted subset', () => {
    for (const admittedTools of [
      ['codex'],
      ['claude', 'codex'],
      ['copilot', 'claude', 'codex'],
    ] as const) {
      const { session, coordinator } = bootstrap();
      const operationId = register(coordinator);
      const result = coordinator.settleGlobalEnable(
        operationId,
        PREVIEW_ID,
        admittedTools.map((tool) => admitted(tool)),
      );

      expect(result.state, admittedTools.join()).toBe('queued');
      expect(result.scanRequestId).not.toBeNull();
      // One batch, one ID, one working set — whatever the subset's size. Each
      // admitted tool is pending under that one ID, and `batchStatus` carries
      // the same set, so a fresh poll recovers a lost acceptance response.
      const control = session.snapshot().globalControl!;
      expect(control.pendingTools).toEqual([...admittedTools]);
      expect(control.batchStatus).toEqual({
        scanRequestId: result.scanRequestId,
        tools: [...admittedTools],
        phase: 'waiting',
        failureRef: null,
      });
      // Every admitted tool has its own Source overlay under the shared ID,
      // and no Source is published yet: the batch commits them together.
      expect(session.snapshot().sources.filter((source) => source.kind === 'global')).toEqual([]);
    }
  });

  it('partitions the evaluated tools into disjoint sets in the fixed order', () => {
    const { session, coordinator } = bootstrap();
    const operationId = register(coordinator);
    const result = coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      rejected('copilot', 'present-empty'),
      admitted('codex'),
      rejected('claude', 'root-unreadable'),
    ]);

    // Fixed tool order regardless of the order the outcomes arrived in, and
    // disjoint: a tool is admitted or refused, never both.
    expect(result.acceptedTools).toEqual(['codex']);
    expect(result.rejectedTools).toEqual(['copilot', 'claude']);
    expect(result.acceptedTools.filter((tool) => result.rejectedTools.includes(tool))).toEqual([]);
    // Each refusal's reason is on its own control, and the lexical one requires
    // a new preview while the post-consent one does not.
    const controls = session.snapshot().globalControl!.controls;
    expect(controls).toEqual([
      {
        member: 'copilot',
        state: 'rejected',
        failureCode: 'present-empty',
        retryDisposition: 'new-preview-required',
      },
      {
        member: 'claude',
        state: 'rejected',
        failureCode: 'root-unreadable',
        retryDisposition: 'same-preview',
      },
      { member: 'codex', state: 'admitted', failureCode: null, retryDisposition: null },
    ]);
  });

  it('derives retryable tools from the controls, excluding pending and lexical ones', () => {
    const { session, coordinator } = bootstrap();
    const operationId = register(coordinator);
    coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      rejected('copilot', 'present-empty'),
      rejected('claude', 'root-unreadable'),
      admitted('codex'),
    ]);

    // Codex is admitted and pending, so it is not retryable while its batch
    // runs; Copilot's rejection is lexical, so the same preview cannot fix it;
    // Claude's is not, so it is the one retryable tool.
    const control = session.snapshot().globalControl!;
    expect(control.pendingTools).toEqual(['codex']);
    expect(control.retryableTools).toEqual(['claude']);
  });

  it('fixes confirmedTools to all three however many were evaluated', () => {
    const { session, coordinator } = bootstrap();
    const operationId = register(coordinator);
    coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [admitted('codex')]);

    // The consent is for all three tools even in this slice, where only the
    // Codex port is bound: what a reader confirmed is the whole preview, and
    // the absent controls are how the unbound members stay visible as
    // unevaluated rather than as refusals nothing produced.
    const control = session.snapshot().globalControl!;
    expect(control.confirmedTools).toEqual(['copilot', 'claude', 'codex', 'agents']);
    expect(control.controls.map((entry) => entry.member)).toEqual(['codex']);
  });
});

describe('committing and failing one accepted batch (T946)', () => {
  /** Settles one admitted-Codex transaction and returns the shared request ID. */
  function queueCodex(context: ReturnType<typeof bootstrap>): string {
    const operationId = register(context.coordinator);
    const result = context.coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      admitted('codex'),
    ]);
    if (result.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    return result.scanRequestId;
  }

  it('publishes every member together in exactly one generation', () => {
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    context.coordinator.completeGlobalBatch(scanRequestId, [
      { member: 'codex', files: [], recognitions: [], diagnostics: [], outcome: 'complete' },
    ]);

    const snapshot = context.session.snapshot();
    // The enable commit creates the sequence at generation 1, publishes the
    // Source, and removes the status: a batch that finished is not one anyone
    // is waiting for.
    expect(snapshot.globalGeneration).toBe(1);
    expect(
      snapshot.sources.filter((source) => source.kind === 'global').map((s) => s.member),
    ).toEqual(['codex']);
    expect(snapshot.globalControl?.batchStatus).toBeNull();
    expect(snapshot.globalControl?.pendingTools).toEqual([]);
    expect(snapshot.globalControl?.controls).toEqual([
      { member: 'codex', state: 'published', failureCode: null, retryDisposition: null },
    ]);
    // A published tool cannot also be retryable: it has the Source a retry
    // would have been for.
    expect(snapshot.globalControl?.retryableTools).toEqual([]);
  });

  it('commits nothing after the shutdown revocation, exactly as a revoked attempt does', () => {
    // The CLI's close handler (cli.ts § requestClose) revokes every
    // publication before closing the host. The batch holds no attempt entry,
    // so this is the flag's own path: a batch still reading at shutdown must
    // not commit a generation afterwards (data-model.md § ScanAttempt).
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    context.coordinator.revokeAllPublicationAuthority();
    context.coordinator.completeGlobalBatch(scanRequestId, [
      { member: 'codex', files: [], recognitions: [], diagnostics: [], outcome: 'complete' },
    ]);

    const snapshot = context.session.snapshot();
    expect(snapshot.globalGeneration).toBeNull();
    expect(snapshot.sources.filter((source) => source.kind === 'global')).toEqual([]);
  });

  it('records a throw once for the whole batch, with no per-tool failure', () => {
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    context.coordinator.failGlobalBatch(scanRequestId, 'EMFILE: too many open files');

    const control = context.session.snapshot().globalControl!;
    // The failure was not confined to one tool's files, so attributing it to
    // one would be inventing a cause: it is the failed request's own error,
    // retained once on the failed status.
    expect(control.batchStatus?.phase).toBe('failed');
    expect(control.batchStatus?.failureRef).toEqual({
      kind: 'error',
      message: 'EMFILE: too many open files',
    });
    expect(control.controls).toEqual([
      { member: 'codex', state: 'admitted', failureCode: null, retryDisposition: null },
    ]);
    // No generation, no Source, and the tool is retryable again now that its
    // batch is over.
    expect(context.session.snapshot().globalGeneration).toBeNull();
    expect(control.pendingTools).toEqual([]);
    expect(control.retryableTools).toEqual(['codex']);
  });

  it('attributes a deterministic member failure to that member and commits nothing', () => {
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    context.coordinator.completeGlobalBatch(
      scanRequestId,
      [],
      [{ member: 'codex', failureCode: 'root-unreadable' }],
    );

    const control = context.session.snapshot().globalControl!;
    // Every admitted member failed deterministically: the status names the
    // tools and each reason is on its own control, which the list does not
    // repeat.
    expect(control.batchStatus?.failureRef).toEqual({
      kind: 'tool-failures',
      failedTools: ['codex'],
    });
    expect(control.controls).toEqual([
      {
        member: 'codex',
        state: 'rejected',
        failureCode: 'root-unreadable',
        retryDisposition: 'same-preview',
      },
    ]);
    expect(context.session.snapshot().globalGeneration).toBeNull();
    // The reason is not lexical, so the same frozen preview can be retried.
    expect(control.retryableTools).toEqual(['codex']);
  });

  it('discards a late result whose batch is no longer the accepted one', () => {
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    context.coordinator.completeGlobalBatch(scanRequestId, [
      { member: 'codex', files: [], recognitions: [], diagnostics: [], outcome: 'complete' },
    ]);
    const committed = context.session.snapshot();

    // A second delivery of the same batch, after its status was removed: it
    // commits nothing rather than a second generation (FR-029).
    context.coordinator.completeGlobalBatch(scanRequestId, [
      { member: 'codex', files: [], recognitions: [], diagnostics: [], outcome: 'partial' },
    ]);
    expect(context.session.snapshot().globalGeneration).toBe(committed.globalGeneration);
    // And a failure for a batch nobody is waiting for records nothing.
    context.coordinator.failGlobalBatch(scanRequestId, 'late');
    expect(context.session.snapshot().globalControl?.batchStatus).toBeNull();
  });

  it('leaves the Repository sequence and its Source untouched throughout', () => {
    const context = bootstrap();
    const before = context.session.snapshot();
    const scanRequestId = queueCodex(context);
    context.coordinator.completeGlobalBatch(scanRequestId, [
      { member: 'codex', files: [], recognitions: [], diagnostics: [], outcome: 'complete' },
    ]);

    const after = context.session.snapshot();
    // Two independent sequences: the Global commit advanced its own and left
    // the Repository generation, Source, and files exactly as they were
    // (FR-042).
    expect(after.repositoryGeneration).toBe(before.repositoryGeneration);
    expect(after.sources.find((source) => source.kind === 'repository')).toEqual(
      before.sources.find((source) => source.kind === 'repository'),
    );
    expect(after.files).toEqual(before.files);
  });
});

describe('the same-preview retry disposition', () => {
  /** Queues codex, fails its batch, and returns the bootstrap context. */
  function failedCodexBatch(): ReturnType<typeof bootstrap> {
    const context = bootstrap();
    const operationId = register(context.coordinator);
    const result = context.coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      admitted('codex'),
    ]);
    if (result.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    context.coordinator.failGlobalBatch(result.scanRequestId, 'boom');
    return context;
  }

  it('clears the superseded failed batch status on a zero-admitted retry', () => {
    // The retry re-resolved the member and rejected it deterministically: the
    // fresh rejection on the control is the current answer, and the previous
    // batch's retained error stops describing anything — an `active-no-job`
    // disposition has null `batchStatus`
    // (contracts/http-api.md § enable-global).
    const context = failedCodexBatch();
    const operationId = register(context.coordinator, 'retry');
    const result = context.coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      rejected('codex', 'root-unreadable'),
    ]);

    expect(result).toEqual({
      state: 'active-no-job',
      scanRequestId: null,
      acceptedTools: [],
      rejectedTools: ['codex'],
    });
    const control = context.session.snapshot().globalControl!;
    expect(control.batchStatus).toBeNull();
    expect(control.controls.find((entry) => entry.member === 'codex')?.failureCode).toBe(
      'root-unreadable',
    );
  });

  it('replaces only the retried member and queues a fresh batch', () => {
    const context = failedCodexBatch();
    const operationId = register(context.coordinator, 'retry');
    const result = context.coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      admitted('codex'),
    ]);

    // A fresh admission with a fresh batch: the consent record survives, and
    // the new status carries the new request alone.
    expect(result.state).toBe('queued');
    expect(result.acceptedTools).toEqual(['codex']);
    const control = context.session.snapshot().globalControl!;
    expect(control.batchStatus?.scanRequestId).toBe(result.scanRequestId);
    expect(control.batchStatus?.phase).toBe('waiting');
    expect(control.pendingTools).toEqual(['codex']);
  });
});
