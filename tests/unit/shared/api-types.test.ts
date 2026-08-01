// T017: public API DTO shapes — closed file variants, one-root Sources,
// closed descriptors, Source Condition Facts, evidence vocabulary limits,
// source-scoped diagnostic records, and internal state excluded from
// DTOs by construction (data-model.md, contracts/http-api.md).
import { describe, expect, expectTypeOf, it } from 'vitest';

import { DiagnosticRecord } from '../../../src/shared/diagnostics';
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
    // Binary input has no text and a failed read accepted nothing, so
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

  it('carries no back-reference to the recognitions or relationships of a file', () => {
    // A recognition names the file it belongs to, so a file listing its own
    // recognition IDs would publish the same edge twice and let the two
    // disagree (data-model.md § Inventory unit). Asserted against the keys of
    // every variant at once: a check on the union alone would pass while one
    // member quietly carried the field back.
    // Distributive by construction: a naked type parameter in a conditional is
    // what makes the union split into its members. `keyof CustomizationFileDto`
    // would be the keys they all share, which is where a field carried by one
    // variant hides.
    type KeysOfEach<Variants> = Variants extends unknown ? keyof Variants : never;
    expectTypeOf<'recognitionIds'>().not.toExtend<KeysOfEach<CustomizationFileDto>>();
    expectTypeOf<'relationshipIds'>().not.toExtend<KeysOfEach<CustomizationFileDto>>();
    // The formulation is only worth having if it sees a member's own key, so it
    // is checked against one that exists on the readable variant alone.
    expectTypeOf<'sourceText'>().toExtend<KeysOfEach<CustomizationFileDto>>();
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

describe('source-scoped diagnostic publication', () => {
  it('serializes with the file fields null', () => {
    const serialized = new DiagnosticRecord({
      code: 'root-unreadable',
      lifecycleOwnerKey: 'repository',
      sourceId: 's-1',
    }).serialize();
    expect(serialized).toEqual({
      diagnosticId: serialized.diagnosticId,
      code: 'root-unreadable',
      sourceId: 's-1',
      fileId: null,
      sourceRelativePath: null,
    });
  });
});
