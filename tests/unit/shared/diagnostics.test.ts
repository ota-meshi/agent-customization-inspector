// T016: closed Diagnostic registry, attachment shapes, and deterministic
// aggregation (data-model.md § Diagnostic, spec.md FR-024/FR-028).
import { describe, expect, it } from 'vitest';

import {
  DIAGNOSTIC_REGISTRY,
  createDiagnostic,
  sortDiagnostics,
  serializeDiagnostic,
} from '../../../src/shared/diagnostics';
import type { DiagnosticCode } from '../../../src/shared/diagnostics';

describe('closed diagnostic registry', () => {
  it('contains exactly the trusted-workspace outcome codes', () => {
    expect(Object.keys(DIAGNOSTIC_REGISTRY)).toEqual([
      'root-unreadable',
      'file-unreadable',
      'file-content-binary',
      'recognition-parse-failed',
      'path-normalization-collision',
    ]);
  });

  it('fixes the scope and ownership of every code', () => {
    expect(DIAGNOSTIC_REGISTRY['root-unreadable'].scope).toBe('source');
    expect(DIAGNOSTIC_REGISTRY['root-unreadable'].ownerKind).toBe('lifecycle');
    for (const code of ['file-unreadable', 'file-content-binary', 'recognition-parse-failed'] as const) {
      expect(DIAGNOSTIC_REGISTRY[code].scope).toBe('file');
      expect(DIAGNOSTIC_REGISTRY[code].ownerKind).toBe('candidate-file');
    }
    expect(DIAGNOSTIC_REGISTRY['path-normalization-collision'].scope).toBe('session');
    expect(DIAGNOSTIC_REGISTRY['path-normalization-collision'].ownerKind).toBe('candidate-file');
  });

  it('gives every code a fixed problem statement and practical next step', () => {
    const messages: Record<DiagnosticCode, string> = {
      'root-unreadable':
        'The selected root does not exist or cannot be read as a directory. Check the path and run the inspector again from a readable directory.',
      'file-unreadable':
        'This file could not be read. It may have been removed or its permissions may deny reading; other files were unaffected. Check that the file exists and is readable, then rescan.',
      'file-content-binary':
        'This file contains NUL bytes, so it is recorded without source text and nothing was parsed from it. Use a binary-capable viewer if you need to inspect its contents.',
      'recognition-parse-failed':
        'One recognition could not be parsed, so its derived metadata and relationships are omitted. Review the complete source text that remains available, then rescan after correcting the file if you need the derived metadata.',
      'path-normalization-collision':
        'Two entries normalize to the same display path, so they could not be listed unambiguously and were rejected. Rename one entry so the normalized paths differ, then rescan.',
    };
    for (const [code, message] of Object.entries(messages) as [DiagnosticCode, string][]) {
      expect(DIAGNOSTIC_REGISTRY[code].message).toBe(message);
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

  it('enforces the pathless session scope for a normalization collision', () => {
    // No unambiguous public path exists for a colliding group, so every
    // location field is rejected (spec.md Clarifications § Session 2026-07-20).
    for (const location of [
      { sourceId: 's-1' },
      { sourceId: 's-1', fileId: 'f-1', sourceRelativePath: 'AGENTS.md' },
      { sourceRelativePath: 'AGENTS.md' },
    ]) {
      expect(() =>
        createDiagnostic({
          code: 'path-normalization-collision',
          lifecycleOwnerKey: null,
          ...location,
        }),
      ).toThrow(/session-scoped/u);
    }
    const record = createDiagnostic({
      code: 'path-normalization-collision',
      lifecycleOwnerKey: null,
    });
    expect(record.sourceId).toBeNull();
    expect(record.fileId).toBeNull();
    expect(record.sourceRelativePath).toBeNull();
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
    const sorted = sortDiagnostics([fileProblem, codexFailure, repositoryFailure]);
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
    const sorted = sortDiagnostics([later, earlier, sameFileOtherCode]);
    expect(sorted.map((record) => [record.sourceRelativePath, record.code])).toEqual([
      ['a/skill.md', 'file-content-binary'],
      ['a/skill.md', 'file-unreadable'],
      ['b/skill.md', 'file-unreadable'],
    ]);
  });

  it('keeps legitimately repeated same-field observations as separate records', () => {
    // Two rejected collision groups share every public field (pathless,
    // session-scoped) and still publish one record each (spec.md
    // Clarifications § Session 2026-07-20); ordering never merges records.
    const groupA = createDiagnostic({
      code: 'path-normalization-collision',
      lifecycleOwnerKey: null,
    });
    const groupB = createDiagnostic({
      code: 'path-normalization-collision',
      lifecycleOwnerKey: null,
    });
    const sorted = sortDiagnostics([groupA, groupB]);
    expect(sorted).toHaveLength(2);
    expect(sorted.map((record) => record.diagnosticId)).toEqual([
      groupA.diagnosticId,
      groupB.diagnosticId,
    ]);
  });
});

describe('successful complete atomic publication', () => {
  it('publishes one complete deterministic batch regardless of emitter order', () => {
    const records = [
      createDiagnostic({
        code: 'root-unreadable',
        lifecycleOwnerKey: 'repository',
        sourceId: 's-1',
      }),
      createDiagnostic({
        code: 'file-unreadable',
        lifecycleOwnerKey: null,
        sourceId: 's-1',
        fileId: 'f-1',
        sourceRelativePath: 'AGENTS.md',
      }),
      createDiagnostic({ code: 'path-normalization-collision', lifecycleOwnerKey: null }),
    ];
    const forward = sortDiagnostics(records).map(serializeDiagnostic);
    const reversed = sortDiagnostics([...records].reverse()).map(serializeDiagnostic);
    // The whole batch publishes together: every unique record appears exactly
    // once and the emitted order is a function of the records, not of the
    // emitter interleaving of the producing attempt.
    expect(forward).toHaveLength(records.length);
    expect(reversed).toEqual(forward);
  });

  it('keeps internal routing state out of every published record', () => {
    const published = sortDiagnostics([
      createDiagnostic({
        code: 'root-unreadable',
        lifecycleOwnerKey: 'repository',
        sourceId: 's-1',
      }),
      createDiagnostic({ code: 'path-normalization-collision', lifecycleOwnerKey: null }),
    ]).map(serializeDiagnostic);
    expect(JSON.stringify(published)).not.toContain('lifecycleOwnerKey');
  });
});
