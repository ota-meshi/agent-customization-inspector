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
import type { CustomizationFileDto, GlobalMemberId } from '../../../src/shared/api-types';

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

  it('fixes confirmedTools to all four members however many were evaluated', () => {
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

  it('keeps the generation\u2019s diagnostics in fixed member order across rescans', async () => {
    // The carry-forward otherwise appends the rescanned Source's records
    // after every sibling's, so the fixed Copilot\u2192Claude\u2192Codex reading
    // order would come to depend on rescan history \u2014 and an opaque Source ID
    // must never supply a visible order (shared/diagnostics.ts
    // \u00a7 sortDiagnostics).
    const context = bootstrap();
    const operationId = register(context.coordinator);
    const settled = context.coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      admitted('codex'),
      admitted('claude'),
    ]);
    if (settled.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    const sourceIdOf = (member: 'codex' | 'claude'): string =>
      context.session.globalConsent!.controls.get(member)!.sourceId!;
    const diagnosticOf = (id: string, member: 'codex' | 'claude') => ({
      diagnosticId: id,
      code: 'root-unreadable' as const,
      sourceId: sourceIdOf(member),
      sourceRelativePath: null,
    });
    context.coordinator.completeGlobalBatch(settled.scanRequestId, [
      {
        member: 'codex',
        files: [],
        recognitions: [],
        diagnostics: [diagnosticOf('diag-codex-1', 'codex')],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 0,
        readBytes: 0,
        censusEscapedDirectories: [],
      },
      {
        member: 'claude',
        files: [],
        recognitions: [],
        diagnostics: [diagnosticOf('diag-claude-1', 'claude')],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 0,
        readBytes: 0,
        censusEscapedDirectories: [],
      },
    ]);
    const admission = context.coordinator.admitScan(sourceIdOf('claude'), {
      kind: 'request',
      operationId: 'op-order-rescan',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the explicit rescan to be admitted');
    }
    await context.coordinator.completeScan(admission.scanRequestId, {
      files: [],
      recognitions: [],
      diagnostics: [diagnosticOf('diag-claude-2', 'claude')],
      outcome: 'complete',
      visitedEntries: 1,
      candidateFiles: 0,
      readBytes: 0,
      censusEscapedDirectories: [],
    });
    // Claude reads before Codex in the fixed member order, rescan or not.
    expect(
      context.session.snapshot().diagnostics.map((diagnostic) => diagnostic.diagnosticId),
    ).toEqual(['diag-claude-2', 'diag-codex-1']);
  });

  it('advances the public batch phase with the member reports', () => {
    // The batch status is what a refreshing reader sees while the batch
    // reads: its phase follows the running member's own reports through the
    // shared pipeline stages instead of standing at the acceptance's
    // `waiting` for the whole run (data-model.md § GlobalControlView).
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    const sourceId = context.session.globalConsent!.controls.get('codex')!.sourceId!;
    expect(context.session.snapshot().globalControl?.batchStatus?.phase).toBe('waiting');
    context.coordinator.reportBatchMemberProgress(scanRequestId, sourceId, {
      phase: 'enumerating',
      visitedEntries: 3,
      candidateFiles: 1,
      readBytes: 0,
      diagnosticCount: 0,
    });
    expect(context.session.snapshot().globalControl?.batchStatus?.phase).toBe('enumerating');
    context.coordinator.reportBatchMemberProgress(scanRequestId, sourceId, {
      phase: 'reading',
      visitedEntries: 3,
      candidateFiles: 1,
      readBytes: 10,
      diagnosticCount: 0,
    });
    expect(context.session.snapshot().globalControl?.batchStatus?.phase).toBe('reading');
  });

  it('keeps only source-scoped diagnostics on the Source, replaced by each commit', async () => {
    // data-model.md § Source `diagnosticIds`: "Source-scoped diagnostics in
    // the last committed generation" — a file-scoped record never enters the
    // Source's own list, and a later commit replaces the list rather than
    // accumulating it.
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    const sourceId = context.session.globalConsent!.controls.get('codex')!.sourceId!;
    context.coordinator.completeGlobalBatch(scanRequestId, [
      {
        member: 'codex',
        files: [],
        recognitions: [],
        diagnostics: [
          {
            diagnosticId: 'diag-source',
            code: 'root-unreadable',
            sourceId,
            sourceRelativePath: null,
          },
          {
            diagnosticId: 'diag-file',
            code: 'recognition-parse-failed',
            sourceId,
            sourceRelativePath: 'AGENTS.override.md',
          },
        ],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 1,
        readBytes: 10,
        censusEscapedDirectories: [],
      },
    ]);
    const committed = context.session.snapshot();
    const source = committed.sources.find((entry) => entry.sourceId === sourceId);
    expect(source?.diagnosticIds).toEqual(['diag-source']);

    // The explicit rescan's commit replaces the list: the superseded ID is
    // gone, never accumulated beside the new generation's.
    const admission = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-diag-rescan',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the explicit rescan to be admitted');
    }
    await context.coordinator.completeScan(admission.scanRequestId, {
      files: [],
      recognitions: [],
      diagnostics: [
        {
          diagnosticId: 'diag-rescan',
          code: 'root-unreadable',
          sourceId,
          sourceRelativePath: null,
        },
      ],
      outcome: 'complete',
      visitedEntries: 1,
      candidateFiles: 0,
      readBytes: 0,
      censusEscapedDirectories: [],
    });
    const rescanned = context.session.snapshot();
    expect(rescanned.sources.find((entry) => entry.sourceId === sourceId)?.diagnosticIds).toEqual([
      'diag-rescan',
    ]);
  });

  it('publishes every member together in exactly one generation', () => {
    const context = bootstrap();
    const scanRequestId = queueCodex(context);
    context.coordinator.completeGlobalBatch(scanRequestId, [
      {
        member: 'codex',
        files: [],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 0,
        readBytes: 0,
        censusEscapedDirectories: [],
      },
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
      {
        member: 'codex',
        files: [],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 0,
        readBytes: 0,
        censusEscapedDirectories: [],
      },
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
      {
        member: 'codex',
        files: [],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 0,
        readBytes: 0,
        censusEscapedDirectories: [],
      },
    ]);
    const committed = context.session.snapshot();

    // A second delivery of the same batch, after its status was removed: it
    // commits nothing rather than a second generation (FR-029).
    context.coordinator.completeGlobalBatch(scanRequestId, [
      {
        member: 'codex',
        files: [],
        recognitions: [],
        diagnostics: [],
        outcome: 'partial',
        visitedEntries: 1,
        candidateFiles: 0,
        readBytes: 0,
        censusEscapedDirectories: [],
      },
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
      {
        member: 'codex',
        files: [],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 0,
        readBytes: 0,
        censusEscapedDirectories: [],
      },
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

describe('the explicit Global rescan of one published member Source (T1006/T1007, T1012/T1013)', () => {
  /** One minimal readable published file of `sourceId`, named by `path`. */
  function fileOf(sourceId: string, path: string): CustomizationFileDto {
    return {
      sourceId,
      sourceRelativePath: path,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: '# fixture\n',
      sizeBytes: 10,
    };
  }

  /** The result shape `completeScan` takes for one rescanned Source. */
  function rescanResult(files: readonly CustomizationFileDto[], outcome: 'complete' | 'partial') {
    return {
      files,
      recognitions: [],
      diagnostics: [],
      outcome,
      visitedEntries: 1,
      candidateFiles: files.length,
      readBytes: 10,
      censusEscapedDirectories: [],
    } as const;
  }

  /**
   * Enables codex and claude and commits their batch at generation 1, so the
   * cases below run against two published member Sources with one file each.
   */
  function publishedPair(): {
    context: ReturnType<typeof bootstrap>;
    codexSourceId: string;
    claudeSourceId: string;
  } {
    const context = bootstrap();
    const operationId = register(context.coordinator);
    const result = context.coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      admitted('codex'),
      admitted('claude'),
    ]);
    if (result.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    // Before the commit no Source is published, so the allocated IDs are read
    // from the settled controls — the same place the batch executor reads
    // them (`runGlobalEnable`).
    const sourceIdOfMember = (member: 'codex' | 'claude'): string => {
      const sourceId = context.session.globalConsent?.controls.get(member)?.sourceId;
      if (sourceId == null) {
        throw new Error(`expected an admitted ${member} control`);
      }
      return sourceId;
    };
    const codexSourceId = sourceIdOfMember('codex');
    const claudeSourceId = sourceIdOfMember('claude');
    context.coordinator.completeGlobalBatch(result.scanRequestId, [
      {
        member: 'codex',
        files: [fileOf(codexSourceId, 'AGENTS.override.md')],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 1,
        readBytes: 10,
        censusEscapedDirectories: [],
      },
      {
        member: 'claude',
        files: [fileOf(claudeSourceId, 'CLAUDE.md')],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 1,
        readBytes: 10,
        censusEscapedDirectories: [],
      },
    ]);
    return { context, codexSourceId, claudeSourceId };
  }

  it('commits the Global sequence only, carrying every sibling Source', async () => {
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const repositoryGeneration = context.session.snapshot().repositoryGeneration;

    const admission = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-rescan-claude',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    await context.coordinator.completeScan(
      admission.scanRequestId,
      rescanResult(
        [fileOf(claudeSourceId, 'CLAUDE.md'), fileOf(claudeSourceId, 'rules/a.md')],
        'complete',
      ),
    );

    const snapshot = context.session.snapshot();
    // The Global sequence advanced exactly once and the Repository sequence
    // did not move (contracts/http-api.md § rescan-global).
    expect(snapshot.globalGeneration).toBe(2);
    expect(snapshot.repositoryGeneration).toBe(repositoryGeneration);
    // The rescanned Source replaced its own graph; the sibling's rode
    // forward untouched, under the same Source IDs.
    expect(
      snapshot.files
        .filter((file) => file.sourceId === claudeSourceId)
        .map((f) => f.sourceRelativePath),
    ).toEqual(['CLAUDE.md', 'rules/a.md']);
    expect(
      snapshot.files
        .filter((file) => file.sourceId === codexSourceId)
        .map((f) => f.sourceRelativePath),
    ).toEqual(['AGENTS.override.md']);
    expect(snapshot.sources.map((source) => source.sourceId)).toContain(codexSourceId);
    expect(snapshot.snapshotState).toBe('current');
  });

  it('admits the second sequence command as waiting and runs both in acceptance order', async () => {
    // The FIFO the contract fixes (contracts/http-api.md § rescan-global
    // "same FIFO ... applied within the Global sequence"): the second
    // member's command is accepted immediately but queued — waiting, a
    // queuedAt, no startedAt — and its work starts only once the first
    // command settled, so the two publish in acceptance order even when the
    // first is slow.
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const first = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-first',
    });
    if (first.kind !== 'admitted') {
      throw new Error('expected the first rescan to be admitted');
    }
    const second = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-second',
    });
    if (second.kind !== 'admitted') {
      throw new Error('expected the second rescan to be admitted');
    }
    const queued = context.session
      .snapshot()
      .sources.find((source) => source.sourceId === codexSourceId);
    expect(queued?.status).toBe('scanning');
    expect(queued?.progress?.phase).toBe('waiting');
    expect(queued?.progress?.queuedAt).not.toBeNull();
    expect(queued?.progress?.startedAt).toBeNull();

    const order: string[] = [];
    const firstGate = Promise.withResolvers<unknown>();
    const firstRun = context.coordinator.runInSequence(
      claudeSourceId,
      first.scanRequestId,
      async () => {
        order.push('first');
        await firstGate.promise;
        await context.coordinator.completeScan(
          first.scanRequestId,
          rescanResult([fileOf(claudeSourceId, 'CLAUDE.md')], 'complete'),
        );
      },
    );
    const secondRun = context.coordinator.runInSequence(
      codexSourceId,
      second.scanRequestId,
      async () => {
        order.push('second');
        await context.coordinator.completeScan(
          second.scanRequestId,
          rescanResult([fileOf(codexSourceId, 'AGENTS.override.md')], 'complete'),
        );
      },
    );
    // The first job is running and the second is still queued behind it.
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(['first']);
    firstGate.resolve(null);
    await firstRun;
    await secondRun;
    expect(order).toEqual(['first', 'second']);
    // Both committed, in order: two commits after generation 1.
    expect(context.session.snapshot().globalGeneration).toBe(3);
    expect(context.session.snapshot().snapshotState).toBe('current');
  });

  it('reads the dequeue-time base: a commit behind another Source carries that commit', async () => {
    // Both members' rescans are admitted before either commits — the FIFO's
    // concurrent shape — and the later commit builds on the earlier one's
    // generation rather than on the state it was admitted against.
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const claudeAdmission = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-a',
    });
    const codexAdmission = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-b',
    });
    if (claudeAdmission.kind !== 'admitted' || codexAdmission.kind !== 'admitted') {
      throw new Error('expected both rescans to be admitted');
    }
    await context.coordinator.completeScan(
      claudeAdmission.scanRequestId,
      rescanResult([fileOf(claudeSourceId, 'CLAUDE.next.md')], 'complete'),
    );
    await context.coordinator.completeScan(
      codexAdmission.scanRequestId,
      rescanResult([fileOf(codexSourceId, 'AGENTS.next.md')], 'complete'),
    );

    const snapshot = context.session.snapshot();
    expect(snapshot.globalGeneration).toBe(3);
    expect(snapshot.files.map((file) => file.sourceRelativePath).toSorted()).toEqual([
      'AGENTS.next.md',
      'CLAUDE.next.md',
    ]);
  });

  it('keeps the generation partial while a carried sibling remains partial', async () => {
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const first = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-partial',
    });
    if (first.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    await context.coordinator.completeScan(
      first.scanRequestId,
      rescanResult([fileOf(codexSourceId, 'AGENTS.override.md')], 'partial'),
    );
    expect(context.session.snapshot().globalGeneration).toBe(2);

    const second = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-complete',
    });
    if (second.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    await context.coordinator.completeScan(
      second.scanRequestId,
      rescanResult([fileOf(claudeSourceId, 'CLAUDE.md')], 'complete'),
    );
    // One generation, one status: the carried codex Source still holds a
    // file-confined outcome, so the claude commit stays partial (FR-028).
    const generation = context.session.snapshot();
    expect(generation.globalGeneration).toBe(3);
    expect(generation.sources.find((s) => s.sourceId === codexSourceId)?.status).toBe('partial');
    expect(generation.sources.find((s) => s.sourceId === claudeSourceId)?.status).toBe('ready');
  });

  it('retains a fatal explicit rescan as that Source’s stale overlay and keeps the graph', () => {
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const admission = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-fatal',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    context.coordinator.failScan(admission.scanRequestId, { kind: 'error', message: 'boom' });

    const snapshot = context.session.snapshot();
    // The retained snapshot stays visible and is explained as stale by
    // exactly one entry, recorded against the Global sequence's own
    // generation (contracts/http-api.md § rescan-global).
    expect(snapshot.snapshotState).toBe('stale-after-fatal-rescan');
    expect(snapshot.staleFailures).toEqual([
      {
        sourceId: claudeSourceId,
        failureRef: { kind: 'error', message: 'boom' },
        failedAt: expect.any(String) as unknown as string,
        baseGeneration: 1,
      },
    ]);
    expect(snapshot.globalGeneration).toBe(1);
    expect(snapshot.files.map((file) => file.sourceRelativePath).toSorted()).toEqual([
      'AGENTS.override.md',
      'CLAUDE.md',
    ]);
    expect(snapshot.sources.find((s) => s.sourceId === claudeSourceId)?.status).toBe('failed');
    // A sibling's later failure coexists; a later success of this Source
    // clears only its own entry.
    expect(snapshot.sources.find((s) => s.sourceId === codexSourceId)?.status).toBe('ready');
  });

  it('clears only the rescanned Source’s stale entry on its later success', async () => {
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    for (const [sourceId, operationId] of [
      [claudeSourceId, 'op-f1'],
      [codexSourceId, 'op-f2'],
    ] as const) {
      const admission = context.coordinator.admitScan(sourceId, {
        kind: 'request',
        operationId,
      });
      if (admission.kind !== 'admitted') {
        throw new Error('expected the rescan to be admitted');
      }
      context.coordinator.failScan(admission.scanRequestId, { kind: 'error', message: 'boom' });
    }
    expect(context.session.snapshot().staleFailures).toHaveLength(2);

    const retry = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-retry',
    });
    if (retry.kind !== 'admitted') {
      throw new Error('expected the retry to be admitted');
    }
    await context.coordinator.completeScan(
      retry.scanRequestId,
      rescanResult([fileOf(claudeSourceId, 'CLAUDE.md')], 'complete'),
    );
    const snapshot = context.session.snapshot();
    expect(snapshot.staleFailures.map((entry) => entry.sourceId)).toEqual([codexSourceId]);
    expect(snapshot.snapshotState).toBe('stale-after-fatal-rescan');
    expect(snapshot.globalGeneration).toBe(2);
  });

  it('discards a late result after revocation and reverts the overlay', async () => {
    const { context, claudeSourceId } = publishedPair();
    const admission = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-late',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    context.coordinator.revokeAllPublicationAuthority();
    await context.coordinator.completeScan(
      admission.scanRequestId,
      rescanResult([fileOf(claudeSourceId, 'LATE.md')], 'complete'),
    );
    const snapshot = context.session.snapshot();
    expect(snapshot.globalGeneration).toBe(1);
    expect(snapshot.files.map((file) => file.sourceRelativePath)).not.toContain('LATE.md');
    expect(snapshot.sources.find((s) => s.sourceId === claudeSourceId)?.status).toBe('ready');
  });

  it('refuses a duplicate command per Source and admits a sibling’s', () => {
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const first = context.coordinator.admitScan(claudeSourceId, {
      kind: 'request',
      operationId: 'op-1',
    });
    expect(first.kind).toBe('admitted');
    expect(
      context.coordinator.admitScan(claudeSourceId, { kind: 'request', operationId: 'op-2' }),
    ).toEqual({ kind: 'conflict' });
    expect(
      context.coordinator.admitScan(codexSourceId, { kind: 'request', operationId: 'op-3' }).kind,
    ).toBe('admitted');
  });
});

describe('the priority Global disable barrier (T1017, T1023/T1024)', () => {
  /** One minimal readable published file of `sourceId`, named by `path`. */
  function fileOf(sourceId: string, path: string): CustomizationFileDto {
    return {
      sourceId,
      sourceRelativePath: path,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: '# fixture\n',
      sizeBytes: 10,
    };
  }

  /** The result shape `completeScan` takes for one rescanned Source. */
  function scanResult(files: readonly CustomizationFileDto[]) {
    return {
      files,
      recognitions: [],
      diagnostics: [],
      outcome: 'complete',
      visitedEntries: 1,
      candidateFiles: files.length,
      readBytes: 10,
      censusEscapedDirectories: [],
    } as const;
  }

  /** Enables codex and claude and commits their batch at Global generation 1. */
  function publishedPair(): {
    context: ReturnType<typeof bootstrap>;
    codexSourceId: string;
    claudeSourceId: string;
  } {
    const context = bootstrap();
    const operationId = register(context.coordinator);
    const settled = context.coordinator.settleGlobalEnable(operationId, PREVIEW_ID, [
      admitted('codex'),
      admitted('claude'),
    ]);
    if (settled.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    const sourceIdOfMember = (member: 'codex' | 'claude'): string => {
      const sourceId = context.session.globalConsent?.controls.get(member)?.sourceId;
      if (sourceId == null) {
        throw new Error(`expected an admitted ${member} control`);
      }
      return sourceId;
    };
    const codexSourceId = sourceIdOfMember('codex');
    const claudeSourceId = sourceIdOfMember('claude');
    context.coordinator.completeGlobalBatch(settled.scanRequestId, [
      {
        member: 'codex',
        files: [fileOf(codexSourceId, 'AGENTS.override.md')],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 1,
        readBytes: 10,
        censusEscapedDirectories: [],
      },
      {
        member: 'claude',
        files: [fileOf(claudeSourceId, 'CLAUDE.md')],
        recognitions: [],
        diagnostics: [],
        outcome: 'complete',
        visitedEntries: 1,
        candidateFiles: 1,
        readBytes: 10,
        censusEscapedDirectories: [],
      },
    ]);
    return { context, codexSourceId, claudeSourceId };
  }

  it('publishes each batch member with its final complete progress and counters', () => {
    // The batch commit is the member's first commit, so it writes the same
    // final progress a single-Source commit does: phase `complete` with the
    // walk's own counters, never the admission's zeros and never null
    // (data-model.md § ScanProgress).
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const snapshot = context.session.snapshot();
    for (const sourceId of [codexSourceId, claudeSourceId]) {
      const source = snapshot.sources.find((entry) => entry.sourceId === sourceId);
      expect(source?.status).toBe('ready');
      expect(source?.progress).toMatchObject({
        phase: 'complete',
        visitedEntries: 1,
        candidateFiles: 1,
        readBytes: 10,
      });
      expect(source?.progress?.scanRequestId).toBe(source?.scanRequestId);
    }
  });

  it('is a true no-op only while nothing Global exists, whatever Repository work runs', async () => {
    const context = bootstrap();
    // Unrelated Repository work does not prevent the no-op.
    const admission = context.coordinator.admitScan(context.session.repositorySourceId, {
      kind: 'request',
      operationId: 'op-repo',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the repository rescan to be admitted');
    }
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    expect(disposition.kind).toBe('no-op');
    if (disposition.kind !== 'no-op') {
      throw new Error('unreachable');
    }
    // Mutationless: no operation, no epoch increment, no fence — and the
    // Repository command it did not disturb is still admitted.
    expect(disposition.result).toEqual({
      state: 'no-op',
      operationId: null,
      commitKind: null,
      repositoryGeneration: context.session.snapshot().repositoryGeneration,
    });
    expect(context.session.globalContentEpoch).toBe(0);
    expect(context.session.globalDisableInProgress).toBeNull();
    await context.coordinator.completeScan(admission.scanRequestId, scanResult([]));
    expect(context.session.snapshot().repositoryGeneration).toBe(1);
  });

  it('refuses the no-op for each Global condition on its own', () => {
    // Active consent (with its retained admitted root context) — the
    // published pair carries all of it.
    {
      const { context } = publishedPair();
      expect(context.coordinator.disposeGlobalDisable(() => {}).kind).toBe('pending');
    }
    // A registered enable operation alone, before any disposition.
    {
      const context = bootstrap();
      register(context.coordinator);
      expect(context.coordinator.disposeGlobalDisable(() => {}).kind).toBe('pending');
    }
  });

  it('accepts atomically: disposition, epoch, fence, disabling control, cancelled enable', async () => {
    const { context } = publishedPair();
    // A registered retry operation is cancelled by the barrier.
    register(context.coordinator, 'retry');
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    // Public Global state exists, so the disposition is remove-active-state,
    // fixed at acceptance; the epoch incremented exactly once; the fence is
    // installed; the control reads disabling with its batch cleared; and the
    // enable operation is gone.
    expect(context.session.globalContentEpoch).toBe(1);
    expect(context.session.globalDisableInProgress).toMatchObject({
      operationId: disposition.operationId,
      state: expect.stringMatching(/draining|committing/u),
    });
    expect(context.session.globalEnableInProgress).toBeNull();
    const control = context.session.globalConsent?.toDto();
    expect(control?.state).toBe('disabling');
    expect(control?.pendingTools).toEqual([]);
    expect(control?.retryableTools).toEqual([]);
    expect(control?.batchStatus).toBeNull();
    const result = await disposition.completion;
    expect(result).toMatchObject({ state: 'disabled', commitKind: 'remove-active-state' });
  });

  it('discards the whole Global sequence on remove-active-state, Repository untouched', async () => {
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    const before = context.session.snapshot();
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    const result = await disposition.completion;
    expect(result).toEqual({
      state: 'disabled',
      operationId: disposition.operationId,
      commitKind: 'remove-active-state',
      repositoryGeneration: before.repositoryGeneration,
    });
    const after = context.session.snapshot();
    // The Global sequence no longer exists — Sources, consent, generation —
    // while the Repository sequence, its generation, and its Source ride on
    // exactly as they were. No disposition commits a generation.
    expect(after.globalGeneration).toBeNull();
    expect(after.globalControl).toBeNull();
    expect(after.globalDisableInProgress).toBeNull();
    expect(after.sources.map((source) => source.sourceId)).toEqual([
      context.session.repositorySourceId,
    ]);
    expect(after.sources.map((source) => source.sourceId)).not.toContain(codexSourceId);
    expect(after.files.some((file) => file.sourceId === claudeSourceId)).toBe(false);
    expect(after.repositoryGeneration).toBe(before.repositoryGeneration);
    expect(context.session.globalContentEpoch).toBe(1);
  });

  it('chooses cleanup-only for an unpublished initial enable and changes no committed state', async () => {
    const context = bootstrap();
    register(context.coordinator);
    const before = context.session.snapshot();
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    const result = await disposition.completion;
    expect(result).toMatchObject({ state: 'disabled', commitKind: 'cleanup-only' });
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(before.repositoryGeneration);
    expect(after.globalGeneration).toBeNull();
    expect(after.globalControl).toBeNull();
    expect(after.globalEnableInProgress).toBeNull();
    expect(after.globalDisableInProgress).toBeNull();
  });

  it('joins a second request to the same operation and terminal result', async () => {
    const { context } = publishedPair();
    const first = context.coordinator.disposeGlobalDisable(() => {});
    const second = context.coordinator.disposeGlobalDisable(() => {});
    if (first.kind !== 'pending' || second.kind !== 'pending') {
      throw new Error('expected both to be pending');
    }
    expect(second.operationId).toBe(first.operationId);
    const [a, b] = await Promise.all([first.completion, second.completion]);
    expect(b).toEqual(a);
  });

  it('retains a post-acceptance failure and resumes it with the same lineage', async () => {
    const { context } = publishedPair();
    const failing = context.coordinator.disposeGlobalDisable(() => {
      throw new Error('release blew up');
    });
    if (failing.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    await expect(failing.completion).rejects.toThrow('release blew up');
    // The fence stays closed with the failed projection carrying the real
    // error; the epoch stays at its single increment; nothing was rolled
    // back to active.
    expect(context.session.globalDisableInProgress).toEqual({
      operationId: failing.operationId,
      state: 'failed',
      message: 'release blew up',
    });
    expect(context.session.globalContentEpoch).toBe(1);
    expect(context.session.globalConsent?.toDto().state).toBe('disabling');

    const retry = context.coordinator.disposeGlobalDisable(() => {});
    if (retry.kind !== 'pending') {
      throw new Error('expected the retry to be accepted');
    }
    // A new operation resumes the same cleanup: the epoch is not incremented
    // again, and the terminal result carries the inherited disposition.
    expect(retry.operationId).not.toBe(failing.operationId);
    const result = await retry.completion;
    expect(result).toMatchObject({ state: 'disabled', commitKind: 'remove-active-state' });
    expect(context.session.globalContentEpoch).toBe(1);
    expect(context.session.globalDisableInProgress).toBeNull();
    expect(context.session.snapshot().globalControl).toBeNull();
  });

  it('holds a running Repository command and requeues it exactly once after success', async () => {
    const { context } = publishedPair();
    const repositoryId = context.session.repositorySourceId;
    const admission = context.coordinator.admitScan(repositoryId, {
      kind: 'request',
      operationId: 'op-held',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the repository rescan to be admitted');
    }
    const gate = Promise.withResolvers<unknown>();
    const runs: number[] = [];
    const job = async (): Promise<void> => {
      runs.push(runs.length + 1);
      if (runs.length === 1) {
        await gate.promise;
      }
      await context.coordinator.completeScan(
        admission.scanRequestId,
        scanResult([fileOf(repositoryId, 'AGENTS.md')]),
      );
    };
    const firstRun = context.coordinator.runInSequence(repositoryId, admission.scanRequestId, job);
    // Let the chain dequeue the job before the barrier arrives.
    await Promise.resolve();
    await Promise.resolve();
    expect(runs).toEqual([1]);

    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    gate.resolve(null);
    await firstRun;
    // The running command's result was discarded behind the fence and the
    // command returned to waiting under its own request ID — no interim
    // success, no new admission.
    const result = await disposition.completion;
    expect(result.state).toBe('disabled');
    await context.coordinator.runInSequence(repositoryId, 'unused-probe', async () => {});
    // Wait for the requeued job to settle through the chain.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(runs).toEqual([1, 2]);
    const after = context.session.snapshot();
    // This harness bootstraps at Repository generation 0 with no automatic
    // scan, so the requeued command's commit is the sequence's first.
    expect(after.repositoryGeneration).toBe(1);
    expect(after.sources.find((source) => source.sourceId === repositoryId)?.scanRequestId).toBe(
      admission.scanRequestId,
    );
  });

  it('terminalizes a requeued command whose re-run rejects', async () => {
    // The requeue reattaches the terminalization the original dispatch owned
    // (devframe-app.ts rescan-repository): without it a rejecting re-run
    // leaves the Source `scanning` forever and every later rescan refused.
    const { context } = publishedPair();
    const repositoryId = context.session.repositorySourceId;
    const admission = context.coordinator.admitScan(repositoryId, {
      kind: 'request',
      operationId: 'op-held-fail',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the repository rescan to be admitted');
    }
    const gate = Promise.withResolvers<unknown>();
    let runs = 0;
    const job = async (): Promise<void> => {
      runs += 1;
      if (runs === 1) {
        await gate.promise;
        await context.coordinator.completeScan(
          admission.scanRequestId,
          scanResult([fileOf(repositoryId, 'AGENTS.md')]),
        );
        return;
      }
      throw new Error('the requeued read failed');
    };
    const firstRun = context.coordinator.runInSequence(repositoryId, admission.scanRequestId, job);
    await Promise.resolve();
    await Promise.resolve();
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    gate.resolve(null);
    await firstRun;
    await disposition.completion;
    await context.coordinator.runInSequence(repositoryId, 'unused-probe', async () => {});
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(runs).toBe(2);
    const after = context.session.snapshot();
    const source = after.sources.find((candidate) => candidate.sourceId === repositoryId);
    // The rejection was failed into the ordinary overlay rather than left
    // running: the Source is not `scanning`, the failure is retained, and the
    // sequence admits the next command.
    expect(source?.status).not.toBe('scanning');
    expect(after.staleFailures.some((failure) => failure.sourceId === repositoryId)).toBe(true);
    expect(
      context.coordinator.admitScan(repositoryId, { kind: 'request', operationId: 'op-after' })
        .kind,
    ).toBe('admitted');
  });

  it('cancels a registered enable operation at the shutdown revocation', () => {
    // revokeAllPublicationAuthority unregisters the enable the way the
    // disable barrier does: the admission's stillAuthorized predicate reads
    // the registration (devframe-app.ts § runGlobalEnable), so clearing it is
    // what stops the next member's probe and refuses the late settlement.
    const { context } = publishedPair();
    const registered = context.coordinator.registerGlobalEnable(
      'preview-shutdown',
      'initial-enable',
    );
    if (registered.kind !== 'admitted') {
      throw new Error('expected the enable registration to be admitted');
    }
    expect(context.session.globalEnableInProgress?.operationId).toBe(registered.operationId);
    context.coordinator.revokeAllPublicationAuthority();
    expect(context.session.globalEnableInProgress).toBeNull();
  });

  it('starts no queued job or batch after the shutdown revocation', async () => {
    // Revoking the flag alone would let an already queued dequeue begin
    // reading after shutdown; the dequeue checks the revocation too, so a
    // queued command and a queued batch both end without starting
    // (data-model.md \u00a7 ScanAttempt "stops new scheduling").
    const { context, codexSourceId } = publishedPair();
    const gate = Promise.withResolvers<unknown>();
    const running = context.coordinator.runGlobalTransaction(async () => {
      await gate.promise;
    });
    const admission = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-queued-at-shutdown',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    let commandRan = false;
    const queuedCommand = context.coordinator.runInSequence(
      codexSourceId,
      admission.scanRequestId,
      async () => {
        commandRan = true;
      },
    );
    let batchRan = false;
    const queuedBatch = context.coordinator.runGlobalTransaction(async () => {
      batchRan = true;
    });
    context.coordinator.revokeAllPublicationAuthority();
    gate.resolve(null);
    await running;
    await queuedCommand;
    await queuedBatch;
    expect(commandRan).toBe(false);
    expect(batchRan).toBe(false);
  });

  it('neither restores nor requeues a held command after the shutdown revocation', async () => {
    // The shutdown revocation ends every future: a held Repository command's
    // discarded execution must not recreate an active attempt, and the
    // terminal commit must not requeue work for a process that is closing —
    // "a result arriving afterwards must commit nothing"
    // ({@link SessionCoordinator.revokeAllPublicationAuthority}).
    const { context } = publishedPair();
    const repositoryId = context.session.repositorySourceId;
    const admission = context.coordinator.admitScan(repositoryId, {
      kind: 'request',
      operationId: 'op-held-shutdown',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the repository rescan to be admitted');
    }
    const gate = Promise.withResolvers<unknown>();
    const runs: number[] = [];
    const job = async (): Promise<void> => {
      runs.push(runs.length + 1);
      await gate.promise;
      await context.coordinator.completeScan(
        admission.scanRequestId,
        scanResult([fileOf(repositoryId, 'AGENTS.md')]),
      );
    };
    const firstRun = context.coordinator.runInSequence(repositoryId, admission.scanRequestId, job);
    await Promise.resolve();
    await Promise.resolve();
    expect(runs).toEqual([1]);
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    context.coordinator.revokeAllPublicationAuthority();
    gate.resolve(null);
    await firstRun;
    await disposition.completion;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    // No second execution, no recreated attempt: the overlay stays at the
    // revoked reversion rather than a waiting command nobody will run.
    expect(runs).toEqual([1]);
    const after = context.session.snapshot();
    const source = after.sources.find((entry) => entry.sourceId === repositoryId);
    expect(source?.status).not.toBe('scanning');
    expect(source?.scanRequestId).toBeNull();
  });

  it('publishes lifecycle diagnostics in semantic owner order, not failure order', () => {
    // data-model.md \u00a7 Diagnostic: lifecycle candidates emit in
    // Repository-then-fixed-member order, and an opaque Source ID never
    // supplies the order \u2014 so a claude failure recorded before a copilot
    // one still reads copilot first.
    const { context, codexSourceId, claudeSourceId } = publishedPair();
    context.session.sessionDiagnostics.set('diag-claude-life', {
      diagnosticId: 'diag-claude-life',
      code: 'root-unreadable',
      sourceId: claudeSourceId,
      sourceRelativePath: null,
    });
    context.session.sessionDiagnostics.set('diag-codex-life', {
      diagnosticId: 'diag-codex-life',
      code: 'root-unreadable',
      sourceId: codexSourceId,
      sourceRelativePath: null,
    });
    const ids = context.session
      .snapshot()
      .diagnostics.slice(0, 2)
      .map((diagnostic) => diagnostic.diagnosticId);
    expect(ids).toEqual(['diag-claude-life', 'diag-codex-life']);
  });

  it('drains an in-flight Global transaction before committing the removal', async () => {
    // The enable batch runs as one Global-sequence transaction: a barrier
    // accepted mid-batch waits for the transaction to settle, and only then
    // commits.
    const { context } = publishedPair();
    const gate = Promise.withResolvers<unknown>();
    let settled = false;
    const transaction = context.coordinator.runGlobalTransaction(async () => {
      await gate.promise;
      settled = true;
    });
    await Promise.resolve();
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    let disabled = false;
    void disposition.completion.then(() => {
      disabled = true;
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(disabled).toBe(false);
    gate.resolve(null);
    await transaction;
    const result = await disposition.completion;
    expect(settled).toBe(true);
    expect(result.state).toBe('disabled');
  });

  it('clears queuedAt when queued work begins, and keeps it null through complete', async () => {
    // data-model.md \u00a7 ScanProgress: `queuedAt` is "cleared when work
    // begins" \u2014 an active phase requires null `queuedAt`, and the committed
    // final progress keeps it null.
    const { context, codexSourceId } = publishedPair();
    const gate = Promise.withResolvers<unknown>();
    const first = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-first',
    });
    if (first.kind !== 'admitted') {
      throw new Error('expected the first rescan to be admitted');
    }
    const firstRun = context.coordinator.runInSequence(
      codexSourceId,
      first.scanRequestId,
      async () => {
        await gate.promise;
        await context.coordinator.completeScan(
          first.scanRequestId,
          scanResult([fileOf(codexSourceId, 'AGENTS.override.md')]),
        );
      },
    );
    await Promise.resolve();
    const repositoryId = context.session.repositorySourceId;
    const second = context.coordinator.admitScan(repositoryId, {
      kind: 'request',
      operationId: 'op-second',
    });
    if (second.kind !== 'admitted') {
      throw new Error('expected the queued rescan to be admitted');
    }
    const progressOf = () =>
      context.session.snapshot().sources.find((source) => source.sourceId === repositoryId)
        ?.progress;
    expect(progressOf()?.phase).toBe('waiting');
    expect(progressOf()?.queuedAt).not.toBeNull();
    let dequeued: (typeof progressOf extends () => infer R ? R : never) | undefined;
    const secondRun = context.coordinator.runInSequence(
      repositoryId,
      second.scanRequestId,
      async () => {
        dequeued = progressOf();
        await context.coordinator.completeScan(
          second.scanRequestId,
          scanResult([fileOf(repositoryId, 'AGENTS.md')]),
        );
      },
    );
    gate.resolve(null);
    await firstRun;
    await secondRun;
    expect(dequeued?.phase).toBe('deriving');
    expect(dequeued?.queuedAt).toBeNull();
    expect(progressOf()?.phase).toBe('complete');
    expect(progressOf()?.queuedAt).toBeNull();
  });

  it('runs a Repository command behind a running Global command, one at a time', async () => {
    // One coordinator, one chain: "Source scans never execute concurrently"
    // (data-model.md \u00a7 ScanAttempt) \u2014 a command admitted while the other
    // sequence's command runs queues FIFO and starts as waiting
    // (contracts/http-api.md \u00a7 Concurrency and lifecycle). Only generation
    // bookkeeping is per-sequence.
    const { context, codexSourceId } = publishedPair();
    const repositoryId = context.session.repositorySourceId;
    const order: string[] = [];
    const gate = Promise.withResolvers<unknown>();
    const globalAdmission = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-global-first',
    });
    if (globalAdmission.kind !== 'admitted') {
      throw new Error('expected the global rescan to be admitted');
    }
    const globalRun = context.coordinator.runInSequence(
      codexSourceId,
      globalAdmission.scanRequestId,
      async () => {
        await gate.promise;
        order.push('global');
        await context.coordinator.completeScan(
          globalAdmission.scanRequestId,
          scanResult([fileOf(codexSourceId, 'AGENTS.override.md')]),
        );
      },
    );
    await Promise.resolve();
    const repositoryAdmission = context.coordinator.admitScan(repositoryId, {
      kind: 'request',
      operationId: 'op-repo-second',
    });
    if (repositoryAdmission.kind !== 'admitted') {
      throw new Error('expected the repository rescan to be admitted');
    }
    // Queued behind the other sequence's running command: the contract's
    // waiting presentation, not a claim to be reading.
    expect(
      context.session.snapshot().sources.find((source) => source.sourceId === repositoryId)
        ?.progress?.phase,
    ).toBe('waiting');
    const repositoryRun = context.coordinator.runInSequence(
      repositoryId,
      repositoryAdmission.scanRequestId,
      async () => {
        order.push('repository');
        await context.coordinator.completeScan(
          repositoryAdmission.scanRequestId,
          scanResult([fileOf(repositoryId, 'AGENTS.md')]),
        );
      },
    );
    gate.resolve(null);
    await globalRun;
    await repositoryRun;
    expect(order).toEqual(['global', 'repository']);
  });

  it('admits a rescan behind a running batch transaction as waiting, not running', async () => {
    // The enable batch owns no attempt entry, so the occupied-sequence test
    // must count it explicitly: a command admitted behind it is queued in
    // the same FIFO and starts at the contract's waiting presentation \u2014
    // claiming `deriving` would show a scan reading while its job has not
    // dequeued (contracts/http-api.md \u00a7 rescan-global).
    const { context, codexSourceId } = publishedPair();
    const gate = Promise.withResolvers<unknown>();
    const transaction = context.coordinator.runGlobalTransaction(async () => {
      await gate.promise;
    });
    const admission = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-behind-batch',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the rescan to be admitted');
    }
    const waiting = context.session
      .snapshot()
      .sources.find((source) => source.sourceId === codexSourceId);
    expect(waiting?.progress?.phase).toBe('waiting');
    gate.resolve(null);
    await transaction;
  });

  it('runs a queued Global transaction after the queued command, and none behind the fence', async () => {
    const { context, codexSourceId } = publishedPair();
    const order: string[] = [];
    const gate = Promise.withResolvers<unknown>();
    const admission = context.coordinator.admitScan(codexSourceId, {
      kind: 'request',
      operationId: 'op-before-batch',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('expected the explicit rescan to be admitted');
    }
    const rescan = context.coordinator.runInSequence(
      codexSourceId,
      admission.scanRequestId,
      async () => {
        await gate.promise;
        order.push('rescan');
        await context.coordinator.completeScan(
          admission.scanRequestId,
          scanResult([fileOf(codexSourceId, 'AGENTS.override.md')]),
        );
      },
    );
    // Queued behind the running rescan: one FIFO for the whole sequence.
    const transaction = context.coordinator.runGlobalTransaction(async () => {
      order.push('batch');
    });
    gate.resolve(null);
    await rescan;
    await transaction;
    expect(order).toEqual(['rescan', 'batch']);

    // Behind an accepted fence, a dequeued transaction runs nothing. The
    // held drain keeps the fence up while the transaction dequeues.
    const drainGate = Promise.withResolvers<unknown>();
    context.coordinator.trackInFlight(drainGate.promise);
    const disposition = context.coordinator.disposeGlobalDisable(() => {});
    if (disposition.kind !== 'pending') {
      throw new Error('expected an accepted barrier');
    }
    const fenced = context.coordinator.runGlobalTransaction(async () => {
      order.push('fenced');
    });
    await fenced;
    drainGate.resolve(null);
    await disposition.completion;
    expect(order).toEqual(['rescan', 'batch']);
  });
});
