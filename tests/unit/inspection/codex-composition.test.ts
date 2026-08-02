// T080/T138: what the shipped skill-discovery strategies establish, and what
// they deliberately do not (contracts/runtime-composition.md, FR-007).
//
// The strategy is the product's account of Codex's runtime, and the whole point
// of maintaining it is that the Inspector says what the vendor documents and no
// more. Codex documents that same-name skills are not merged; it documents no
// order among the repository, user, admin, and system scopes. So the row for a
// duplicated name says "keeps all of them, in no documented order" and never
// picks one — and the projections that depend on selection stay unknown.
// Claude instead documents a first definition, and T138 verifies the generic
// resolution helper derives that result without a vendor-specific UI branch.
import { describe, expect, it } from 'vitest';
import { CODEX_SKILLS_DISCOVERY_STRATEGY } from '../../../src/shared/registries/codex/strategies';
import {
  sameNameSkillResolutionFor,
  sameNameSkillResolutionOf,
} from '../../../src/shared/registries/skill-resolution';
import { assessAdmissionApplicability } from '../../../src/server/inspection/applicability/context';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import type { RuntimeCompositionStrategy } from '../../../src/shared/registries/strategy-types';

describe('the Codex skill-discovery strategy', () => {
  it('records retention and an unknown order, and no selection step', () => {
    expect(CODEX_SKILLS_DISCOVERY_STRATEGY.operations).toEqual(['retain-all', 'unknown-order']);
    // Claiming a selection here is what would turn "both remain available"
    // into a winner the vendor has not documented.
    expect(CODEX_SKILLS_DISCOVERY_STRATEGY.operations).not.toContain('select-first');
  });

  it('is only partially documented, and says so', () => {
    expect(CODEX_SKILLS_DISCOVERY_STRATEGY.documentationStatus).toBe('partially-documented');
    // Empty qualifiers make no stability claim; they never mean `stable`.
    expect(CODEX_SKILLS_DISCOVERY_STRATEGY.lifecycleQualifiers).toEqual([]);
  });

  it('requires every runtime input the chain depends on', () => {
    // The chain runs from the runtime working directory up to a repository
    // root the Inspector does not select, through feature, enablement, and
    // policy state it cannot read.
    expect([...CODEX_SKILLS_DISCOVERY_STRATEGY.requiredConditionKeys].toSorted()).toEqual([
      'enablement',
      'engine-version',
      'feature-state',
      'managed-policy',
      'repository-root',
      'runtime-cwd',
      'scope-availability',
      'selection',
      'surface',
    ]);
  });
});

describe('same-name skill resolution', () => {
  it('states that Codex keeps every same-name definition', () => {
    expect(sameNameSkillResolutionFor('codex')).toBe('all-remain');
  });

  it('states that Claude selects the first definition in its documented order', () => {
    // Derived from `claude.skills.selection`'s `select-first` pipeline
    // (contracts/runtime-composition.md § `claude.skills.selection`).
    expect(sameNameSkillResolutionFor('claude')).toBe('select-first');
  });

  it('states nothing for a product with no shipped skill strategy', () => {
    // A product that recognizes no skill can reach no row, so silence is the
    // honest answer rather than a guessed rule.
    expect(sameNameSkillResolutionFor('copilot')).toBeNull();
  });

  it("reports surface-dependent when a product's own strategies disagree", () => {
    const selecting: RuntimeCompositionStrategy = {
      ...CODEX_SKILLS_DISCOVERY_STRATEGY,
      operations: ['select-first'],
    };
    expect(sameNameSkillResolutionOf([CODEX_SKILLS_DISCOVERY_STRATEGY, selecting])).toBe(
      'surface-dependent',
    );
  });

  it('states nothing when one strategy establishes nothing', () => {
    // "The surfaces differ" is itself a claim, and one unestablished surface is
    // not evidence that they do.
    const silent: RuntimeCompositionStrategy = {
      ...CODEX_SKILLS_DISCOVERY_STRATEGY,
      operations: ['merge-map'],
    };
    expect(sameNameSkillResolutionOf([CODEX_SKILLS_DISCOVERY_STRATEGY, silent])).toBeNull();
  });
});

describe('the runtime chain of an admitted Codex skill', () => {
  const [codexSkillRule] = CODEX_REPOSITORY_RULES;

  it('leaves selection unknown rather than inferring it from discovery', () => {
    const assessment = assessAdmissionApplicability(codexSkillRule!);
    const selection = assessment.conditions.find((condition) => condition.key === 'selection');
    expect(selection?.status).toBe('unknown');
    expect(selection?.basis).toBe('runtime-input');
  });

  it('records the working directory the vendor chain starts from as unobserved', () => {
    // Codex scans upward from its runtime working directory. The Inspector
    // selects a repository root instead, so which directory Codex would start
    // from is a fact about a runtime nobody here observed.
    const assessment = assessAdmissionApplicability(codexSkillRule!);
    expect(assessment.conditions.find((condition) => condition.key === 'runtime-cwd')?.status).toBe(
      'unknown',
    );
  });
});
