// T017: public entity shapes — readable encodings with preserved U+FFFD,
// diagnostic-only binary, the non-authorizing SourceBoundary, root
// presentation encoding, evidence vocabulary, and opaque IDs.
import { describe, expect, it } from 'vitest';

import {
  LIFECYCLE_QUALIFIER_ORDER,
  buildEvidenceAssessments,
  createOpaqueId,
  createSourceBoundaryDto,
  decodeSourceBytes,
  encodeRootPresentation,
  normalizeLifecycleQualifiers,
} from '../../../src/shared/entities';

describe('decodeSourceBytes', () => {
  it('classifies valid UTF-8 without BOM as readable utf-8', () => {
    const outcome = decodeSourceBytes(Buffer.from('hello\n', 'utf8'));
    expect(outcome).toEqual({
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: 'hello\n',
    });
  });

  it('records and strips exactly one leading BOM without changing the encoding', () => {
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('hello\n', 'utf8'),
    ]);
    expect(decodeSourceBytes(bytes)).toEqual({
      encoding: 'utf-8',
      hadLeadingBom: true,
      sourceText: 'hello\n',
    });
  });

  it('keeps a second BOM in the text after removing the leading one', () => {
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('x', 'utf8'),
    ]);
    expect(decodeSourceBytes(bytes)).toMatchObject({
      hadLeadingBom: true,
      sourceText: '﻿x',
    });
  });

  it('classifies replacement-decoded text as readable utf-8-replaced with preserved U+FFFD', () => {
    const bytes = Buffer.from([0x68, 0x69, 0xff, 0x0a]);
    expect(decodeSourceBytes(bytes)).toMatchObject({
      encoding: 'utf-8-replaced',
      sourceText: 'hi�\n',
    });
  });

  it('uses utf-8-replaced when replacement occurs after a removed BOM', () => {
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from([0xff]),
    ]);
    expect(decodeSourceBytes(bytes)).toMatchObject({
      encoding: 'utf-8-replaced',
      hadLeadingBom: true,
    });
  });

  it('keeps a literal authored U+FFFD readable without reclassification', () => {
    const outcome = decodeSourceBytes(Buffer.from('literal � char\n', 'utf8'));
    expect(outcome).toMatchObject({
      encoding: 'utf-8',
      sourceText: 'literal � char\n',
    });
  });

  it('classifies any NUL byte as diagnostic-only binary with no text and no BOM record', () => {
    const outcome = decodeSourceBytes(Buffer.from([0x68, 0x00, 0x69]));
    expect(outcome).toEqual({ encoding: 'binary' });
  });

  it('preserves environment-variable references as literal authored text', () => {
    const outcome = decodeSourceBytes(Buffer.from('token: $TOKEN and ${TOKEN}\n', 'utf8'));
    expect(outcome).toMatchObject({ sourceText: 'token: $TOKEN and ${TOKEN}\n' });
  });
});

describe('SourceBoundary DTO', () => {
  it('exposes exactly displayRoot and origin', () => {
    const boundary = createSourceBoundaryDto('/repo/root', 'process-cwd');
    expect(Object.keys(boundary).sort()).toEqual(['displayRoot', 'origin']);
    expect(boundary.origin).toBe('process-cwd');
  });

  it('covers the four closed origins', () => {
    for (const origin of ['process-cwd', 'cwd-option', 'default-home', 'environment'] as const) {
      expect(createSourceBoundaryDto('/r', origin).origin).toBe(origin);
    }
  });

  it('escapes the root label with the shared presentation encoding', () => {
    const boundary = createSourceBoundaryDto('/repo/<script>', 'process-cwd');
    expect(boundary.displayRoot).not.toContain('<');
    expect(boundary.displayRoot).toContain('\\u003C');
  });
});

describe('encodeRootPresentation', () => {
  it('copies ASCII letters, digits, and the five safe punctuation code units', () => {
    expect(encodeRootPresentation('/home/user_1/repo-2.x:tag')).toBe(
      '/home/user_1/repo-2.x:tag',
    );
  });

  it('escapes every other code unit as uppercase \\uXXXX', () => {
    expect(encodeRootPresentation('a b')).toBe('a\\u0020b');
    expect(encodeRootPresentation('C:\\repo')).toBe('C:\\u005Crepo');
    expect(encodeRootPresentation('日')).toBe('\\u65E5');
  });

  it('escapes each half of a surrogate pair separately', () => {
    expect(encodeRootPresentation('\u{1F600}')).toBe('\\uD83D\\uDE00');
  });

  it('is injective on backslash-bearing input and empty only for empty input', () => {
    expect(encodeRootPresentation('\\u0020')).toBe('\\u005Cu0020');
    expect(encodeRootPresentation('')).toBe('');
  });
});

describe('evidence vocabulary', () => {
  it('fixes the lifecycle qualifier order and rejects duplicates', () => {
    expect(LIFECYCLE_QUALIFIER_ORDER).toEqual(['preview', 'experimental', 'deprecated']);
    expect(normalizeLifecycleQualifiers(['deprecated', 'preview'])).toEqual([
      'preview',
      'deprecated',
    ]);
    expect(() => normalizeLifecycleQualifiers(['preview', 'preview'])).toThrow();
  });

  it('builds one sorted assessment per referenced subject with no reduction', () => {
    const assessments = buildEvidenceAssessments([
      {
        subjectKind: 'rule',
        subjectId: 'codex.repo.skill',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
      {
        subjectKind: 'behavior',
        subjectId: 'codex.skill.lookup',
        documentationStatus: 'conflict',
        lifecycleQualifiers: ['preview'],
      },
    ]);
    expect(Array.isArray(assessments)).toBe(true);
    expect(assessments.map((assessment) => assessment.subjectKind)).toEqual([
      'behavior',
      'rule',
    ]);
    for (const assessment of assessments) {
      expect(Object.keys(assessment).sort()).toEqual([
        'documentationStatus',
        'lifecycleQualifiers',
        'subjectId',
        'subjectKind',
      ]);
    }
  });

  it('rejects duplicate subjects', () => {
    expect(() =>
      buildEvidenceAssessments([
        {
          subjectKind: 'rule',
          subjectId: 'dup',
          documentationStatus: 'documented',
          lifecycleQualifiers: [],
        },
        {
          subjectKind: 'rule',
          subjectId: 'dup',
          documentationStatus: 'unknown',
          lifecycleQualifiers: [],
        },
      ]),
    ).toThrow();
  });
});

describe('opaque IDs', () => {
  it('creates unique 22-character base64url 128-bit IDs by default', () => {
    const id = createOpaqueId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/u);
    expect(createOpaqueId()).not.toBe(id);
  });
});
