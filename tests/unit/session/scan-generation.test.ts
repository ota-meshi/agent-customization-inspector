// T026: deterministic generation construction — independent Repository and
// Global sequences, bootstrap Repository generation 0, and atomic N+1
// replacement with ID rekeying.
import { describe, expect, it } from 'vitest';

import {
  createBootstrapGeneration,
  createGlobalEnableGeneration,
  prepareNextGlobalGeneration,
  prepareNextRepositoryGeneration,
} from '../../../src/server/session/scan-generation';

const NOW = '2026-07-21T00:00:00.000Z';

function commitInput(
  scanRequestId: string,
  files: Parameters<typeof prepareNextRepositoryGeneration>[1]['files'] = [],
  diagnostics: Parameters<typeof prepareNextRepositoryGeneration>[1]['diagnostics'] = [],
  recognitions: Parameters<typeof prepareNextRepositoryGeneration>[1]['recognitions'] = [],
) {
  return {
    scannedSourceIds: ['src-1'],
    scanRequestId,
    startedAt: NOW,
    finishedAt: NOW,
    outcome: 'complete' as const,
    files,
    recognitions,
    diagnostics,
  };
}

describe('bootstrap Repository generation 0', () => {
  it('has the exact reserved bootstrap shape', () => {
    const generation = createBootstrapGeneration(NOW);
    expect(generation.generation).toBe(0);
    expect(generation.baseGeneration).toBe(0);
    expect(generation.transactionKind).toBe('bootstrap');
    expect(generation.scannedSourceIds).toEqual([]);
    expect(generation.scanRequestId).toBeNull();
    expect(generation.startedAt).toBe(NOW);
    expect(generation.finishedAt).toBe(NOW);
    expect(generation.outcome).toBe('complete');
    expect(generation.files).toEqual([]);
    expect(generation.diagnostics).toEqual([]);
  });
});

describe('prepareNextRepositoryGeneration', () => {
  const base = createBootstrapGeneration(NOW);

  it('commits exactly N+1 with the scanned source and request ID', () => {
    const next = prepareNextRepositoryGeneration(base, commitInput('scan-1'));
    expect(next.generation).toBe(1);
    expect(next.baseGeneration).toBe(0);
    expect(next.transactionKind).toBe('repository-scan');
    expect(next.scanRequestId).toBe('scan-1');
  });

  it('regenerates every file ID on commit (rekeying)', () => {
    const makeFile = (fileId: string) => ({
      fileId,
      sourceId: 'src-1',
      sourceRelativePath: 'AGENTS.md',
      sizeBytes: 3,
      encoding: 'utf-8' as const,
      hadLeadingBom: false,
      sourceText: 'ok\n',
      recognitionIds: [],
      relationshipIds: [],
      diagnosticIds: [],
    });
    const next = prepareNextRepositoryGeneration(
      base,
      commitInput('scan-2', [makeFile('stale-a'), makeFile('stale-b')]),
    );
    const ids = next.files.map((file) => file.fileId);
    expect(ids[0]).not.toBe('stale-a');
    expect(ids[1]).not.toBe('stale-b');
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toMatch(/^[A-Za-z0-9_-]{22}$/u);
  });
  it('rewrites file-scoped diagnostic references through the same rekey map', () => {
    const file = {
      fileId: 'stale-id',
      sourceId: 'src-1',
      sourceRelativePath: 'AGENTS.md',
      encoding: 'unknown' as const,
      diagnosticIds: ['d-1'],
    };
    const fileDiagnostic = {
      diagnosticId: 'd-1',
      code: 'file-unreadable' as const,
      sourceId: 'src-1',
      fileId: 'stale-id',
      sourceRelativePath: 'AGENTS.md',
    };
    const sourceDiagnostic = {
      diagnosticId: 'd-2',
      code: 'root-unreadable' as const,
      sourceId: 'src-1',
      fileId: null,
      sourceRelativePath: null,
    };
    const next = prepareNextRepositoryGeneration(
      base,
      commitInput('scan-3', [file], [fileDiagnostic, sourceDiagnostic]),
    );
    expect(next.diagnostics[0]!.fileId).toBe(next.files[0]!.fileId);
    expect(next.diagnostics[0]!.fileId).not.toBe('stale-id');
    expect(next.diagnostics[1]).toEqual(sourceDiagnostic);
  });
});

describe('Global sequence lifecycle', () => {
  it('starts at generation 1 on enable — no Global state exists before it', () => {
    const enabled = createGlobalEnableGeneration(commitInput('scan-4'));
    expect(enabled.generation).toBe(1);
    expect(enabled.baseGeneration).toBe(0);
    expect(enabled.transactionKind).toBe('global-enable');
    expect(enabled.scanRequestId).toBe('scan-4');
  });

  it('advances independently of the Repository sequence on rescans', () => {
    const enabled = createGlobalEnableGeneration(commitInput('scan-5'));
    const rescanned = prepareNextGlobalGeneration(enabled, commitInput('scan-6'));
    expect(rescanned.generation).toBe(2);
    expect(rescanned.baseGeneration).toBe(1);
    expect(rescanned.transactionKind).toBe('global-scan');
  });
});
