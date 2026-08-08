// T1076: deriving what a product documents for a same-name skill from its own
// composition strategies, rather than restating it beside them.
//
// The contract suite checks the shipped registry, where one product ships one
// strategy. These cases drive the derivation over the shapes that registry
// cannot produce yet — a multi-step pipeline, surfaces that disagree, a
// surface that establishes nothing — because those are the branches that
// decide whether the Inspector stays silent or states a winner it has not
// recorded.
import { describe, expect, it } from 'vitest';

import { sameNameSkillResolutionOf } from '../../../src/shared/registries/skill-resolution';
import type {
  CompositionOperation,
  RuntimeCompositionStrategy,
} from '../../../src/shared/registries/strategy-types';

/**
 * A strategy carrying only the field the derivation reads. The rest of the
 * record is irrelevant here and inventing plausible values for it would
 * suggest the derivation consults them.
 */
function withOperations(...operations: CompositionOperation[]): RuntimeCompositionStrategy {
  return { operations } as unknown as RuntimeCompositionStrategy;
}

describe('sameNameSkillResolutionOf', () => {
  it('reads each statement from the operation that states it', () => {
    expect(sameNameSkillResolutionOf([withOperations('retain-all', 'unknown-order')])).toBe(
      'all-remain',
    );
    expect(sameNameSkillResolutionOf([withOperations('select-first')])).toBe('select-first');
  });

  it('never reads a statement out of the absence of other operations', () => {
    // `unknown-order` alone is the case that must state nothing: it says an
    // order is not documented, which is not the same as saying every
    // definition survives. `merge-map` beside it is the same absence with a
    // step that actively collapses entries.
    expect(sameNameSkillResolutionOf([withOperations('unknown-order')])).toBeNull();
    expect(sameNameSkillResolutionOf([withOperations('merge-map', 'unknown-order')])).toBeNull();
    for (const operation of [
      'append',
      'concatenate',
      'select-closest',
      'replace',
      'merge-map',
      'deduplicate',
      'filter',
    ] as const) {
      expect(sameNameSkillResolutionOf([withOperations(operation)]), operation).toBeNull();
    }
  });

  it('states nothing when one pipeline both retains and selects first', () => {
    // What a vendor documents that way is a question for evidence review.
    expect(sameNameSkillResolutionOf([withOperations('retain-all', 'select-first')])).toBeNull();
  });

  it('recognizes retain-all with select-closest as the context-selected statement', () => {
    // The exact pipeline Claude Code documents for a clash within one root:
    // every definition stays available and the product picks the variant
    // matching the files it is working on. `select-first` beside them returns
    // the pipeline to evidence review.
    expect(sameNameSkillResolutionOf([withOperations('retain-all', 'select-closest')])).toBe(
      'all-remain-context-selected',
    );
    expect(
      sameNameSkillResolutionOf([withOperations('retain-all', 'select-closest', 'select-first')]),
    ).toBeNull();
  });

  it('reports surfaces that disagree rather than picking one of them', () => {
    expect(
      sameNameSkillResolutionOf([withOperations('select-first'), withOperations('retain-all')]),
    ).toBe('surface-dependent');
  });

  it('agrees with itself when two surfaces establish the same statement', () => {
    expect(
      sameNameSkillResolutionOf([withOperations('retain-all'), withOperations('retain-all')]),
    ).toBe('all-remain');
  });

  it('stays silent when any one surface establishes nothing', () => {
    // "The surfaces differ" is itself a claim. One surface whose pipeline says
    // nothing is not evidence that they differ, so the product gets no
    // statement rather than the statement of the surface that happened to
    // establish one.
    expect(
      sameNameSkillResolutionOf([withOperations('select-first'), withOperations('filter')]),
    ).toBeNull();
  });

  it('states nothing for a product with no skill strategy at all', () => {
    expect(sameNameSkillResolutionOf([])).toBeNull();
  });
});
