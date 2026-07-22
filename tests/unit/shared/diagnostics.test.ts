// T016: closed Diagnostic registry, attachment shapes, and deterministic
// aggregation (data-model.md § Diagnostic, spec.md FR-024/FR-028).
import { describe, expect, it } from 'vitest';

import {
  DIAGNOSTIC_REGISTRY,
  createDiagnostic,
  dedupeAndSortDiagnostics,
  serializeDiagnostic,
} from '../../../src/shared/diagnostics';

describe('closed diagnostic registry', () => {
  it('contains exactly the trusted-workspace outcome codes', () => {
    expect(Object.keys(DIAGNOSTIC_REGISTRY)).toEqual([
      'root-unreadable',
      'file-unreadable',
      'file-content-binary',
      'recognition-parse-failed',
    ]);
  });

  it('fixes the scope and ownership of every code', () => {
    expect(DIAGNOSTIC_REGISTRY['root-unreadable'].scope).toBe('source');
    expect(DIAGNOSTIC_REGISTRY['root-unreadable'].ownerKind).toBe('lifecycle');
    for (const code of ['file-unreadable', 'file-content-binary', 'recognition-parse-failed'] as const) {
      expect(DIAGNOSTIC_REGISTRY[code].scope).toBe('file');
      expect(DIAGNOSTIC_REGISTRY[code].ownerKind).toBe('candidate-file');
    }
  });
});

describe('attachment shapes', () => {
  it('requires the coherent file tuple for a file-scoped code', () => {
    expect(() =>
      createDiagnostic({ code: 'file-unreadable', lifecycleOwnerKey: null, sourceId: 's-1' }),
    ).toThrow(/file-scoped/u);
    const record = createDiagnostic({
      code: 'file-unreadable',
      lifecycleOwnerKey: null,
      sourceId: 's-1',
      fileId: 'f-1',
      sourceRelativePath: 'AGENTS.md',
    });
    expect(record.fileId).toBe('f-1');
  });

  it('requires only sourceId for the source-scoped root failure', () => {
    expect(() =>
      createDiagnostic({
        code: 'root-unreadable',
        lifecycleOwnerKey: 'repository',
        sourceId: 's-1',
        fileId: 'f-1',
        sourceRelativePath: 'AGENTS.md',
      }),
    ).toThrow(/source-scoped/u);
    const record = createDiagnostic({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'repository',
      sourceId: 's-1',
    });
    expect(record.sourceId).toBe('s-1');
    expect(record.fileId).toBeNull();
  });

  it('forbids a lifecycle owner on a generation-owned candidate', () => {
    expect(() =>
      createDiagnostic({
        code: 'file-content-binary',
        lifecycleOwnerKey: 'repository',
        sourceId: 's-1',
        fileId: 'f-1',
        sourceRelativePath: 'CLAUDE.md',
      }),
    ).toThrow(/forbids a lifecycle owner/u);
  });

  it('requires an owner key on a lifecycle diagnostic', () => {
    expect(() =>
      createDiagnostic({ code: 'root-unreadable', lifecycleOwnerKey: null, sourceId: 's-1' }),
    ).toThrow(/owner key/u);
    const record = createDiagnostic({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'global:codex',
      sourceId: 's-1',
    });
    expect(record.lifecycleOwnerKey).toBe('global:codex');
  });

});

describe('serialization', () => {
  it('serializes only code and the attachment fields', () => {
    const record = createDiagnostic({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'repository',
      sourceId: 's-1',
    });
    const serialized = serializeDiagnostic(record);
    expect(Object.keys(serialized).sort()).toEqual([
      'code',
      'diagnosticId',
      'fileId',
      'sourceId',
      'sourceRelativePath',
    ]);
    expect(serialized.code).toBe('root-unreadable');
  });
});

describe('deterministic aggregation', () => {
  function candidate(sourceRelativePath: string, code: 'file-unreadable' | 'file-content-binary') {
    return createDiagnostic({
      code,
      lifecycleOwnerKey: null,
      sourceId: 's-1',
      fileId: `f-${code}-${sourceRelativePath}`,
      sourceRelativePath,
    });
  }

  it('orders lifecycle owners semantically before generation-owned candidates', () => {
    const repositoryFailure = createDiagnostic({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'repository',
      sourceId: 's-1',
    });
    const codexFailure = createDiagnostic({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'global:codex',
      sourceId: 's-2',
    });
    const fileProblem = candidate('AGENTS.md', 'file-unreadable');
    const sorted = dedupeAndSortDiagnostics([fileProblem, codexFailure, repositoryFailure]);
    expect(sorted.map((record) => record.lifecycleOwnerKey)).toEqual([
      'repository',
      'global:codex',
      null,
    ]);
  });

  it('orders candidates by Source-relative Path then code, never by opaque ID', () => {
    const later = candidate('b/skill.md', 'file-unreadable');
    const earlier = candidate('a/skill.md', 'file-content-binary');
    const sameFileOtherCode = candidate('a/skill.md', 'file-unreadable');
    const sorted = dedupeAndSortDiagnostics([later, earlier, sameFileOtherCode]);
    expect(sorted.map((record) => [record.sourceRelativePath, record.code])).toEqual([
      ['a/skill.md', 'file-content-binary'],
      ['a/skill.md', 'file-unreadable'],
      ['b/skill.md', 'file-unreadable'],
    ]);
  });

  it('deduplicates identical observations while keeping distinct files', () => {
    const first = candidate('AGENTS.md', 'file-unreadable');
    const duplicate = { ...first };
    const distinct = candidate('CLAUDE.md', 'file-unreadable');
    const sorted = dedupeAndSortDiagnostics([first, duplicate, distinct]);
    expect(sorted).toHaveLength(2);
  });
});
