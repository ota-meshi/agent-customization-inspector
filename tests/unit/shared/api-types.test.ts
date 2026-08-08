// T017: public API DTO shapes — closed file variants, one-root Sources,
// candidate provenance, evidence vocabulary limits, source-scoped diagnostic
// records, and internal state excluded from DTOs by construction
// (data-model.md, contracts/http-api.md).
import { describe, expect, expectTypeOf, it } from 'vitest';

import { DiagnosticRecord } from '../../../src/shared/diagnostics';
import type {
  CandidateProvenanceDto,
  CustomizationFileDto,
  SessionSnapshot,
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

describe('candidate provenance', () => {
  it('says which rule admitted the file and where, and nothing further', () => {
    // An admission is a read-authorization record
    // (contracts/inspection-path-allowlist.md § Read authorization): which
    // shipped rule authorized the read, how that rule creates candidates, and
    // the path it matched. Where the customization would apply was the
    // vocabulary of a projection no surface shows, so no DTO carries one.
    expectTypeOf<keyof CandidateProvenanceDto>().toEqualTypeOf<
      'ruleId' | 'discoveryClass' | 'matchedPath'
    >();
  });
});

describe('evidence vocabulary limits', () => {
  it('rejects documentation-conflict as a documentation status', () => {
    // The documentation-status vocabulary grades how completely official
    // sources establish an assertion, and spells its incompatible case
    // `conflict` (QR-005). `documentation-conflict` belongs to no vocabulary
    // this product still declares.
    expectTypeOf<'documentation-conflict'>().not.toExtend<DocumentationStatus>();
    expectTypeOf<'conflict'>().toExtend<DocumentationStatus>();
  });

  it('cannot fabricate a stable lifecycle qualifier', () => {
    expectTypeOf<'stable'>().not.toExtend<LifecycleQualifier>();
  });

  it('publishes no maintenance record on a Source', () => {
    // QR-005: evidence, documentation status, and lifecycle claims are the
    // recorded basis for the read allowlist, and the product reports what it
    // found rather than the documentation behind it. A Source therefore
    // carries no condition facts and no assessments to render.
    expectTypeOf<SourceDto>().not.toHaveProperty('conditionFacts');
    expectTypeOf<SourceDto>().not.toHaveProperty('evidenceAssessments');
    expectTypeOf<SourceDto>().not.toHaveProperty('documentationStatus');
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
