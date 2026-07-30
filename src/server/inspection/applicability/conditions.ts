// The closed condition vocabulary an applicability projection is computed from
// (T091; data-model.md § ApplicabilityAssessment, FR-009, FR-039).
//
// A condition is a fact about one documented input, never a verdict about a
// customization file. `satisfied`/`unsatisfied` record a determination the
// retained documentation establishes, `unknown` records a required input the
// Inspector does not have, and `documentation-conflict` records official
// assertions that disagree. No missing input ever defaults to satisfied: that
// default is exactly how "this file exists" would quietly become "this product
// loads it".
//
// An emitter never chooses a summary. It states facts, and `precedence.ts`
// projects the summary from them through the fixed decision table, so two
// recognitions with the same facts always read the same way.
import type {
  ConditionFact,
  ConditionFactKey,
  ConditionFactStatus,
} from '../../../shared/api-types';

/**
 * What a `satisfied` fact contributes to the projection
 * (data-model.md § ApplicabilityAssessment). The role names the conclusion the
 * fact can prove, so the decision table asks for a role rather than
 * pattern-matching reason codes.
 */
export type ConditionProjectionRole =
  /** A documented availability requirement. */
  | 'availability'
  /** A documented rule that includes the candidate. */
  | 'selection'
  /** A documented rule that excludes the candidate. */
  | 'omission'
  /** A documented precedence chain won by another candidate. */
  | 'shadowing'
  /** A documented control that prohibits use. */
  | 'disablement'
  /** Official assertions that are absent or disagree for a required rule. */
  | 'documentation-uncertainty';

/**
 * One condition as the projection consumes it: the published fact plus the two
 * things the decision table needs that the wire shape does not carry.
 */
export interface ProjectedCondition {
  /** The published closed record; see {@link ConditionFact}. */
  readonly fact: ConditionFact;
  /**
   * Whether a terminal conclusion is permitted while this input is not
   * satisfied. An unrelated informational fact does not block a result; a
   * required one does.
   */
  readonly required: boolean;
  /**
   * What a `satisfied` value of this fact would prove, or null when it proves
   * nothing. Null is the honest value for an input the Inspector never
   * observes: naming a role for it would record a conclusion the projection
   * never reads, and a shape that establishes no outcome yields no statement.
   */
  readonly proves: ConditionProjectionRole | null;
}

/**
 * Records that one documented runtime input was not observed
 * (data-model.md § ApplicabilityAssessment). This is the whole condition
 * catalog the shipped rules emit: every input the Codex skill chain depends on
 * — the surface, the engine version, the runtime working directory, the
 * repository root, scope availability, feature state, enablement, selection,
 * and managed policy — is outside every inspected Source, so the Inspector
 * states that it does not know rather than assuming a value.
 *
 * The reason code is derived from the key rather than tabulated beside it.
 * A hand-written table over the closed key union would restate the key in every
 * row, and a gate that checked the two agreed would be a third copy of the same
 * rule.
 */
export function unobservedRuntimeInput(key: ConditionFactKey): ProjectedCondition {
  return {
    fact: {
      key,
      status: 'unknown',
      reasonCode: `${key}-not-observed`,
      basis: 'runtime-input',
    },
    required: true,
    proves: null,
  };
}

/** The contract's stable condition order: key, reason code, basis, then status. */
const STATUS_ORDER: readonly ConditionFactStatus[] = [
  'satisfied',
  'unsatisfied',
  'unknown',
  'documentation-conflict',
];

/**
 * Sorts and deduplicates conditions into the contracted stable order
 * (data-model.md § ApplicabilityAssessment `conditions`), so two assessments
 * with the same facts serialize identically.
 *
 * Deduplication is by the whole fact: two emitters may legitimately state the
 * same thing about one input, and publishing it twice would show a reader two
 * rows they cannot tell apart.
 */
export function sortConditionFacts(facts: readonly ConditionFact[]): ConditionFact[] {
  const unique = new Map<string, ConditionFact>();
  for (const fact of facts) {
    unique.set(`${fact.key}\0${fact.reasonCode}\0${fact.basis}\0${fact.status}`, fact);
  }
  return [...unique.values()].sort((left, right) => {
    if (left.key !== right.key) {
      return left.key < right.key ? -1 : 1;
    }
    if (left.reasonCode !== right.reasonCode) {
      return left.reasonCode < right.reasonCode ? -1 : 1;
    }
    if (left.basis !== right.basis) {
      return left.basis < right.basis ? -1 : 1;
    }
    return STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status);
  });
}
