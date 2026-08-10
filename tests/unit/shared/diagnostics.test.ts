// T016: closed Diagnostic registry, attachment shapes, and deterministic
// aggregation (data-model.md § Diagnostic, spec.md FR-024/FR-028).
import { describe, expect, it } from 'vitest';

import {
  DIAGNOSTIC_REGISTRY,
  DiagnosticRecord,
  sortDiagnostics,
} from '../../../src/shared/diagnostics';
import type { DiagnosticCode } from '../../../src/shared/diagnostics';

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
    for (const code of [
      'file-unreadable',
      'file-content-binary',
      'recognition-parse-failed',
    ] as const) {
      expect(DIAGNOSTIC_REGISTRY[code].scope).toBe('file');
      expect(DIAGNOSTIC_REGISTRY[code].ownerKind).toBe('candidate-file');
    }
  });

  it('gives every code a fixed problem statement and practical next step', () => {
    const messages: Record<DiagnosticCode, string> = {
      'root-unreadable':
        'The selected root does not exist or cannot be read as a directory. Check the path and run the inspector again from a readable directory.',
      'file-unreadable':
        'This file could not be read. It may have been removed or its permissions may deny reading; other files were unaffected. Check that the file exists and is readable, then rescan.',
      'file-content-binary':
        'This file contains NUL bytes, so it is recorded without source text and nothing was parsed from it. Use a binary-capable viewer if you need to inspect its contents.',
      // The next step names what the reader can do, not what is wrong with
      // their file: a parse failure is classified where it happened without
      // inspecting its cause, so calling the file incorrect would be a verdict
      // the scan did not reach (FR-032).
      'recognition-parse-failed':
        'This file could not be parsed, so none of its declarations or instructions could be read out of it. The complete source text remains available to read; a rescan reports the current state of the file.',
    };
    for (const [code, message] of Object.entries(messages) as [DiagnosticCode, string][]) {
      expect(DIAGNOSTIC_REGISTRY[code].message).toBe(message);
    }
  });
});

describe('attachment shapes', () => {
  it('requires the coherent source-and-path pair for a file-scoped code', () => {
    expect(
      () =>
        new DiagnosticRecord({ code: 'file-unreadable', lifecycleOwnerKey: null, sourceId: 's-1' }),
    ).toThrow(/file-scoped/u);
    // The owning Source is required by both scope shapes, which is what lets
    // the serialized `sourceId` stay non-null.
    expect(
      () =>
        new DiagnosticRecord({
          code: 'file-unreadable',
          lifecycleOwnerKey: null,
          sourceRelativePath: 'AGENTS.md',
        }),
    ).toThrow(/sourceId/u);
    const record = new DiagnosticRecord({
      code: 'file-unreadable',
      lifecycleOwnerKey: null,
      sourceId: 's-1',
      sourceRelativePath: 'AGENTS.md',
    });
    expect(record.sourceRelativePath).toBe('AGENTS.md');
  });

  it('requires only sourceId for the source-scoped root failure', () => {
    expect(
      () =>
        new DiagnosticRecord({
          code: 'root-unreadable',
          lifecycleOwnerKey: 'repository',
          sourceId: 's-1',
          sourceRelativePath: 'AGENTS.md',
        }),
    ).toThrow(/source-scoped/u);
    const record = new DiagnosticRecord({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'repository',
      sourceId: 's-1',
    });
    expect(record.sourceId).toBe('s-1');
    expect(record.sourceRelativePath).toBeNull();
  });

  it('forbids a lifecycle owner on a generation-owned candidate', () => {
    expect(
      () =>
        new DiagnosticRecord({
          code: 'file-content-binary',
          lifecycleOwnerKey: 'repository',
          sourceId: 's-1',
          sourceRelativePath: 'CLAUDE.md',
        }),
    ).toThrow(/forbids a lifecycle owner/u);
  });

  it('requires an owner key on a lifecycle diagnostic', () => {
    expect(
      () =>
        new DiagnosticRecord({ code: 'root-unreadable', lifecycleOwnerKey: null, sourceId: 's-1' }),
    ).toThrow(/owner key/u);
    const record = new DiagnosticRecord({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'global:codex',
      sourceId: 's-1',
    });
    expect(record.lifecycleOwnerKey).toBe('global:codex');
  });
});

describe('serialization', () => {
  it('serializes only code and the attachment fields', () => {
    const record = new DiagnosticRecord({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'repository',
      sourceId: 's-1',
    });
    const serialized = record.serialize();
    expect(Object.keys(serialized).sort()).toEqual([
      'code',
      'diagnosticId',
      'sourceId',
      'sourceRelativePath',
    ]);
    expect(serialized.code).toBe('root-unreadable');
  });
});

describe('deterministic aggregation', () => {
  function candidate(sourceRelativePath: string, code: 'file-unreadable' | 'file-content-binary') {
    return new DiagnosticRecord({
      code,
      lifecycleOwnerKey: null,
      sourceId: 's-1',
      sourceRelativePath,
    });
  }

  it('orders lifecycle owners semantically before generation-owned candidates', () => {
    const repositoryFailure = new DiagnosticRecord({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'repository',
      sourceId: 's-1',
    });
    const codexFailure = new DiagnosticRecord({
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
    // An extraction failure is one record per (file, kind) (FR-028), so one
    // file whose two kinds both fail publishes two records sharing every
    // public field except the opaque ID; ordering never merges records.
    const shared = {
      code: 'recognition-parse-failed',
      lifecycleOwnerKey: null,
      sourceId: 's-1',
      sourceRelativePath: 'a/skill.md',
    } as const;
    const first = new DiagnosticRecord(shared);
    const second = new DiagnosticRecord(shared);
    const sorted = sortDiagnostics([first, second]);
    expect(sorted).toHaveLength(2);
    expect(sorted.map((record) => record.diagnosticId)).toEqual([
      first.diagnosticId,
      second.diagnosticId,
    ]);
  });
});

describe('successful complete atomic publication', () => {
  it('publishes one complete deterministic batch regardless of emitter order', () => {
    const records = [
      new DiagnosticRecord({
        code: 'root-unreadable',
        lifecycleOwnerKey: 'repository',
        sourceId: 's-1',
      }),
      new DiagnosticRecord({
        code: 'file-unreadable',
        lifecycleOwnerKey: null,
        sourceId: 's-1',
        sourceRelativePath: 'AGENTS.md',
      }),
      new DiagnosticRecord({
        code: 'recognition-parse-failed',
        lifecycleOwnerKey: null,
        sourceId: 's-1',
        sourceRelativePath: 'CLAUDE.md',
      }),
    ];
    const forward = sortDiagnostics(records).map((record) => record.serialize());
    const reversed = sortDiagnostics([...records].reverse()).map((record) => record.serialize());
    // The whole batch publishes together: every unique record appears exactly
    // once and the emitted order is a function of the records, not of the
    // emitter interleaving of the producing attempt.
    expect(forward).toHaveLength(records.length);
    expect(reversed).toEqual(forward);
  });

  it('keeps internal routing state out of every published record', () => {
    const published = sortDiagnostics([
      new DiagnosticRecord({
        code: 'root-unreadable',
        lifecycleOwnerKey: 'repository',
        sourceId: 's-1',
      }),
      new DiagnosticRecord({
        code: 'file-content-binary',
        lifecycleOwnerKey: null,
        sourceId: 's-1',
        sourceRelativePath: 'BIN.md',
      }),
    ]).map((record) => record.serialize());
    expect(JSON.stringify(published)).not.toContain('lifecycleOwnerKey');
  });
});
