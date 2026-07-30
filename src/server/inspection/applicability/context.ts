// Assembling one admission's applicability assessment from the shipped
// registry (T091/T092; data-model.md § ApplicabilityAssessment, FR-009).
//
// The inputs an assessment depends on are stated twice in the registry, on
// purpose and for different reasons: an `InspectionRule.conditionKeys` names
// what that policy's own admission depends on, and a
// `RuntimeCompositionStrategy.requiredConditionKeys` names what the vendor's
// documented composition needs before a terminal result is permitted. Neither
// contains the other in general — a rule may depend on a trust input its
// strategy never mentions — so the assessment takes their union and the two
// registries stay independent descriptions rather than one restating the other.
//
// That union is what makes a strategy drive detail-time projection at all: the
// same record whose `operations` decide the same-name statement an inventory
// row publishes also decides which runtime facts a detail view must call
// unknown. No strategy identifier is added for it (T092): the record already
// carries both, and a per-detail field would be a second copy that can disagree.
import { sortConditionFacts, unobservedRuntimeInput } from './conditions';
import { projectApplicabilitySummary } from './precedence';
import type { ApplicabilityAssessmentDto, ConditionFactKey } from '../../../shared/api-types';
import type { RuleWithRelations } from '../rules/registry';

/**
 * Builds the applicability assessment of one candidate admission.
 *
 * Every input the rule and its explaining strategies require is recorded as
 * not observed, because none of them is readable from an inspected Source. For
 * the shipped Codex skill rule those are the surface, the engine version, the
 * runtime working directory, the repository root, scope availability, feature
 * state, enablement, selection, and managed policy — all outside every boundary
 * the Inspector was authorized to read. Recording them as unknown is
 * the point — it is what keeps the projection at `conditional` instead of
 * letting a discovered file read as a loaded one.
 */
export function assessAdmissionApplicability(
  compiled: RuleWithRelations,
): ApplicabilityAssessmentDto {
  const keys = new Set<ConditionFactKey>(compiled.rule.conditionKeys);
  for (const strategy of compiled.relations.explainedByStrategies) {
    for (const key of strategy.requiredConditionKeys) {
      keys.add(key);
    }
  }
  const conditions = [...keys].map((key) => unobservedRuntimeInput(key));
  return {
    summary: projectApplicabilitySummary(conditions, 'candidate'),
    conditions: sortConditionFacts(conditions.map((condition) => condition.fact)),
  };
}
