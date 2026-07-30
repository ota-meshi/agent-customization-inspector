// The applicability decision table (T091; data-model.md
// § ApplicabilityAssessment).
//
// This is the one place a summary is decided. An emitter states conditions and
// this module projects them, so a recognition cannot claim a conclusion its own
// facts do not support and two recognitions with the same facts never read
// differently.
//
// The table is scanned in priority order and the first proven row wins. That
// order is not preference — it is sufficiency. A documented prohibition settles
// the question whatever a later selection rule says, and an unproven stronger
// row must never be skipped in favour of a weaker one that happens to look
// tidier.
//
// Nothing here interprets natural-language content or judges a customization's
// validity, correctness, effectiveness, or quality. Every row is a mechanical
// question about facts a registry record already stated.
import type { ApplicabilitySummary } from '../../../shared/api-types';
import type { ConditionProjectionRole, ProjectedCondition } from './conditions';

/**
 * What the assessed thing is, which decides the fallback when no row is proven
 * (data-model.md § ApplicabilityAssessment). Only a file-originated candidate
 * declaration may project `authored`; a relationship has no declaration of its
 * own to have proven, so its floor is `conditional`.
 */
export type ApplicabilityOrigin =
  /** An admitted candidate's own rule/path admission. */
  | 'candidate'
  /** A recorded reference edge, which proves nothing about its target. */
  | 'relationship';

/** True when some condition of `role` is satisfied — the proof a row asks for. */
function proven(conditions: readonly ProjectedCondition[], role: ConditionProjectionRole): boolean {
  return conditions.some(
    (condition) => condition.proves === role && condition.fact.status === 'satisfied',
  );
}

/** True when every required input is satisfied, so a terminal result is permitted. */
function allRequiredSatisfied(conditions: readonly ProjectedCondition[]): boolean {
  return conditions.every(
    (condition) => !condition.required || condition.fact.status === 'satisfied',
  );
}

/** True when some required input has the given unresolved status. */
function requiredIs(
  conditions: readonly ProjectedCondition[],
  status: 'unknown' | 'documentation-conflict',
): boolean {
  return conditions.some((condition) => condition.required && condition.fact.status === status);
}

/**
 * Projects the applicability summary from one condition set
 * (data-model.md § ApplicabilityAssessment, priority table).
 *
 * The conditions stay authoritative and visible whatever this returns: a
 * higher-priority sufficient outcome does not remove the facts that lost, and
 * the caller publishes all of them.
 */
export function projectApplicabilitySummary(
  conditions: readonly ProjectedCondition[],
  origin: ApplicabilityOrigin,
): ApplicabilitySummary {
  // 1 — a documented control is known to prohibit use. Sufficient on its own:
  // a later selection rule cannot select something a policy forbids.
  if (proven(conditions, 'disablement')) {
    return 'disabled';
  }
  // 2 — a complete precedence chain proves another candidate wins.
  if (proven(conditions, 'shadowing')) {
    return 'shadowed';
  }
  // 3 — a complete surface, target, selection, or budget rule proves exclusion.
  if (proven(conditions, 'omission')) {
    return 'omitted';
  }
  // 4 — inclusion is proven *and* nothing capable of preventing it is
  // unresolved. Without the second half this would report a selection that a
  // still-unknown trust or enablement input could overturn.
  if (proven(conditions, 'selection') && allRequiredSatisfied(conditions)) {
    return 'selected';
  }
  // 5 — official assertions are absent or disagree about a required rule, so
  // no determination is honest. Both halves: a proven `documentation-uncertainty`
  // is the absence, and a required fact carrying the conflict status is the
  // disagreement. Ranked above `conditional` because neither is a missing input
  // that a runtime could supply.
  if (
    proven(conditions, 'documentation-uncertainty') ||
    requiredIs(conditions, 'documentation-conflict')
  ) {
    return 'unknown';
  }
  // 6 — a documented path exists but a required runtime or excluded input is
  // not observed. This is where every shipped candidate lands today: the
  // vendors' chains depend on inputs outside every inspected Source.
  if (requiredIs(conditions, 'unknown')) {
    return 'conditional';
  }
  // 7 — availability is proven and nothing is unresolved, but no selection
  // result is claimed.
  if (proven(conditions, 'availability') && allRequiredSatisfied(conditions)) {
    return 'available';
  }
  // 8 — nothing above is proven. A candidate has at least its own accepted
  // declaration; a relationship has none, so it states the weaker floor.
  return origin === 'candidate' ? 'authored' : 'conditional';
}
