// T017: public API DTO shapes — closed file variants, one-root Sources,
// closed descriptors, Source Condition Facts, evidence vocabulary limits,
// pathless normalization-collision records, and internal state excluded from
// DTOs by construction (data-model.md, contracts/http-api.md).
import { describe, expect, expectTypeOf, it } from 'vitest';

import { createDiagnostic, serializeDiagnostic } from '../../../src/shared/diagnostics';
import type {
  ConditionFactStatus,
  CustomizationFileDto,
  OrderComponent,
  ScopeDescriptor,
  SessionSnapshot,
  SourceConditionFactDto,
  SourceDto,
} from '../../../src/shared/api-types';
import type { DocumentationStatus, LifecycleQualifier } from '../../../src/shared/entities';

describe('customization file DTO variants', () => {
  it('makes readable text the only variant carrying sourceText', () => {
    // Binary input is diagnostic-only and a failed read accepted nothing, so
    // neither variant can even represent text or parse fields (FR-024/FR-028).
    expectTypeOf<Extract<CustomizationFileDto, { encoding: 'binary' }>>().not.toHaveProperty(
      'sourceText',
    );
    expectTypeOf<Extract<CustomizationFileDto, { encoding: 'unknown' }>>().not.toHaveProperty(
      'sourceText',
    );
    expectTypeOf<Extract<CustomizationFileDto, { encoding: 'unknown' }>>().not.toHaveProperty(
      'sizeBytes',
    );
    expectTypeOf<
      Extract<CustomizationFileDto, { encoding: 'utf-8' | 'utf-8-replaced' }>
    >().toHaveProperty('sourceText');
  });

  it('accepts both readable encodings and keeps BOM presence orthogonal', () => {
    const readable: CustomizationFileDto = {
      fileId: 'f-1',
      sourceId: 's-1',
      sourceRelativePath: 'AGENTS.md',
      diagnosticIds: [],
      encoding: 'utf-8-replaced',
      hadLeadingBom: true,
      sourceText: 'a�b',
      sizeBytes: 6,
      parseSummary: 'not-applicable',
      recognitionIds: [],
      relationshipIds: [],
    };
    expect(readable.encoding).toBe('utf-8-replaced');
    expect(readable.sourceText).toContain('�');
  });
});

describe('one-root Source DTO', () => {
  it('carries exactly one non-authorizing boundary and no root path field', () => {
    // One Source has one root (data-model.md § Source); the DTO exposes only
    // the escaped presentation, never the raw or canonical root string.
    expectTypeOf<SourceDto>().toHaveProperty('boundary');
    expectTypeOf<SourceDto>().not.toHaveProperty('root');
    expectTypeOf<SourceDto>().not.toHaveProperty('roots');
    expectTypeOf<SourceDto['boundary']>().toHaveProperty('displayRoot');
    expectTypeOf<SourceDto['boundary']>().toHaveProperty('origin');
  });
});

describe('session snapshot DTO', () => {
  it('excludes internal authority state by construction', () => {
    // The exact member set, not three named absences: naming what must not be
    // there proves nothing about a fourth field a later change adds, and the
    // wire snapshot is exactly the surface that must not grow a root, a handle,
    // or any other locator without someone deciding to.
    expectTypeOf<keyof SessionSnapshot>().toEqualTypeOf<
      | 'sessionId'
      | 'createdAt'
      | 'sources'
      | 'files'
      | 'skills'
      | 'diagnostics'
      | 'repositoryGeneration'
      | 'globalGeneration'
      | 'snapshotState'
      | 'staleFailures'
      | 'globalControl'
      | 'globalEnableInProgress'
      | 'globalDisableInProgress'
      | 'globalContentEpoch'
      | 'sessionDiagnosticIds'
      | 'repositoryFailureDiagnosticId'
    >();
  });
});

describe('closed descriptors', () => {
  it('covers exactly the four scope variants', () => {
    expectTypeOf<ScopeDescriptor['kind']>().toEqualTypeOf<
      'source-root' | 'directory-subtree' | 'matching-path' | 'declared'
    >();
  });

  it('covers exactly the three order component variants', () => {
    expectTypeOf<OrderComponent['kind']>().toEqualTypeOf<
      'path-depth' | 'registry-rank' | 'source-occurrence'
    >();
  });

  it('gives each scope variant only its documented fields', () => {
    expectTypeOf<Extract<ScopeDescriptor, { kind: 'source-root' }>>().not.toHaveProperty('path');
    expectTypeOf<Extract<ScopeDescriptor, { kind: 'matching-path' }>>().toHaveProperty(
      'selectorIndex',
    );
    expectTypeOf<Extract<ScopeDescriptor, { kind: 'declared' }>>().toHaveProperty('occurrence');
  });
});

describe('evidence vocabulary limits', () => {
  it('rejects documentation-conflict as a documentation status', () => {
    // `documentation-conflict` is a ConditionFact status; the documentation
    // status vocabulary uses `conflict` (QR-005).
    expectTypeOf<'documentation-conflict'>().not.toExtend<DocumentationStatus>();
    expectTypeOf<'documentation-conflict'>().toExtend<ConditionFactStatus>();
  });

  it('cannot fabricate a stable lifecycle qualifier', () => {
    expectTypeOf<'stable'>().not.toExtend<LifecycleQualifier>();
  });

  it('keeps Source Condition Facts record-by-record with no scalar aggregate', () => {
    expectTypeOf<SourceConditionFactDto>().toHaveProperty('evidenceAssessments');
    expectTypeOf<SourceConditionFactDto>().not.toHaveProperty('documentationStatus');
    expectTypeOf<SourceConditionFactDto>().not.toHaveProperty('lifecycleQualifiers');
    // A fact has no originating file: no file ID, path, or authored source.
    expectTypeOf<SourceConditionFactDto>().not.toHaveProperty('fileId');
    expectTypeOf<SourceConditionFactDto>().not.toHaveProperty('sourceRelativePath');
    expectTypeOf<SourceConditionFactDto>().not.toHaveProperty('sourceText');
  });
});

describe('pathless normalization-collision publication', () => {
  it('serializes with every location field null', () => {
    const serialized = serializeDiagnostic(
      createDiagnostic({ code: 'path-normalization-collision', lifecycleOwnerKey: null }),
    );
    expect(serialized).toEqual({
      diagnosticId: serialized.diagnosticId,
      code: 'path-normalization-collision',
      sourceId: null,
      fileId: null,
      sourceRelativePath: null,
    });
  });
});
