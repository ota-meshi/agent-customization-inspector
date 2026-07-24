// T021: FR-024/FR-028 publication-matrix boundaries — file-confined
// outcomes retain diagnostic-only records in a partial generation,
// recognition parse failures keep the readable source displayed, an
// unreadable root fails the Source attempt with the source-scoped
// Diagnostic and no partial generation, a failure outside any single file
// aborts the attempt with nothing committed, external fixture mutation is
// not a product mutation, and late results after revocation are discarded
// without hard-cancellation claims (FR-002, FR-029, FR-030).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import {
  addUnreadableDirectory,
  buildTraversalFixtureTree,
  collectFsMutationViolations,
  createFixtureRoot,
} from '../../fixtures/filesystem/build-filesystem-fixtures';
import {
  ANY_DIRECTORIES,
  compileSelectorPrograms,
} from '../../../src/server/inspection/rules/registry';
import { runTraversalScan } from '../../../src/server/inspection/traversal';
import { assembleScanPublication } from '../../../src/server/inspection/scan';
import { createDiagnostic, serializeDiagnostic } from '../../../src/shared/diagnostics';
import {
  SessionCoordinator,
  createInspectionSession,
} from '../../../src/server/session/session';
import { prepareNextRepositoryGeneration } from '../../../src/server/session/scan-generation';

// Pass-through spies over the inspection module's closed fs surface —
// production-call instrumentation for the external-mutation case
// (contracts/inspection-path-allowlist.md § 12).
vi.mock('../../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

const AGENTS_PLAN = compileSelectorPrograms({ kind: 'repository' }, [[ANY_DIRECTORIES, 'AGENTS.md']]);

function bootstrapSession(root: string) {
  const session = createInspectionSession({
    invocationCwd: root,
    cwdOptionValue: null,
    selectedRepositoryRoot: root,
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

describe('file-confined outcomes publish a partial generation (FR-028)', () => {
  it('retains diagnostic-only records with coherent tuples while unaffected files stay complete', async () => {
    const tree = buildTraversalFixtureTree('inspector-integration');
    try {
      const result = await runTraversalScan({ root: tree.root, plans: [AGENTS_PLAN] });
      const publication = assembleScanPublication({
        sourceId: 'src-1',
        rootFailureOwner: 'repository',
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      expect(publication.outcome).toBe('partial');

      const binary = publication.files.find(
        (file) => file.sourceRelativePath === 'binary-dir/AGENTS.md',
      );
      expect(binary?.encoding).toBe('binary');
      expect(binary && 'sourceText' in binary).toBe(false);
      const binaryDiagnostic = publication.diagnostics.find(
        (diagnostic) => diagnostic.diagnosticId === binary?.diagnosticIds[0],
      );
      expect(binaryDiagnostic).toMatchObject({
        code: 'file-content-binary',
        sourceId: 'src-1',
        fileId: binary?.fileId,
        sourceRelativePath: 'binary-dir/AGENTS.md',
      });

      if (tree.capabilities.symlinks) {
        const broken = publication.files.find(
          (file) => file.sourceRelativePath === 'broken/AGENTS.md',
        );
        expect(broken?.encoding).toBe('unknown');
        const brokenDiagnostic = publication.diagnostics.find(
          (diagnostic) => diagnostic.diagnosticId === broken?.diagnosticIds[0],
        );
        expect(brokenDiagnostic?.code).toBe('file-unreadable');
      }

      // Unaffected files are complete: full decoded text, no diagnostics.
      const unaffected = publication.files.find((file) => file.sourceRelativePath === 'AGENTS.md');
      expect(unaffected).toMatchObject({
        encoding: 'utf-8',
        sourceText: 'root agents\n',
        diagnosticIds: [],
      });

      // A replacement decode is a complete result, not a partial cause.
      const replaced = publication.files.find(
        (file) => file.sourceRelativePath === 'invalid-utf8/AGENTS.md',
      );
      expect(replaced).toMatchObject({ encoding: 'utf-8-replaced', diagnosticIds: [] });
    } finally {
      tree.restore();
      rmSync(tree.root, { recursive: true, force: true });
    }
  });

  it('publishes one pathless session-scoped diagnostic per rejected collision group', async () => {
    const tree = buildTraversalFixtureTree('inspector-collision');
    try {
      if (!tree.capabilities.normalizationCollisions) {
        return;
      }
      const plans = [compileSelectorPrograms({ kind: 'repository' }, [['collision', /\.md$/u]])];
      const result = await runTraversalScan({ root: tree.root, plans });
      const publication = assembleScanPublication({
        sourceId: 'src-1',
        rootFailureOwner: 'repository',
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      expect(publication.files).toEqual([]);
      expect(publication.diagnostics).toHaveLength(1);
      expect(publication.diagnostics[0]).toMatchObject({
        code: 'path-normalization-collision',
        sourceId: null,
        fileId: null,
        sourceRelativePath: null,
      });
      // A collision is not a file-confined outcome of the closed table, so
      // it does not make the generation partial by itself (FR-030).
      expect(publication.outcome).toBe('complete');
    } finally {
      tree.restore();
      rmSync(tree.root, { recursive: true, force: true });
    }
  });
});

describe('recognition parse failure keeps the source displayed (FR-028)', () => {
  it('publishes a failed recognition as partial while keeping the readable source', async () => {
    const root = createFixtureRoot('inspector-parsefail');
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'root agents\n');
      mkdirSync(join(root, 'docs'));
      writeFileSync(join(root, 'docs', 'AGENTS.md'), 'docs agents\n');
      const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      const publication = assembleScanPublication({
        sourceId: 'src-1',
        rootFailureOwner: 'repository',
        result,
        recognitions: new Map([
          [
            'AGENTS.md',
            [
              { recognitionId: 'rec-failed', parseStatus: 'failed' as const },
              { recognitionId: 'rec-parsed', parseStatus: 'parsed' as const },
            ],
          ],
        ]),
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      // The parse failure is the only file-confined outcome here, and it
      // alone makes the generation partial.
      expect(publication.outcome).toBe('partial');
      const affected = publication.files.find((file) => file.sourceRelativePath === 'AGENTS.md');
      if (affected?.encoding !== 'utf-8') {
        throw new Error('expected the readable variant');
      }
      // The complete source stays displayed and comparison-eligible; only
      // the failed recognition's derived data is omitted.
      expect(affected.sourceText).toBe('root agents\n');
      expect(affected.parseSummary).toBe('mixed');
      expect(affected.recognitionIds).toEqual(['rec-failed', 'rec-parsed']);
      expect(affected.diagnosticIds).toHaveLength(1);
      const diagnostic = publication.diagnostics.find(
        (entry) => entry.diagnosticId === affected.diagnosticIds[0],
      );
      expect(diagnostic).toMatchObject({
        code: 'recognition-parse-failed',
        sourceId: 'src-1',
        fileId: affected.fileId,
        sourceRelativePath: 'AGENTS.md',
      });
      // A file with no recognitions stays complete and not-applicable.
      const unaffected = publication.files.find(
        (file) => file.sourceRelativePath === 'docs/AGENTS.md',
      );
      expect(unaffected).toMatchObject({ parseSummary: 'not-applicable', diagnosticIds: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps one distinct diagnostic per failed recognition on the same file', async () => {
    const root = createFixtureRoot('inspector-parsefail-multi');
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'root agents\n');
      const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      const publication = assembleScanPublication({
        sourceId: 'src-1',
        rootFailureOwner: 'repository',
        result,
        recognitions: new Map([
          [
            'AGENTS.md',
            [
              { recognitionId: 'rec-a', parseStatus: 'failed' as const },
              { recognitionId: 'rec-b', parseStatus: 'failed' as const },
            ],
          ],
        ]),
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      // One record per failed recognition (FR-028): the two failures share
      // every public field and still publish separately — and every file
      // diagnostic ID must resolve to a published record.
      const parseFailures = publication.diagnostics.filter(
        (entry) => entry.code === 'recognition-parse-failed',
      );
      expect(parseFailures).toHaveLength(2);
      const affected = publication.files.find((file) => file.sourceRelativePath === 'AGENTS.md');
      if (affected?.encoding !== 'utf-8') {
        throw new Error('expected the readable variant');
      }
      expect([...affected.diagnosticIds].sort()).toEqual(
        parseFailures.map((entry) => entry.diagnosticId).sort(),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('commits the readable source with only derived data omitted, rekeying the tuple coherently', () => {
    const { session } = bootstrapSession('/fixture-root');
    const parseDiagnostic = serializeDiagnostic(
      createDiagnostic({
        code: 'recognition-parse-failed',
        lifecycleOwnerKey: null,
        sourceId: 'src-1',
        fileId: 'file-1',
        sourceRelativePath: 'AGENTS.md',
      }),
    );
    const next = prepareNextRepositoryGeneration(
      session.internal.committedRepositoryGeneration,
      {
        scannedSourceIds: ['src-1'],
        scanRequestId: 'scan-1',
        startedAt: '2026-07-22T00:00:00.000Z',
        finishedAt: '2026-07-22T00:00:01.000Z',
        outcome: 'partial',
        files: [
          {
            fileId: 'file-1',
            sourceId: 'src-1',
            sourceRelativePath: 'AGENTS.md',
            encoding: 'utf-8',
            hadLeadingBom: false,
            sourceText: '# complete authored source\n',
            sizeBytes: 27,
            // The failed recognition omits only its derived data; the file
            // itself stays readable and comparison-eligible.
            parseSummary: 'all-failed',
            recognitionIds: [],
            relationshipIds: [],
            diagnosticIds: [parseDiagnostic.diagnosticId],
          },
        ],
        diagnostics: [parseDiagnostic],
      },
    );
    const file = next.files[0]!;
    if (file.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect(file.sourceText).toBe('# complete authored source\n');
    expect(file.parseSummary).toBe('all-failed');
    // Rekeying keeps the diagnostic tuple pointing at the republished file.
    expect(next.diagnostics[0]!.fileId).toBe(file.fileId);
    expect(next.outcome).toBe('partial');
  });
});

describe('unreadable root fails the Source attempt (FR-002)', () => {
  it('produces the source-scoped diagnostic and commits no partial generation', async () => {
    const missingRoot = join(createFixtureRoot('inspector-missing'), 'absent');
    const result = await runTraversalScan({ root: missingRoot, plans: [AGENTS_PLAN] });
    const publication = assembleScanPublication({
      sourceId: 'src-1',
      rootFailureOwner: 'repository',
      result,
    });
    if (publication.kind !== 'source-failed') {
      throw new Error('expected a source failure');
    }
    expect(publication.diagnostic).toMatchObject({
      code: 'root-unreadable',
      sourceId: 'src-1',
      fileId: null,
      sourceRelativePath: null,
    });

    // The session keeps its last committed snapshot; the failed attempt
    // publishes nothing, and the actionable Diagnostic is retained through
    // the repository owner reference instead of being discarded (FR-002).
    const { session, coordinator } = bootstrapSession(missingRoot);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const sessionPublication = assembleScanPublication({
      sourceId,
      rootFailureOwner: 'repository',
      result,
    });
    if (sessionPublication.kind !== 'source-failed') {
      throw new Error('expected a source failure');
    }
    coordinator.failScan(admitted.scanRequestId, {
      kind: 'diagnostic',
      diagnostic: sessionPublication.diagnostic,
    });
    const snapshot = session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.sources[0]!.status).toBe('failed');
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.repositoryFailureDiagnosticId).toBe(
      sessionPublication.diagnostic.diagnosticId,
    );
    expect(snapshot.sessionDiagnosticIds).toEqual([sessionPublication.diagnostic.diagnosticId]);
  });
});

describe('a failure outside any single file aborts the attempt (FR-028/FR-030)', () => {
  it('propagates the ordinary error and commits nothing', async () => {
    const root = createFixtureRoot('inspector-abort');
    const locked = addUnreadableDirectory(root);
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'fine\n');
      if (locked === null) {
        return;
      }
      // The unreadable directory is not a file-confined outcome: the whole
      // attempt fails as an ordinary error, never as a Diagnostic.
      await expect(runTraversalScan({ root, plans: [AGENTS_PLAN] })).rejects.toThrow();

      const { session, coordinator } = bootstrapSession(root);
      const sourceId = session.snapshot().sources[0]!.sourceId;
      const admitted = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-1' });
      if (admitted.kind !== 'admitted') {
        throw new Error('expected admission');
      }
      let requestError: string | null = null;
      try {
        await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      } catch (error) {
        requestError = (error as Error).message;
      }
      expect(requestError).not.toBeNull();
      // The accepted job records the failed request's real error; nothing
      // was committed from the attempt.
      coordinator.failScan(admitted.scanRequestId, { kind: 'error', message: requestError! });
      const snapshot = session.snapshot();
      expect(snapshot.repositoryGeneration).toBe(0);
      expect(snapshot.sources[0]!.status).toBe('failed');
    } finally {
      locked?.restore();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('external mutation during a scan is not a product mutation', () => {
  it('keeps the product read-only while the harness mutates a fixture mid-scan', async () => {
    const root = createFixtureRoot('inspector-external');
    try {
      mkdirSync(join(root, 'a'));
      writeFileSync(join(root, 'a', 'AGENTS.md'), 'first\n');
      writeFileSync(join(root, 'AGENTS.md'), 'root\n');
      const mutationTarget = join(root, 'AGENTS.md');
      const trigger = join(root, 'a', 'AGENTS.md');
      const actual =
        await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      // The harness — not the product — rewrites a sibling fixture while
      // the scan is reading another file.
      vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
        if (path === trigger) {
          writeFileSync(mutationTarget, 'externally changed\n');
        }
        return actual.readFile(path as never, options as never) as never;
      });
      try {
        const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
        expect(result.kind).toBe('scanned');
        // The instrumented product surface stayed read-only even though the
        // tree changed under it (FR-023): the change is attributed to the
        // external writer, not to a product request.
        expect(
          collectFsMutationViolations(fsIo as unknown as Record<string, unknown>),
        ).toEqual([]);
      } finally {
        vi.mocked(fsIo.readFile).mockReset();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('late results after revocation are discarded (FR-029)', () => {
  it('discards a real scan result without a hard-cancellation claim', async () => {
    const tree = buildTraversalFixtureTree('inspector-late');
    try {
      const { session, coordinator } = bootstrapSession(tree.root);
      const sourceId = session.snapshot().sources[0]!.sourceId;
      const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
      if (admitted.kind !== 'admitted') {
        throw new Error('expected admission');
      }
      // Disable/shutdown/supersession revokes publication authority while
      // the traversal is still running; the late result must be discarded,
      // not committed — and the scan itself is not claimed to be killed.
      coordinator.revokePublicationAuthority(admitted.scanRequestId);
      const result = await runTraversalScan({ root: tree.root, plans: [AGENTS_PLAN] });
      const publication = assembleScanPublication({
        sourceId,
        rootFailureOwner: 'repository',
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      await coordinator.completeScan(admitted.scanRequestId, {
        files: publication.files,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
      });
      const snapshot = session.snapshot();
      expect(snapshot.repositoryGeneration).toBe(0);
      expect(snapshot.sources[0]!.status).toBe('idle');
    } finally {
      tree.restore();
      rmSync(tree.root, { recursive: true, force: true });
    }
  });
});
