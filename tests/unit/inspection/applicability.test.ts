// T079: the applicability decision table (data-model.md
// § ApplicabilityAssessment, FR-009).
//
// Two properties matter and both are easy to lose. The table is scanned by
// sufficiency, not preference — a proven prohibition settles the question
// whatever a later selection rule says — and there is no aggregate anywhere: a
// summary never replaces the conditions it was projected from, so a reader can
// always see which specific input is missing.
//
// The rows below are exercised with synthetic conditions because no shipped
// rule can prove most of them: every vendor chain this release ships depends on
// runtime inputs the Inspector does not observe, which is exactly why the
// shipped answer is `conditional`. The table still has to be right before a
// later phase can supply a fact that proves anything else.
import { describe, expect, it } from 'vitest';
import {
  sortConditionFacts,
  unobservedRuntimeInput,
  type ConditionProjectionRole,
  type ProjectedCondition,
} from '../../../src/server/inspection/applicability/conditions';
import { projectApplicabilitySummary } from '../../../src/server/inspection/applicability/precedence';
import { assessAdmissionApplicability } from '../../../src/server/inspection/applicability/context';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import type { ConditionFactKey, ConditionFactStatus } from '../../../src/shared/api-types';

/** Builds one proving condition of `role` with the given status. */
function proving(
  role: ConditionProjectionRole,
  status: ConditionFactStatus,
  key: ConditionFactKey = 'selection',
  required = true,
): ProjectedCondition {
  return {
    fact: { key, status, reasonCode: `${key}-${role}-${status}`, basis: 'official-rule' },
    required,
    proves: role,
  };
}

describe('applicability projection', () => {
  it('projects disabled from a proven prohibition, whatever else is unresolved', () => {
    expect(
      projectApplicabilitySummary(
        [
          proving('disablement', 'satisfied', 'managed-policy'),
          unobservedRuntimeInput('selection'),
        ],
        'candidate',
      ),
    ).toBe('disabled');
  });

  it('projects shadowed from a proven precedence loss', () => {
    expect(projectApplicabilitySummary([proving('shadowing', 'satisfied')], 'candidate')).toBe(
      'shadowed',
    );
  });

  it('projects omitted from a proven exclusion', () => {
    expect(projectApplicabilitySummary([proving('omission', 'satisfied')], 'candidate')).toBe(
      'omitted',
    );
  });

  it('projects selected only when nothing can still prevent the selection', () => {
    const selection = proving('selection', 'satisfied');
    expect(projectApplicabilitySummary([selection], 'candidate')).toBe('selected');
    // One unresolved required input is enough to take the claim back: a trust
    // or enablement input could still overturn it.
    expect(
      projectApplicabilitySummary([selection, unobservedRuntimeInput('trust')], 'candidate'),
    ).toBe('conditional');
  });

  it('projects unknown when official assertions disagree about a required rule', () => {
    expect(
      projectApplicabilitySummary([proving('selection', 'documentation-conflict')], 'candidate'),
    ).toBe('unknown');
  });

  it('projects unknown when official assertions are absent for a required rule', () => {
    // The other half of the same row: `documentation-uncertainty` is what a
    // fact proves when the documentation says nothing, and absence is no more
    // resolvable by a runtime than a conflict is.
    expect(
      projectApplicabilitySummary([proving('documentation-uncertainty', 'satisfied')], 'candidate'),
    ).toBe('unknown');
  });

  it('ranks a documentation conflict above an unobserved input', () => {
    // A conflict is not a missing input a runtime could supply, so it must not
    // be reported as "depends on conditions".
    expect(
      projectApplicabilitySummary(
        [proving('selection', 'documentation-conflict'), unobservedRuntimeInput('trust')],
        'candidate',
      ),
    ).toBe('unknown');
  });

  it('projects conditional from any unobserved required input', () => {
    expect(projectApplicabilitySummary([unobservedRuntimeInput('runtime-cwd')], 'candidate')).toBe(
      'conditional',
    );
  });

  it('projects available when availability is proven and no selection is claimed', () => {
    expect(
      projectApplicabilitySummary(
        [proving('availability', 'satisfied', 'scope-availability')],
        'candidate',
      ),
    ).toBe('available');
  });

  it('projects authored for a candidate with nothing else proven', () => {
    expect(projectApplicabilitySummary([], 'candidate')).toBe('authored');
  });

  it('never projects authored for a relationship', () => {
    // A relationship has no accepted declaration of its own to have proven, so
    // its floor is the weaker statement.
    expect(projectApplicabilitySummary([], 'relationship')).toBe('conditional');
  });

  it('lets an unrelated informational fact stand without blocking a result', () => {
    expect(
      projectApplicabilitySummary(
        [
          proving('selection', 'satisfied'),
          { ...unobservedRuntimeInput('event'), required: false },
        ],
        'candidate',
      ),
    ).toBe('selected');
  });
});

describe('condition facts', () => {
  it('records an unobserved runtime input as unknown, never as satisfied', () => {
    expect(unobservedRuntimeInput('trust')).toEqual({
      fact: {
        key: 'trust',
        status: 'unknown',
        reasonCode: 'trust-not-observed',
        basis: 'runtime-input',
      },
      required: true,
      // An input nobody observed proves nothing; naming a role for it would
      // record a conclusion the projection never reads.
      proves: null,
    });
  });

  it('sorts and deduplicates by key, reason code, basis, then status', () => {
    const trust = unobservedRuntimeInput('trust').fact;
    const surface = unobservedRuntimeInput('surface').fact;
    expect(sortConditionFacts([trust, surface, { ...trust }])).toEqual([surface, trust]);
  });
});

describe('the shipped Codex skill admission', () => {
  const [codexSkillRule] = CODEX_REPOSITORY_RULES;

  it('is conditional on every documented runtime input', () => {
    const assessment = assessAdmissionApplicability(codexSkillRule!);
    // Discovery is not loading: the file exists at an allowlisted location, and
    // whether Codex would offer it depends on inputs outside every Source.
    expect(assessment.summary).toBe('conditional');
    expect(assessment.conditions.every((condition) => condition.status === 'unknown')).toBe(true);
  });

  it('takes its inputs from the rule and from every strategy that explains it', () => {
    const assessment = assessAdmissionApplicability(codexSkillRule!);
    const keys = new Set(assessment.conditions.map((condition) => condition.key));
    for (const key of codexSkillRule!.rule.conditionKeys) {
      expect(keys.has(key)).toBe(true);
    }
    // The shipped rule and its one strategy declare the same exported list, so
    // asserting the strategy's keys over that rule would re-assert the loop
    // above. A strategy carrying a key the rule does not is what the union in
    // `assessAdmissionApplicability` exists for, so the case supplies one:
    // without the union, `engine-version` never reaches the conditions.
    const strategy = codexSkillRule!.relations.explainedByStrategies[0]!;
    const explained = assessAdmissionApplicability({
      ...codexSkillRule!,
      rule: { ...codexSkillRule!.rule, conditionKeys: ['surface'] },
      relations: {
        ...codexSkillRule!.relations,
        explainedByStrategies: [{ ...strategy, requiredConditionKeys: ['engine-version'] }],
      },
    });
    expect(explained.conditions.map((condition) => condition.key)).toEqual([
      'engine-version',
      'surface',
    ]);
  });

  it('names no strategy of its own, leaving that to the evidence beside it', () => {
    // The provenance carrying this assessment publishes one evidence record per
    // strategy, with the documentation status a list of IDs could not carry, so
    // a second list here would be the same names a third time on one DTO.
    expect(assessAdmissionApplicability(codexSkillRule!)).not.toHaveProperty('strategyRefs');
  });

  it('keeps every condition visible beside the summary', () => {
    // The summary is a convenience projection, never a replacement: without
    // the conditions a reader cannot tell which input is missing.
    const assessment = assessAdmissionApplicability(codexSkillRule!);
    expect(assessment.conditions.length).toBeGreaterThan(0);
  });
});
